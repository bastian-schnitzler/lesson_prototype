import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { scanContentDir, sha256 } from '../scripts/catalog.ts';
import { outlineEntryHash } from '../src/catalog/scan.ts';
import { ARTIFACT_SCHEMA_VERSION } from '../src/schemas/artifactCommon.ts';
import { isSupportedKind } from '../src/schemas/artifacts.ts';
import { LessonIdSchema } from '../src/schemas/outline.ts';
import { validateBrief, type OutlineContext } from '../src/validation/artifacts.ts';
import { GenerationError, type BriefAdapter } from './gemini.ts';
import { briefPrompt, payloadSchema, PROMPT_VERSION, structuredSchema } from './prompts.ts';
import { isCode, ModelUnit, withFileLock } from './units.ts';

export interface BriefOutcome { id: string; status: 'generated' | 'reused' | 'skipped' | 'failed'; message?: string }
export interface BriefOptions {
  contentDir: string;
  adapter: () => BriefAdapter;
  regenerate?: boolean;
  report?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
  /** Briefs a batch generates at once; 1 (default) is serial. */
  concurrency?: number;
  /** Delay between worker starts, so parallel workers do not hit the API at the same moment. */
  staggerMs?: number;
}
const pending = new Map<string, Promise<BriefOutcome>>();
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

export function catalogContexts(contentDir: string): OutlineContext[] {
  const catalog = scanContentDir(contentDir);
  if (catalog.errors.length || !catalog.manifest.courses.length) {
    throw new GenerationError(`Catalog preflight failed: ${catalog.errors.join('; ') || 'no valid outlines'}`);
  }
  return catalog.manifest.courses.flatMap((course) => {
    const outline = catalog.outlines.get(course.key)!;
    return outline.entries.map((entry) => ({ entry, lang: outline.lang, level: outline.level, outlineHash: outlineEntryHash(entry, outline, sha256) }));
  });
}

