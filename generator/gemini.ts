import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'zod';

export interface GeminiConfig { apiKey: string; model: string }
export interface GenerationRequest { prompt: string; schema: Record<string, unknown> }
export interface BriefAdapter { model: string; generate(request: GenerationRequest): Promise<string> }

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
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim().replace(/^models\//, '');
  if (!apiKey || !model) throw new GenerationError('Set GEMINI_API_KEY and GEMINI_MODEL in .env.');
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(model)) throw new GenerationError('GEMINI_MODEL must be a model name, optionally prefixed with models/.');
  return { apiKey, model };
}

/** REST structured output: https://ai.google.dev/api/generate-content */
export function geminiAdapter(config: GeminiConfig, fetcher: typeof fetch = fetch): BriefAdapter {
  return {
    model: config.model,
    async generate(request) {
      let response: Response;
      try {
        response = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
            generationConfig: { responseMimeType: 'application/json', responseJsonSchema: request.schema },
          }),
        });
      } catch { throw new GenerationError('Gemini network request failed or timed out.', true); }
      if (!response.ok) {
        // Never echo remote bodies, headers, URLs or fetch exceptions: they may contain secrets.
        throw new GenerationError(`Gemini returned HTTP ${response.status}.`, response.status === 429 || response.status >= 500);
      }
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
      return text;
    },
  };
}

const ResponseSchema = z.object({
  candidates: z.array(z.object({
    finishReason: z.string(),
    content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })).optional() }).optional(),
  })).min(1),
});
