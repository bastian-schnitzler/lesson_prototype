/** Validate the directly authored P1-08 review batch without model calls or writes. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CONTENT_DIR, scanContentDir } from './catalog.ts';
import type { CatalogResult } from '../src/catalog/scan.ts';
import { briefSchema, contentSchema, hasContentFile } from '../src/schemas/artifacts.ts';
import { grammarBriefLengthIssues, grammarContentLengthIssues } from '../src/validation/artifacts.ts';

export function checkSampleLessons(result: CatalogResult, contentDir = DEFAULT_CONTENT_DIR): string[] {
  const outline = result.outlines.get('fr-a1');
  if (!outline) return ['Missing fr/A1 outline.'];
  const samples = ['grammar', 'vocabulary'].flatMap((kind) => outline.entries.filter((e) => e.kind === kind).slice(0, 10));
  const problems = [...result.errors];
  if (samples.length !== 20) problems.push('Expected ten grammar and ten vocabulary sample entries.');
  for (const { id, kind } of samples) {
    const artifacts = result.manifest.artifacts[id];
    // Vocabulary lessons consist of the brief only (P2-04).
    for (const slot of hasContentFile(kind) ? (['draft', 'content'] as const) : (['draft'] as const)) {
      if (artifacts?.[slot]?.status !== 'valid') problems.push(`${id}: ${slot} is ${artifacts?.[slot]?.status ?? 'missing'}.`);
    }
  }
  problems.push(...lengthProblems(result, contentDir));
  return problems;
}

/** Every valid grammar lesson in the content directory follows the lesson length rules (P3-07, SPEC section 7). */
function lengthProblems(result: CatalogResult, contentDir: string): string[] {
  const outline = result.outlines.get('fr-a1')!;
  return outline.entries.filter((e) => e.kind === 'grammar' && result.manifest.artifacts[e.id]?.content?.status === 'valid').flatMap(({ id }) => {
    const read = (folder: string) => JSON.parse(readFileSync(join(contentDir, folder, `${id}.json`), 'utf8'));
    const brief = briefSchema('grammar', outline.lang).parse(read('briefs'));
    const content = contentSchema('grammar', outline.lang).parse(read('lessons'));
    if (brief.kind !== 'grammar' || content.kind !== 'grammar') return [];
    return [...grammarBriefLengthIssues(brief), ...grammarContentLengthIssues(content)].map((i) => `${id}: ${i.path}: ${i.message}`);
  });
}

if (import.meta.main) {
  const problems = checkSampleLessons(scanContentDir());
  if (problems.length) {
    problems.forEach((problem) => console.error(problem));
    process.exitCode = 1;
  } else console.log('All twenty sample lessons (ten vocabulary briefs, ten grammar briefs with content) are valid with current input hashes; grammar lessons follow the length rules. No generator calls.');
}
