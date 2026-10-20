/** Validate the directly authored P1-08 review batch, the P4-03 function and the P5-03 reading test lessons without model calls or writes. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CONTENT_DIR, scanContentDir } from './catalog.ts';
import type { CatalogResult } from '../src/catalog/scan.ts';
import { briefSchema, contentSchema, hasContentFile } from '../src/schemas/artifacts.ts';
import { grammarBriefLengthIssues, grammarContentLengthIssues } from '../src/validation/artifacts.ts';

/** Function test lessons written by hand before the generation decision (P4-03, D51). */
export const FUNCTION_TEST_LESSONS = ['fr-greetings-and-goodbyes', 'fr-ordering-at-a-cafe', 'fr-asking-the-way'] as const;

/** Reading test lessons: the ten fr/A1 reading entries, written by hand (P5-03, SPEC section 9). */
const READING_TEST_COUNT = 10;

export function checkSampleLessons(result: CatalogResult, contentDir = DEFAULT_CONTENT_DIR): string[] {
  const outline = result.outlines.get('fr-a1');
  if (!outline) return ['Missing fr/A1 outline.'];
  const samples = ['grammar', 'vocabulary'].flatMap((kind) => outline.entries.filter((e) => e.kind === kind).slice(0, 10));
  const problems = [...result.errors];
  if (samples.length !== 20) problems.push('Expected ten grammar and ten vocabulary sample entries.');
  const functions = outline.entries.filter((e) => (FUNCTION_TEST_LESSONS as readonly string[]).includes(e.id));
  if (functions.length !== FUNCTION_TEST_LESSONS.length) problems.push(`Expected the function test lessons ${FUNCTION_TEST_LESSONS.join(', ')}.`);
  const reading = outline.entries.filter((e) => e.kind === 'reading');
  if (reading.length !== READING_TEST_COUNT) problems.push(`Expected ${READING_TEST_COUNT} fr/A1 reading entries.`);
  for (const { id, kind } of [...samples, ...functions, ...reading]) {
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
  } else console.log('All twenty sample lessons (ten vocabulary briefs, ten grammar briefs with content), the three function test lessons and the ten reading test lessons are valid with current input hashes; grammar lessons follow the length rules. No generator calls.');
}
