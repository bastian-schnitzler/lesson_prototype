/** Validate the directly authored P1-08 review batch without model calls or writes. */
import { scanContentDir } from './catalog.ts';
import type { CatalogResult } from '../src/catalog/scan.ts';
import { hasContentFile } from '../src/schemas/artifacts.ts';

export function checkSampleLessons(result: CatalogResult): string[] {
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
  return problems;
}

if (import.meta.main) {
  const problems = checkSampleLessons(scanContentDir());
  if (problems.length) {
    problems.forEach((problem) => console.error(problem));
    process.exitCode = 1;
  } else console.log('All twenty sample lessons (ten vocabulary briefs, ten grammar briefs with content) are valid with current input hashes. No generator calls.');
}
