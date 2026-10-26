/**
 * Keeps the rendered screens (PNG + HTML snapshot pairs from scripts/screens.ts) and their SPEC image
 * blocks in step. docs/mockups/ holds only those screens and README.md.
 *
 *   node scripts/mockups.ts sync    rewrite each SPEC screen block from the screen list
 *   node scripts/mockups.ts check   fail on missing, stale, orphaned or duplicate screen blocks,
 *                                   missing screen files and other files in docs/mockups/
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { SCREENS, screenBlock } from './screens.ts';

export const DOCS_DIR = resolve(import.meta.dirname, '..', 'docs');

const SCREEN_BLOCK = /<!-- screen:begin (\S+) -->\n([\s\S]*?)<!-- screen:end (\S+) -->/g;

/** A rendered screen: `path` under docs/mockups/ without extension. */
export interface ScreenSource { path: string; title: string; lessonId: string }

export interface MockupReport {
  problems: string[];
  /** SPEC text with every screen block refreshed from the screen list. */
  synced: string;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Pure core: `files` are the paths under docs/ of every file in docs/mockups/ except README.md. */
export function analyze(spec: string, files: string[], readme: string, screens: ScreenSource[] = []): MockupReport {
  const problems: string[] = [];
  // Rendered screens: one PNG and one HTML snapshot each, shown in SPEC as a linked image.
  const byPath = new Map(screens.map((sc) => [`mockups/${sc.path}`, sc]));
  const screenFiles = new Set([...byPath.keys()].flatMap((p) => [`${p}.png`, `${p}.html`]));
  for (const f of screenFiles) if (!files.includes(f)) problems.push(`missing screen file: ${f} (run \`make screens\`)`);
  const seenScreens = new Map<string, number>();
  const synced = spec.replace(SCREEN_BLOCK, (whole, begin: string, body: string, end: string) => {
    if (begin !== end) {
      problems.push(`SPEC screen block for ${begin} ends with marker for ${end}`);
      return whole;
    }
    seenScreens.set(begin, (seenScreens.get(begin) ?? 0) + 1);
    const screen = byPath.get(begin);
    if (!screen) {
      problems.push(`orphaned SPEC screen block: ${begin} is not in scripts/screens.ts`);
      return whole;
    }
    const want = screenBlock(screen);
    if (body !== want) problems.push(`stale SPEC screen block: ${begin}`);
    return `<!-- screen:begin ${begin} -->\n${want}<!-- screen:end ${begin} -->`;
  });
  for (const [path, count] of seenScreens) if (count > 1) problems.push(`duplicate SPEC screen block: ${path} appears ${count} times`);
  for (const path of byPath.keys()) {
    if (!seenScreens.has(path)) problems.push(`missing SPEC screen block: ${path}`);
    if (!readme.includes(`(${path.replace(/^mockups\//, '')}.png)`)) problems.push(`mockups/README.md does not link ${path.replace(/^mockups\//, '')}.png`);
  }
  for (const f of files) if (!screenFiles.has(f)) problems.push(`stray file in docs/mockups/: ${f} (only rendered screens of scripts/screens.ts and README.md are allowed)`);
  return { problems, synced };
}

export function load(docsDir = DOCS_DIR) {
  const mockupsDir = join(docsDir, 'mockups');
  const files = walk(mockupsDir).sort().map((file) => relative(docsDir, file).split('\\').join('/')).filter((rel) => rel !== 'mockups/README.md');
  const specPath = join(docsDir, 'SPEC.md');
  return {
    specPath,
    spec: readFileSync(specPath, 'utf8'),
    files,
    readme: readFileSync(join(mockupsDir, 'README.md'), 'utf8'),
  };
}

if (import.meta.main) {
  const mode = process.argv[2];
  if (mode !== 'sync' && mode !== 'check') {
    console.error('usage: node scripts/mockups.ts sync|check');
    process.exit(2);
  }
  const { specPath, spec, files, readme } = load();
  const report = analyze(spec, files, readme, SCREENS);
  if (mode === 'sync') {
    if (report.synced !== spec) {
      writeFileSync(specPath, report.synced);
      console.log('updated SPEC.md screen blocks from the screen list');
    }
    const remaining = analyze(report.synced, files, readme, SCREENS).problems;
    for (const p of remaining) console.error(`error: ${p}`);
    if (remaining.length) process.exit(1);
    console.log(`${SCREENS.length} rendered screens in sync`);
  } else {
    for (const p of report.problems) console.error(`error: ${p}`);
    if (report.problems.length) {
      console.error('run `make mockups-sync` or `make screens`, add missing SPEC blocks, or remove stray files');
      process.exit(1);
    }
    console.log(`${SCREENS.length} rendered screens match their SPEC blocks`);
  }
}
