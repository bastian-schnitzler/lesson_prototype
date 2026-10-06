import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateRawSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { issueBody, parseAssets, parseIssues, parseMapping, parseMermaid, plantumlUrl } from '../../scripts/issues-sync.ts';
import { analyze, load } from '../../scripts/mockups.ts';

const docs = resolve(import.meta.dirname, '..', '..', 'docs');

describe('mockups check', () => {
  const block = (path: string, body: string) => `<!-- mockup:begin ${path} -->\n\`\`\`plantuml\n${body}\`\`\`\n<!-- mockup:end ${path} -->`;
  const readme = '(a.puml) (b.puml)';

  it('passes the repository mockups', () => {
    const { spec, sources, otherFiles, readme: realReadme } = load();
    expect(analyze(spec, sources, otherFiles, realReadme).problems).toEqual([]);
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
      'non-source file in docs/mockups/: mockups/a.png (only .puml sources and README.md are allowed)',
    ]);
    expect(report.synced).not.toContain('A1');
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
    expect(withAssets).toContain('```plantuml');
    expect(withAssets).toContain('https://www.plantuml.com/plantuml/svg/');
  });
});
