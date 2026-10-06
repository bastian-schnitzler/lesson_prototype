/**
 * Keeps docs/mockups/**\/*.puml and their embedded SPEC code fences identical.
 *
 *   node scripts/mockups.ts sync    rewrite each SPEC fence from its source
 *   node scripts/mockups.ts check   fail on missing, stale, orphaned or duplicate
 *                                   fences and on non-source files in docs/mockups/
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const DOCS_DIR = resolve(import.meta.dirname, '..', 'docs');

const BLOCK = /<!-- mockup:begin (\S+) -->\n```plantuml\n([\s\S]*?)```\n<!-- mockup:end (\S+) -->/g;

export interface MockupReport {
  problems: string[];
  /** SPEC text with every fence refreshed from its source. */
  synced: string;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Pure core: `sources` maps `mockups/...puml` paths to file contents. */
export function analyze(spec: string, sources: Map<string, string>, otherFiles: string[], readme: string): MockupReport {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  const synced = spec.replace(BLOCK, (whole, begin: string, body: string, end: string) => {
    if (begin !== end) {
      problems.push(`SPEC block for ${begin} ends with marker for ${end}`);
      return whole;
    }
    seen.set(begin, (seen.get(begin) ?? 0) + 1);
    const source = sources.get(begin);
    if (source === undefined) {
      problems.push(`orphaned SPEC block: ${begin} has no source file`);
      return whole;
    }
    if (body !== source) problems.push(`stale SPEC block: ${begin} differs from its source`);
    return `<!-- mockup:begin ${begin} -->\n\`\`\`plantuml\n${source}\`\`\`\n<!-- mockup:end ${begin} -->`;
  });
  for (const [path, count] of seen) if (count > 1) problems.push(`duplicate SPEC block: ${path} appears ${count} times`);
  for (const path of sources.keys()) {
    if (!seen.has(path)) problems.push(`missing SPEC block: ${path}`);
    const rel = path.replace(/^mockups\//, '');
    if (!readme.includes(`(${rel})`)) problems.push(`mockups/README.md does not link ${rel}`);
  }
  for (const f of otherFiles) problems.push(`non-source file in docs/mockups/: ${f} (only .puml sources and README.md are allowed)`);
  return { problems, synced };
}

export function load(docsDir = DOCS_DIR) {
  const mockupsDir = join(docsDir, 'mockups');
  const sources = new Map<string, string>();
  const otherFiles: string[] = [];
  for (const file of walk(mockupsDir).sort()) {
    const rel = relative(docsDir, file).split('\\').join('/');
    if (rel.endsWith('.puml')) sources.set(rel, readFileSync(file, 'utf8'));
    else if (rel !== 'mockups/README.md') otherFiles.push(rel);
  }
  const specPath = join(docsDir, 'SPEC.md');
  return {
    specPath,
    spec: readFileSync(specPath, 'utf8'),
    sources,
    otherFiles,
    readme: readFileSync(join(mockupsDir, 'README.md'), 'utf8'),
  };
}

if (import.meta.main) {
  const mode = process.argv[2];
  if (mode !== 'sync' && mode !== 'check') {
    console.error('usage: node scripts/mockups.ts sync|check');
    process.exit(2);
  }
  const { specPath, spec, sources, otherFiles, readme } = load();
  const report = analyze(spec, sources, otherFiles, readme);
  if (mode === 'sync') {
    if (report.synced !== spec) {
      writeFileSync(specPath, report.synced);
      console.log('updated SPEC.md mockup blocks from their sources');
    }
    const remaining = analyze(report.synced, sources, otherFiles, readme).problems;
    for (const p of remaining) console.error(`error: ${p}`);
    if (remaining.length) process.exit(1);
    console.log(`${sources.size} mockup sources in sync`);
  } else {
    for (const p of report.problems) console.error(`error: ${p}`);
    if (report.problems.length) {
      console.error('run `make mockups-sync`, add missing SPEC blocks, or remove non-source files');
      process.exit(1);
    }
    console.log(`${sources.size} mockup sources match their SPEC blocks`);
  }
}
