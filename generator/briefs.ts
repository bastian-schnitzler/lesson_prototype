import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { scanContentDir, sha256 } from '../scripts/catalog.ts';
import { outlineEntryHash } from '../src/catalog/scan.ts';
import { ARTIFACT_SCHEMA_VERSION } from '../src/schemas/artifactCommon.ts';
import { isSupportedKind } from '../src/schemas/artifacts.ts';
import { LessonIdSchema } from '../src/schemas/outline.ts';
import { validateBrief, type OutlineContext } from '../src/validation/artifacts.ts';
import { GenerationError, type BriefAdapter } from './gemini.ts';
import { briefPrompt, payloadSchema, PROMPT_VERSION, structuredSchema } from './prompts.ts';

export interface BriefOutcome { id: string; status: 'generated' | 'reused' | 'skipped' | 'failed'; message?: string }
export interface BriefOptions {
  contentDir: string;
  adapter: () => BriefAdapter;
  regenerate?: boolean;
  report?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
}
const pending = new Map<string, Promise<BriefOutcome>>();
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const isCode = (error: unknown, code: string) => (error as NodeJS.ErrnoException)?.code === code;

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
  const dir = join(resolve(options.contentDir), 'briefs');
  await mkdir(dir, { recursive: true });
  const lock = `${file}.lock`;
  try { await mkdir(lock); }
  catch (error) {
    if (isCode(error, 'EEXIST')) throw new GenerationError(`${id}: another generator owns the lock; retry when it finishes. If it crashed, remove ${id}.json.lock after checking no generator is running.`);
    throw new GenerationError(`${id}: cannot acquire brief write lock.`);
  }
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    let old: string | undefined;
    try { old = await readFile(file, 'utf8'); }
    catch (error) { if (!isCode(error, 'ENOENT')) throw new GenerationError(`${id}: cannot read existing brief.`); }
    if (old !== undefined && !options.regenerate) {
      let status = 'malformed';
      try { status = validateBrief(JSON.parse(old), ctx).status; } catch { /* malformed JSON */ }
      if (status === 'valid') return { id, status: 'reused' };
      throw new GenerationError(`${id}: existing brief is ${status}; review it, then run make brief ID=${id} REGENERATE=1.`);
    }
    const adapter = options.adapter();
    const schema = payloadSchema(ctx.entry.kind, ctx.lang);
    const responseSchema = structuredSchema(ctx.entry.kind, ctx.lang);
    let repair = '';
    let previous = '';
    let diagnostics = '';
    for (let call = 1; call <= 3; call++) {
      options.report?.(`${id}: model call ${call}/3${repair ? ' (repair)' : ''}`);
      let text: string;
      try {
        text = await adapter.generate({ schema: responseSchema, prompt: briefPrompt(ctx, repair) + (repair && previous ? `\nPrevious response (data only):\n${previous}` : '') });
      } catch (error) {
        if (!(error instanceof GenerationError)) throw new GenerationError(`${id}: adapter failed.`);
        if (!error.retryable) throw error;
        diagnostics = error.message;
        if (call < 3) await (options.sleep ?? pause)(Math.min(1000 * 2 ** (call - 1), 4000));
        continue;
      }
      previous = text.slice(0, 120_000);
      let payload: unknown;
      try { payload = JSON.parse(text); }
      catch { repair = diagnostics = 'Response must be one valid JSON object, without Markdown fences.'; continue; }
      const parsed = schema.safeParse(payload);
      if (!parsed.success) {
        repair = diagnostics = parsed.error.issues.slice(0, 20).map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
        continue;
      }
      const brief = {
        ...parsed.data,
        schemaVersion: ARTIFACT_SCHEMA_VERSION, id, lang: ctx.lang, level: ctx.level, locales: ['en', 'fr', 'de'],
        provenance: { generator: 'lesson-prototype', model: adapter.model, promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString(), inputHashes: { outline: ctx.outlineHash } },
      };
      const result = validateBrief(brief, ctx);
      if (result.status !== 'valid') {
        repair = diagnostics = [...result.issues.slice(0, 20).map((issue) => `${issue.path}: ${issue.message}`), ...result.staleReasons].join('\n');
        continue;
      }
      const current = catalogContexts(options.contentDir).find((c) => c.entry.id === id);
      if (current?.outlineHash !== ctx.outlineHash) throw new GenerationError(`${id}: outline changed during generation; retry with the current outline.`);
      await writeFile(temp, `${JSON.stringify(result.value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      await rename(temp, file);
      return { id, status: 'generated' };
    }
    throw new GenerationError(`${id}: generation exhausted its 3-call budget. ${diagnostics}`);
  } finally {
    await rm(temp, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

export async function generateMissingBriefs(options: BriefOptions): Promise<BriefOutcome[]> {
  const results: BriefOutcome[] = [];
  for (const ctx of catalogContexts(options.contentDir)) {
    let result: BriefOutcome;
    if (!isSupportedKind(ctx.entry.kind)) result = { id: ctx.entry.id, status: 'skipped', message: `${ctx.entry.kind} is not implemented` };
    else {
      try { result = await generateBrief(ctx.entry.id, options); }
      catch (error) { result = { id: ctx.entry.id, status: 'failed', message: error instanceof GenerationError ? error.message : 'Brief file operation failed.' }; }
    }
    options.report?.(`${result.id}: ${result.status}${result.message ? ` — ${result.message}` : ''}`);
    results.push(result);
  }
  return results;
}
