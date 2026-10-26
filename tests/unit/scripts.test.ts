import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BODY_LIMIT, issueBody, parseAssets, parseIssues, parseMapping, parseMermaid, selectIssues } from '../../scripts/issues-sync.ts';
import { analyze, load } from '../../scripts/mockups.ts';
import { SCREENS, screenBlock } from '../../scripts/screens.ts';

const docs = resolve(import.meta.dirname, '..', '..', 'docs');

describe('mockups check', () => {
  it('passes the repository mockups', () => {
    const { spec, files, readme } = load();
    expect(analyze(spec, files, readme, SCREENS).problems).toEqual([]);
  });

  it('checks rendered screens: both files, the SPEC block and the README link, and syncs a stale block', () => {
    const one = { path: 'x/one', title: 'One', lessonId: 'l1' };
    const two = { path: 'x/two', title: 'Two', lessonId: 'l2' };
    const screenSpec = `<!-- screen:begin mockups/x/one -->\nold\n<!-- screen:end mockups/x/one -->`;
    const report = analyze(screenSpec, ['mockups/x/one.png', 'mockups/x/one.html', 'mockups/x/two.png', 'mockups/x/old.puml'], '(x/one.png)', [one, two]);
    expect(report.problems).toEqual([
      'missing screen file: mockups/x/two.html (run `make screens`)',
      'stale SPEC screen block: mockups/x/one',
      'missing SPEC screen block: mockups/x/two',
      'mockups/README.md does not link x/two.png',
      'stray file in docs/mockups/: mockups/x/old.puml (only rendered screens of scripts/screens.ts and README.md are allowed)',
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

  it('builds bodies with pinned links, dependency issue numbers and assets', () => {
    const issues = parseIssues(issuesMd);
    const mapping = parseMapping(issuesMd);
    const body = issueBody(issues.find((i) => i.id === 'P1-02')!, {
      sha: 'abcdef1234567890',
      specVersion: 'Draft 9.9',
      mapping,
      assets: parseAssets(issuesMd),
      mermaid: parseMermaid(spec),
    });
    expect(body).toContain('blob/abcdef1234567890/docs/SPEC.md');
    expect(body).toContain(`P1-01 (#${mapping.get('P1-01')})`);
    const withAssets = issueBody(issues.find((i) => i.id === 'P2-02')!, {
      sha: 'abc',
      specVersion: 'Draft 9.9',
      mapping,
      assets: parseAssets(issuesMd),
      mermaid: parseMermaid(spec),
    });
    expect(withAssets).toContain('```mermaid');
    // Vocabulary screens are rendered from the prototype: the committed PNG and its HTML snapshot.
    expect(withAssets).toContain('/docs/mockups/03-vocabulary-lesson/02-introduction/introduction.png?raw=true');
    expect(withAssets).toContain('introduction.html');
    expect(withAssets).not.toContain('```plantuml');
    // Index and artifact views are rendered screens too.
    const index = issueBody(issues.find((i) => i.id === 'P1-01')!, { sha: 'abc', specVersion: 'Draft 9.9', mapping, assets: parseAssets(issuesMd), mermaid: parseMermaid(spec) });
    expect(index).toContain('/docs/mockups/01-lesson-overview/index/lesson-index.png?raw=true');
    expect(index).not.toContain('plantuml');
  });
});

it('limits an issue sync to one phase or one issue by logical ID prefix', () => {
  const issues = parseIssues(readFileSync(resolve(import.meta.dirname, '../../docs/ISSUES.md'), 'utf8'));
  expect(selectIssues(issues)).toHaveLength(issues.length);
  expect(selectIssues(issues, 'P5').map((i) => i.id)).toEqual(['P5-01', 'P5-02', 'P5-03', 'P5-04', 'P5-05', 'P5-06', 'P5-07', 'P5-08']);
  expect(selectIssues(issues, 'P5-08').map((i) => i.id)).toEqual(['P5-08']);
});

it('keeps every issue body under the GitHub limit', () => {
  const md = readFileSync(resolve(docs, 'ISSUES.md'), 'utf8');
  const ctx = { sha: 'a'.repeat(40), specVersion: 'Draft 0', mapping: parseMapping(md), assets: parseAssets(md), mermaid: parseMermaid(readFileSync(resolve(docs, 'SPEC.md'), 'utf8')) };
  for (const issue of parseIssues(md)) expect(issueBody(issue, ctx).length).toBeLessThan(BODY_LIMIT);
});