/** Coalesce concurrent callers; an exclusive filesystem lock prevents cross-process writes. */
export function generateBrief(id: string, options: BriefOptions): Promise<BriefOutcome> {
  if (!LessonIdSchema.safeParse(id).success) return Promise.reject(new GenerationError('ID must be a canonical outline lesson ID.'));
  const key = join(resolve(options.contentDir), 'briefs', `${id}.json`);
  const existing = pending.get(key);
  if (existing) return existing;
  const task = generate(id, key, options).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

async function generate(id: string, file: string, options: BriefOptions): Promise<BriefOutcome> {
  const ctx = catalogContexts(options.contentDir).find((ctx) => ctx.entry.id === id);
  if (!ctx) throw new GenerationError(`Unknown lesson ID: ${id}.`);
  if (!isSupportedKind(ctx.entry.kind)) throw new GenerationError(`${ctx.entry.kind} generation is not implemented (phases 4/5).`);
  const kind = ctx.entry.kind;
  await mkdir(join(resolve(options.contentDir), 'briefs'), { recursive: true });
  return withFileLock(file, id, 'brief', async (save) => {
    let old: string | undefined;
    try { old = await readFile(file, 'utf8'); }
    catch (error) { if (!isCode(error, 'ENOENT')) throw new GenerationError(`${id}: cannot read existing brief.`); }
    if (old !== undefined && !options.regenerate) {
      let status = 'malformed';
      try { status = validateBrief(JSON.parse(old), ctx).status; } catch { /* malformed JSON */ }
      if (status === 'valid') return { id, status: 'reused' };
      throw new GenerationError(`${id}: existing brief is ${status}; review it, then run make brief ID=${id} REGENERATE=1.`);
    }
    const unit = new ModelUnit<unknown>(id, payloadSchema(kind, ctx.lang), structuredSchema(kind, ctx.lang), (repair) => briefPrompt(ctx, repair), {
      adapter: options.adapter(), report: options.report, sleep: options.sleep,
    });
    for (;;) {
      const payload = await unit.request();
      const brief = {
        ...(payload as object),
        schemaVersion: ARTIFACT_SCHEMA_VERSION, id, lang: ctx.lang, level: ctx.level, locales: ['en', 'fr', 'de'],
        provenance: { generator: 'lesson-prototype', model: unit.model, promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString(), inputHashes: { outline: ctx.outlineHash } },
      };
      const result = validateBrief(brief, ctx);
      if (result.status !== 'valid') {
        unit.reject([...result.issues.map((issue) => `${issue.path}: ${issue.message}`), ...result.staleReasons]);
        continue;
      }
      const current = catalogContexts(options.contentDir).find((c) => c.entry.id === id);
      if (current?.outlineHash !== ctx.outlineHash) throw new GenerationError(`${id}: outline changed during generation; retry with the current outline.`);
      await save(result.value);
      return { id, status: 'generated', message: `model ${unit.model}` };
    }
  });
}

export function generateMissingBriefs(options: BriefOptions): Promise<BriefOutcome[]> {
  return generateBriefs(catalogContexts(options.contentDir), options);
}

/** SPEC section 9: the first ten grammar and first ten vocabulary entries of fr/A1, in outline order. */
export const SAMPLE_COURSE = { lang: 'fr', level: 'A1', perKind: 10 } as const;

export function sampleContexts(contentDir: string): OutlineContext[] {
  const course = catalogContexts(contentDir).filter((ctx) => ctx.lang === SAMPLE_COURSE.lang && ctx.level === SAMPLE_COURSE.level);
  const picked = new Set(['grammar', 'vocabulary'].flatMap((kind) => course.filter((ctx) => ctx.entry.kind === kind).slice(0, SAMPLE_COURSE.perKind)));
  if (picked.size !== 2 * SAMPLE_COURSE.perKind) {
    throw new GenerationError(`The ${SAMPLE_COURSE.lang}/${SAMPLE_COURSE.level} outline needs ${SAMPLE_COURSE.perKind} grammar and ${SAMPLE_COURSE.perKind} vocabulary entries for the sample batch.`);
  }
  return course.filter((ctx) => picked.has(ctx));
}

export function generateSampleBriefs(options: BriefOptions): Promise<BriefOutcome[]> {
  return generateBriefs(sampleContexts(options.contentDir), options);
}

/**
 * Batch with `concurrency` workers taking lessons in outline order, worker n starting
 * n × `staggerMs` later: reports each outcome as it finishes, continues after per-lesson
 * failures and returns the outcomes in outline order.
 */
function generateBriefs(contexts: OutlineContext[], options: BriefOptions): Promise<BriefOutcome[]> {
  return runBatch(contexts, options, generateBrief);
}

/** Shared by brief and lesson batches. */
export async function runBatch<O extends BriefOutcome>(contexts: OutlineContext[], options: BriefOptions, run: (id: string, options: BriefOptions) => Promise<O>): Promise<BriefOutcome[]> {
  const results: BriefOutcome[] = new Array(contexts.length);
  let next = 0;
  const worker = async (_: unknown, n: number) => {
    if (n > 0) await (options.sleep ?? pause)(n * (options.staggerMs ?? 0));
    while (next < contexts.length) {
      const index = next++;
      const ctx = contexts[index];
      let result: BriefOutcome;
      if (!isSupportedKind(ctx.entry.kind)) result = { id: ctx.entry.id, status: 'skipped', message: `${ctx.entry.kind} is not implemented` };
      else {
        try { result = await run(ctx.entry.id, options); }
        catch (error) { result = { id: ctx.entry.id, status: 'failed', message: error instanceof GenerationError ? error.message : 'Brief file operation failed.' }; }
      }
      options.report?.(`${result.id}: ${result.status}${result.message ? ` — ${result.message}` : ''}`);
      results[index] = result;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(options.concurrency ?? 1, contexts.length)) }, worker));
  return results;
}
