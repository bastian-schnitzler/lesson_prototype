import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'zod';

/**
 * GEMINI_API_KEY may list several keys separated by commas; the rest are fallbackApiKeys, tried in order.
 * GEMINI_MODEL may list several models, best first; the rest are fallbackModels.
 */
export interface GeminiConfig { apiKey: string; fallbackApiKeys?: string[]; model: string; fallbackModels?: string[] }
/** `label` (the lesson ID) prefixes attempt reports, which interleave when workers run in parallel. */
export interface GenerationRequest { prompt: string; schema: Record<string, unknown>; label?: string }
/** Generated JSON text and the model that produced it, for provenance. */
export interface GenerationResult { text: string; model: string }
export interface BriefAdapter { generate(request: GenerationRequest): Promise<GenerationResult> }

/** Only these sanitized errors may cross the adapter/CLI boundary. */
export class GenerationError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

export function loadConfig(path: string): GeminiConfig {
  let env: Record<string, string | undefined>;
  try { env = parseEnv(readFileSync(path, 'utf8')); }
  catch { throw new GenerationError('Cannot read .env; copy .env.example and configure Gemini.'); }
  const [apiKey, ...fallbackApiKeys] = (env.GEMINI_API_KEY ?? '').split(',').map((key) => key.trim()).filter(Boolean);
  const models = (env.GEMINI_MODEL ?? '').split(',').map((m) => m.trim().replace(/^models\//, '')).filter(Boolean);
  if (!apiKey || !models.length) throw new GenerationError('Set GEMINI_API_KEY and GEMINI_MODEL in .env.');
  if (!models.every((m) => /^[a-zA-Z0-9._-]{1,80}$/.test(m))) throw new GenerationError('GEMINI_MODEL must be model names separated by commas, each optionally prefixed with models/.');
  const [model, ...fallbackModels] = models;
  return { apiKey, ...(fallbackApiKeys.length && { fallbackApiKeys }), model, ...(fallbackModels.length && { fallbackModels }) };
}

/**
 * Batch settings: GEMINI_CONCURRENCY briefs at once (default 1, serial); worker n starts
 * n × GEMINI_WORKER_STAGGER_S seconds after the first (default 30).
 */
export interface BatchConfig { concurrency: number; staggerMs: number }
export const MAX_CONCURRENCY = 8;
export function loadBatchConfig(path: string): BatchConfig {
  let env: Record<string, string | undefined>;
  try { env = parseEnv(readFileSync(path, 'utf8')); }
  catch { return { concurrency: 1, staggerMs: 30_000 }; }
  const number = (name: string, fallback: number, min: number, max: number) => {
    const raw = env[name]?.trim();
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) throw new GenerationError(`${name} must be a whole number from ${min} to ${max}.`);
    return value;
  };
  return { concurrency: number('GEMINI_CONCURRENCY', 1, 1, MAX_CONCURRENCY), staggerMs: number('GEMINI_WORKER_STAGGER_S', 30, 0, 600) * 1000 };
}

/**
 * REST structured output: https://ai.google.dev/api/generate-content
 *
 * Each request starts with the first configured model and tries every key up to
 * ATTEMPTS_PER_KEY times, pausing RETRY_PAUSES_MS between attempts. Only when every key of a
 * model has failed does the request move on to the next model. Transient failures (HTTP 429,
 * server errors, network errors) are retried; other failures stop immediately. A model/key
 * pair that answers every attempt with HTTP 429 has exhausted its quota and is skipped for
 * the rest of the run. When `config` is a function (the CLI rereads .env), keys and models are
 * reloaded before every request, so a key added while a batch runs is used right away; an
 * unreadable configuration keeps the last valid one.
 */
export const ATTEMPTS_PER_KEY = 3;
/** Large briefs can take several minutes on a loaded model. */
export const REQUEST_TIMEOUT_MS = 500_000;
export const RETRY_PAUSES_MS = [5_000, 15_000];
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

export function geminiAdapter(config: GeminiConfig | (() => GeminiConfig), fetcher: typeof fetch = fetch, sleep = pause, report?: (message: string) => void): BriefAdapter {
  let current = typeof config === 'function' ? config() : config;
  const reload = () => {
    if (typeof config !== 'function') return current;
    try { current = config(); }
    catch { report?.('  .env could not be read; keeping the previous Gemini configuration.'); }
    return current;
  };
  // Keyed by the key itself, not its position, so keys added or reordered later keep their state.
  const exhausted = new Set<string>();
  const send = async (request: GenerationRequest, model: string, key: string): Promise<Response> => {
    try {
      return await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: request.schema },
        }),
      });
    } catch { throw new GenerationError('Gemini network request failed or timed out.', true); }
  };
  const respond = async (request: GenerationRequest): Promise<{ response: Response; model: string }> => {
    let failure: GenerationError | undefined;
    const { apiKey, fallbackApiKeys, model: first, fallbackModels } = reload();
    const keys = [apiKey, ...(fallbackApiKeys ?? [])];
    for (const model of [first, ...(fallbackModels ?? [])]) {
      for (const [index, key] of keys.entries()) {
        const pair = `${model}/${key}`;
        if (exhausted.has(pair)) continue;
        let quotaOnly = true;
        for (let attempt = 1; attempt <= ATTEMPTS_PER_KEY; attempt++) {
          if (attempt > 1) await sleep(RETRY_PAUSES_MS[Math.min(attempt - 2, RETRY_PAUSES_MS.length - 1)]);
          let response: Response;
          try { response = await send(request, model, key); }
          catch (error) {
            failure = error as GenerationError;
            quotaOnly = false;
            report?.(`  ${request.label ? `${request.label}: ` : ''}${model}, key ${index + 1}, attempt ${attempt}/${ATTEMPTS_PER_KEY}: network error`);
            continue;
          }
          if (response.ok) return { response, model };
          // Never echo remote bodies, headers, URLs or fetch exceptions: they may contain secrets.
          failure = new GenerationError(`Gemini returned HTTP ${response.status}.`, response.status === 429 || response.status >= 500);
          report?.(`  ${request.label ? `${request.label}: ` : ''}${model}, key ${index + 1}, attempt ${attempt}/${ATTEMPTS_PER_KEY}: HTTP ${response.status}`);
          if (!failure.retryable) throw failure;
          if (response.status !== 429) quotaOnly = false;
        }
        if (quotaOnly) exhausted.add(pair);
      }
    }
    throw failure ?? new GenerationError('Gemini quota is exhausted for every configured model and key.', true);
  };
  return {
    async generate(request) {
      const { response, model } = await respond(request);
      let data: unknown;
      try { data = await response.json(); }
      catch { throw new GenerationError('Gemini returned an unreadable response.', true); }
      const parsed = ResponseSchema.safeParse(data);
      if (!parsed.success) throw new GenerationError('Gemini returned no usable candidate.', true);
      const candidate = parsed.data.candidates[0];
      if (candidate.finishReason !== 'STOP') {
        throw new GenerationError('Gemini candidate was blocked or incomplete.', candidate.finishReason === 'MAX_TOKENS');
      }
      const text = candidate.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('');
      if (!text) throw new GenerationError('Gemini returned no JSON text.', true);
      return { text, model };
    },
  };
}

const ResponseSchema = z.object({
  candidates: z.array(z.object({
    finishReason: z.string(),
    content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })).optional() }).optional(),
  })).min(1),
});
