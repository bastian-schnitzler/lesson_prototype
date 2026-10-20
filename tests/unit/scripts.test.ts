import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { BODY_LIMIT, issueBody, parseAssets, parseIssues, parseMapping, parseMermaid, plantumlUrl, selectIssues } from '../../scripts/issues-sync.ts';
import { analyze, load } from '../../scripts/mockups.ts';
import { SCREENS, screenBlock } from '../../scripts/screens.ts';

const docs = resolve(import.meta.dirname, '..', '..', 'docs');

describe('mockups check', () => {
  const block = (path: string, body: string) => `<!-- mockup:begin ${path} -->\n\`\`\`plantuml\n${body}\`\`\`\n<!-- mockup:end ${path} -->`;
  const readme = '(a.puml) (b.puml)';

  it('passes the repository mockups', () => {
    const { spec, sources, otherFiles, readme: realReadme } = load();
    expect(analyze(spec, sources, otherFiles, realReadme, SCREENS).problems).toEqual([]);
  });

  it('reports stale, missing, orphaned and duplicate blocks and stray files, and syncs stale ones', () => {
    const sources = new Map([
      ['mockups/a.puml', 'A2\n'],
      ['mockups/b.puml', 'B\n'],
    ]);
    const spec = `${block('mockups/a.puml', 'A1\n')}\n${block('mockups/c.puml', 'C\n')}\n${block('mockups/a.puml', 'A2\n')}`;
    const report = analyze(spec, sources, ['mockups/a.png'], readme);
    expect(report.problems).toEqual([
      'stale SPEC block: mockups/a.puml differs from its source',
      'orphaned SPEC block: mockups/c.puml has no source file',
      'duplicate SPEC block: mockups/a.puml appears 2 times',
      'missing SPEC block: mockups/b.puml',
      'non-source file in docs/mockups/: mockups/a.png (only .puml sources, rendered screens of scripts/screens.ts and README.md are allowed)',
    ]);
    expect(report.synced).not.toContain('A1');
  });

  it('checks rendered screens: both files, the SPEC block and the README link, and syncs a stale block', () => {
    const one = { path: 'x/one', title: 'One', lessonId: 'l1' };
    const two = { path: 'x/two', title: 'Two', lessonId: 'l2' };
    const screenSpec = `<!-- screen:begin mockups/x/one -->\nold\n<!-- screen:end mockups/x/one -->`;
    const report = analyze(screenSpec, new Map(), ['mockups/x/one.png', 'mockups/x/one.html', 'mockups/x/two.png'], '(x/one.png)', [one, two]);
    expect(report.problems).toEqual([
      'missing screen file: mockups/x/two.html (run `make screens`)',
      'stale SPEC screen block: mockups/x/one',
      'missing SPEC screen block: mockups/x/two',
      'mockups/README.md does not link x/two.png',
    ]);
    expect(report.synced).toContain(screenBlock(one));
    expect(screenBlock(one)).toContain('[![One](mockups/x/one.png)](mockups/x/one.html)');
  });
});

