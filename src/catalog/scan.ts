import { compareLevels } from '../schemas/common.ts';
import { MANIFEST_SCHEMA_VERSION, type LessonArtifacts, type Manifest } from '../schemas/manifest.ts';
import { OutlineFileSchema, type OutlineEntry, type OutlineFile } from '../schemas/outline.ts';

/**
 * The shared catalog scanner: validates every outline file, rejects ambiguous
 * courses and lesson IDs, and derives the manifest the browser reads. Pure, so
 * the dev server, `make run`, the build and the generators all reuse it with
 * their own file access and hash function.
 */

export interface SourceFile {
  /** File name only, e.g. fr-a1.json or fr-classroom-objects.json. */
  name: string;
  text: string;
}

export interface CatalogInput {
  outlines: SourceFile[];
  briefs: SourceFile[];
  lessons: SourceFile[];
  hash: (text: string) => string;
}

export interface CatalogResult {
  manifest: Manifest;
  outlines: Map<string, OutlineFile>;
  errors: string[];
  warnings: string[];
}

/** JSON with sorted object keys and no insignificant whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function courseKey(lang: string, level: string): string {
  return `${lang}-${level.toLowerCase()}`;
}

/** Hash input for one lesson: its own outline entry plus the course lang/level. */
export function outlineEntryHash(entry: OutlineEntry, file: Pick<OutlineFile, 'lang' | 'level'>, hash: (t: string) => string) {
  return hash(canonicalJson({ entry, lang: file.lang, level: file.level }));
}

export function scanCatalog(input: CatalogInput): CatalogResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const outlines = new Map<string, OutlineFile>();
  const lessonOwner = new Map<string, string>();
  const courses: Manifest['courses'] = [];
  const artifacts: Record<string, LessonArtifacts> = {};

  for (const file of [...input.outlines].sort((a, b) => a.name.localeCompare(b.name))) {
    let data: unknown;
    try {
      data = JSON.parse(file.text);
    } catch (e) {
      errors.push(`${file.name}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    const parsed = OutlineFileSchema.safeParse(data);
    if (!parsed.success) {
      const first = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
      errors.push(`${file.name}: invalid outline (${first.join('; ')})`);
      continue;
    }
    const outline = parsed.data;
    const key = courseKey(outline.lang, outline.level);
    if (file.name !== `${key}.json`) {
      errors.push(`${file.name}: expected file name ${key}.json for lang ${outline.lang}, level ${outline.level}`);
      continue;
    }
    if (outlines.has(key)) {
      errors.push(`${file.name}: duplicate course ${outline.lang}/${outline.level}`);
      continue;
    }
    let duplicate = false;
    for (const entry of outline.entries) {
      const owner = lessonOwner.get(entry.id);
      if (owner) {
        errors.push(`${file.name}: lesson ID ${entry.id} is already used in ${owner}`);
        duplicate = true;
      }
    }
    if (duplicate) continue;
    outlines.set(key, outline);
    for (const entry of outline.entries) {
      lessonOwner.set(entry.id, file.name);
      artifacts[entry.id] = { outlineHash: outlineEntryHash(entry, outline, input.hash) };
    }
    courses.push({
      key,
      lang: outline.lang,
      level: outline.level,
      outlineUrl: `content/outlines/${file.name}`,
      sourceHash: input.hash(file.text),
      lessonIds: outline.entries.map((e) => e.id),
    });
  }

  courses.sort((a, b) => a.lang.localeCompare(b.lang) || compareLevels(a.level, b.level));

  const attach = (files: SourceFile[], dir: 'briefs' | 'lessons', slot: 'draft' | 'content') => {
    for (const file of files) {
      const id = file.name.replace(/\.json$/, '');
      const target = artifacts[id];
      if (!file.name.endsWith('.json') || !target) {
        warnings.push(`content/${dir}/${file.name}: no outline entry with ID ${id}; ignored`);
        continue;
      }
      let status: 'present' | 'malformed' = 'present';
      try {
        JSON.parse(file.text);
      } catch {
        status = 'malformed';
        warnings.push(`content/${dir}/${file.name}: not valid JSON`);
      }
      target[slot] = { url: `content/${dir}/${file.name}`, sourceHash: input.hash(file.text), status };
    }
  };
  attach(input.briefs, 'briefs', 'draft');
  attach(input.lessons, 'lessons', 'content');

  for (const [id, a] of Object.entries(artifacts)) {
    if (a.content && !a.draft) warnings.push(`${id}: lesson content exists without its draft (brief)`);
  }

  return {
    manifest: { schemaVersion: MANIFEST_SCHEMA_VERSION, courses, artifacts },
    outlines,
    errors,
    warnings,
  };
}
