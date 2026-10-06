/**
 * File-system wrapper around the shared catalog scanner.
 *
 *   node scripts/catalog.ts [--content-dir DIR] [--out FILE]
 *
 * Validates all outlines and prints a summary; exits nonzero on catalog
 * errors. With --out it also writes the derived manifest.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { scanCatalog, type CatalogResult, type SourceFile } from '../src/catalog/scan.ts';

export const DEFAULT_CONTENT_DIR = resolve(import.meta.dirname, '..', 'content');

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function readJsonFiles(dir: string): SourceFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(dir, name), 'utf8') }));
}

export function scanContentDir(contentDir: string = DEFAULT_CONTENT_DIR): CatalogResult {
  return scanCatalog({
    outlines: readJsonFiles(join(contentDir, 'outlines')),
    briefs: readJsonFiles(join(contentDir, 'briefs')),
    lessons: readJsonFiles(join(contentDir, 'lessons')),
    hash: sha256,
  });
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { 'content-dir': { type: 'string' }, out: { type: 'string' } } });
  const dir = resolve(values['content-dir'] ?? DEFAULT_CONTENT_DIR);
  const result = scanContentDir(dir);
  for (const w of result.warnings) console.warn(`warning: ${w}`);
  for (const e of result.errors) console.error(`error: ${e}`);
  for (const c of result.manifest.courses) console.log(`course ${c.lang}/${c.level}: ${c.lessonIds.length} lessons`);
  if (result.manifest.courses.length === 0) console.error('error: no valid outline in content/outlines/');
  if (result.errors.length || result.manifest.courses.length === 0) process.exit(1);
  if (values.out) {
    mkdirSync(dirname(values.out), { recursive: true });
    writeFileSync(values.out, `${JSON.stringify(result.manifest, null, 2)}\n`);
    console.log(`wrote ${values.out}`);
  }
}
