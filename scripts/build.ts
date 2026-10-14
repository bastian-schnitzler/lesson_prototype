/**
 * `make build`: validate the course catalog, build the app into dist/ and copy
 * the content files the deployed app reads.
 *
 *   node scripts/build.ts [--out dist] [--content-dir content]
 *
 * dist/index.html is the GitHub Pages entry point. All URLs are relative, so
 * the site works under the repository path (/lesson_prototype/). The manifest
 * is derived from the files, never hand-maintained; adding an outline needs a
 * rebuild, not a source change.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { build } from 'vite';

import { DEFAULT_CONTENT_DIR, scanContentDir } from './catalog.ts';

const ROOT = resolve(import.meta.dirname, '..');

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

/** Non-public .env values; GEMINI_MODEL is intentionally recorded in artifact provenance. */
export function secretValues(envText: string): string[] {
  return envText
    .split('\n')
    .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null && m[1] !== 'GEMINI_MODEL')
    // GEMINI_API_KEY may be a comma-separated list: check each key on its own.
    .flatMap((m) => m[2].replace(/^(['"])(.*)\1$/, '$2').split(',').map((v) => v.trim()))
    .filter((v) => v.length >= 8);
}

/** Problems that make a dist/ directory unsafe to publish. */
export function findLeaks(outDir: string, secrets: string[]): string[] {
  const problems: string[] = [];
  for (const file of files(outDir)) {
    const rel = relative(outDir, file);
    if (/(^|\/)\.env(\.|$)/.test(rel)) problems.push(`${rel}: environment file in build output`);
    const text = readFileSync(file, 'latin1');
    for (const s of secrets) if (text.includes(s)) problems.push(`${rel}: contains a value from .env`);
  }
  return problems;
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { out: { type: 'string', default: 'dist' }, 'content-dir': { type: 'string' } } });
  const outDir = resolve(ROOT, values.out!);
  const contentDir = resolve(values['content-dir'] ?? DEFAULT_CONTENT_DIR);

  const catalog = scanContentDir(contentDir);
  for (const w of catalog.warnings) console.warn(`warning: ${w}`);
  for (const e of catalog.errors) console.error(`error: ${e}`);
  if (catalog.errors.length || catalog.manifest.courses.length === 0) {
    console.error('error: the course catalog is invalid; nothing was built');
    process.exit(1);
  }

  await build({ root: ROOT, logLevel: 'warn', build: { outDir, emptyOutDir: true } });

  // Copy exactly what the manifest references: outlines, then drafts and content.
  const urls = [
    ...catalog.manifest.courses.map((c) => c.outlineUrl),
    ...Object.values(catalog.manifest.artifacts).flatMap((a) => [a.draft?.url, a.content?.url].filter((u): u is string => Boolean(u))),
  ];
  for (const url of urls) {
    const target = join(outDir, url);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(contentDir, url.slice('content/'.length)), target);
  }
  writeFileSync(join(outDir, 'content', 'manifest.json'), `${JSON.stringify(catalog.manifest, null, 2)}\n`);
  // The UX feedback page is published next to the app at the same relative path as in the repository (P06-00).
  mkdirSync(join(outDir, 'docs'), { recursive: true });
  copyFileSync(join(ROOT, 'docs', 'feedback.html'), join(outDir, 'docs', 'feedback.html'));
  // Pages serves dist/ as-is; skip Jekyll processing.
  writeFileSync(join(outDir, '.nojekyll'), '');

  const envFile = join(ROOT, '.env');
  const leaks = findLeaks(outDir, existsSync(envFile) ? secretValues(readFileSync(envFile, 'utf8')) : []);
  for (const l of leaks) console.error(`error: ${l}`);
  if (leaks.length) process.exit(1);

  for (const c of catalog.manifest.courses) console.log(`course ${c.lang}/${c.level}: ${c.lessonIds.length} lessons`);
  console.log(`copied ${urls.length} content files; built ${relative(ROOT, outDir)}/index.html`);
}
