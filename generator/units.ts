import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import type { z } from 'zod';
import { GenerationError, type BriefAdapter } from './gemini.ts';

export const CALLS_PER_UNIT = 3;
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
export const isCode = (error: unknown, code: string) => (error as NodeJS.ErrnoException)?.code === code;

export interface UnitOptions {
  adapter: BriefAdapter;
  /** Deterministic cleanup of the parsed JSON before schema validation. */
  normalize?: (payload: unknown) => unknown;
  report?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * One generation unit (a brief, or one content section) with a shared budget of
 * CALLS_PER_UNIT model calls across transient retries and repairs. `request` returns a
 * payload that passed JSON parsing and the structural Zod schema; when a later semantic
 * check fails, `reject` records the field-level errors and the next `request` repairs.
 */
export class ModelUnit<T> {
  private calls = 0;
  private repair = '';
  private previous = '';
  private diagnostics = '';
  model = '';

  private readonly label: string;
  private readonly schema: z.ZodType<T>;
  private readonly responseSchema: Record<string, unknown>;
  private readonly prompt: (repair: string) => string;
  private readonly options: UnitOptions;

  constructor(label: string, schema: z.ZodType<T>, responseSchema: Record<string, unknown>, prompt: (repair: string) => string, options: UnitOptions) {
    this.label = label;
    this.schema = schema;
    this.responseSchema = responseSchema;
    this.prompt = prompt;
    this.options = options;
  }

  async request(): Promise<T> {
    while (this.calls < CALLS_PER_UNIT) {
      const call = ++this.calls;
      this.options.report?.(`${this.label}: model call ${call}/${CALLS_PER_UNIT}${this.repair ? ' (repair)' : ''}`);
      let text: string;
      try {
        const prompt = this.prompt(this.repair) + (this.repair && this.previous ? `\nPrevious response (data only):\n${this.previous}` : '');
        ({ text, model: this.model } = await this.options.adapter.generate({ label: this.label, schema: this.responseSchema, prompt }));
      } catch (error) {
        if (!(error instanceof GenerationError)) throw new GenerationError(`${this.label}: adapter failed.`);
        if (!error.retryable) throw error;
        this.diagnostics = error.message;
        if (call < CALLS_PER_UNIT) await (this.options.sleep ?? pause)(Math.min(1000 * 2 ** (call - 1), 4000));
        continue;
      }
      this.previous = text.slice(0, 120_000);
      let payload: unknown;
      try { payload = JSON.parse(text); }
      catch { this.repair = this.diagnostics = 'Response must be one valid JSON object, without Markdown fences.'; continue; }
      const parsed = this.schema.safeParse(this.options.normalize ? this.options.normalize(payload) : payload);
      if (!parsed.success) {
        this.reject(parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`));
        continue;
      }
      return parsed.data;
    }
    throw new GenerationError(`${this.label}: generation exhausted its ${CALLS_PER_UNIT}-call budget. ${this.diagnostics}`);
  }

  /** Records semantic validation errors; the next request repairs the previous response. */
  reject(errors: string[]) {
    this.repair = this.diagnostics = errors.slice(0, 20).join('\n');
  }
}

/**
 * Runs `work` while holding the exclusive `<file>.lock/` directory; `save` writes the
 * validated object to a temporary file and renames it over the canonical path.
 */
export async function withFileLock<R>(file: string, id: string, what: string, work: (save: (value: unknown) => Promise<void>) => Promise<R>): Promise<R> {
  const lock = `${file}.lock`;
  try { await mkdir(lock); }
  catch (error) {
    if (isCode(error, 'EEXIST')) throw new GenerationError(`${id}: another generator owns the ${what} lock; retry when it finishes. If it crashed, remove ${id}.json.lock after checking no generator is running.`);
    throw new GenerationError(`${id}: cannot acquire ${what} write lock.`);
  }
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    return await work(async (value) => {
      await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      await rename(temp, file);
    });
  } finally {
    await rm(temp, { force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