describe('issues sync', () => {
  const issuesMd = readFileSync(resolve(docs, 'ISSUES.md'), 'utf8');
  const spec = readFileSync(resolve(docs, 'SPEC.md'), 'utf8');

  it('parses every backlog issue and its published mapping', () => {
    const issues = parseIssues(issuesMd);
    const mapping = parseMapping(issuesMd);
    expect(issues.length).toBeGreaterThanOrEqual(32);
    expect(issues.every((i) => mapping.has(i.id))).toBe(true);
    expect(issues.find((i) => i.id === 'P1-01')?.milestone).toBe('Phase 1');
    expect(issues.some((i) => i.text.startsWith('GitHub: [#'))).toBe(false);
  });

  it('encodes PlantUML sources the server can decode', () => {
    const source = '@startsalt\n{ Hello | Wörld }\n@endsalt\n';
    const encoded = plantumlUrl(source).split('/').pop()!;
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
    const bytes: number[] = [];
    for (let i = 0; i < encoded.length; i += 4) {
      const [c1, c2, c3, c4] = [...encoded.slice(i, i + 4)].map((c) => alphabet.indexOf(c));
      bytes.push((c1 << 2) | (c2 >> 4), ((c2 & 15) << 4) | (c3 >> 2), ((c3 & 3) << 6) | c4);
    }
    expect(inflateRawSync(Buffer.from(bytes)).toString('utf8')).toBe(source);
  });

  it('builds bodies with pinned links, dependency issue numbers and assets', () => {
    const issues = parseIssues(issuesMd);
    const mapping = parseMapping(issuesMd);
    const body = issueBody(issues.find((i) => i.id === 'P1-02')!, {
      sha: 'abcdef1234567890',
      specVersion: 'Draft 9.9',
      mapping,
      assets: parseAssets(issuesMd),
      mermaid: parseMermaid(spec),
      readSource: (p) => readFileSync(resolve(docs, p), 'utf8'),
    });
    expect(body).toContain('blob/abcdef1234567890/docs/SPEC.md');
    expect(body).toContain(`P1-01 (#${mapping.get('P1-01')})`);
    const withAssets = issueBody(issues.find((i) => i.id === 'P2-02')!, {
      sha: 'abc',
      specVersion: 'Draft 9.9',
      mapping,
      assets: parseAssets(issuesMd),
      mermaid: parseMermaid(spec),
      readSource: (p) => readFileSync(resolve(docs, p), 'utf8'),
    });
    expect(withAssets).toContain('```mermaid');
    // Vocabulary screens are rendered from the prototype: the committed PNG and its HTML snapshot.
    expect(withAssets).toContain('/docs/mockups/03-vocabulary-lesson/02-introduction/introduction.png?raw=true');
    expect(withAssets).toContain('introduction.html');
    expect(withAssets).not.toContain('```plantuml');
    const salt = issueBody(issues.find((i) => i.id === 'P5-05')!, {
      sha: 'abc', specVersion: 'Draft 9.9', mapping, assets: parseAssets(issuesMd), mermaid: parseMermaid(spec),
      readSource: (p) => readFileSync(resolve(docs, p), 'utf8'),
    });
    expect(salt).toContain('```plantuml');
    expect(salt).toContain('https://www.plantuml.com/plantuml/svg/');
  });
});

it('limits an issue sync to one phase or one issue by logical ID prefix', () => {
  const issues = parseIssues(readFileSync(resolve(import.meta.dirname, '../../docs/ISSUES.md'), 'utf8'));
  expect(selectIssues(issues)).toHaveLength(issues.length);
  expect(selectIssues(issues, 'P5').map((i) => i.id)).toEqual(['P5-01', 'P5-02', 'P5-03', 'P5-04', 'P5-05', 'P5-06', 'P5-07', 'P5-08']);
  expect(selectIssues(issues, 'P5-08').map((i) => i.id)).toEqual(['P5-08']);
});

it('links the Salt sources instead of copying them when an issue body would be too long', () => {
  const md = readFileSync(resolve(docs, 'ISSUES.md'), 'utf8');
  const issue = parseIssues(md).find((i) => i.id === 'P5-04')!;
  const ctx = { sha: 'a'.repeat(40), specVersion: 'Draft 0', mapping: parseMapping(md), assets: parseAssets(md), mermaid: parseMermaid(readFileSync(resolve(docs, 'SPEC.md'), 'utf8')), readSource: (p: string) => readFileSync(resolve(docs, p), 'utf8') };
  const full = issueBody(issue, ctx);
  const linked = issueBody(issue, ctx, false);
  expect(full).toContain('<summary>PlantUML source</summary>');
  expect(linked).not.toContain('<summary>PlantUML source</summary>');
  expect(linked.match(/Editable source: /g)?.length).toBe(full.match(/Editable source: /g)?.length);
  expect(linked.match(/plantuml\.com\/plantuml\/svg\//g)?.length).toBe(full.match(/plantuml\.com\/plantuml\/svg\//g)?.length);
  expect(linked.length).toBeLessThan(BODY_LIMIT);
});
