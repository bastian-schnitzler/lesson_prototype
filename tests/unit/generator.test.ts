// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogContexts, generateBrief, generateMissingBriefs, type BriefOptions } from '../../generator/briefs.ts';
import { geminiAdapter, GenerationError, loadConfig, type GenerationRequest } from '../../generator/gemini.ts';
import { payloadSchema, structuredSchema } from '../../generator/prompts.ts';
import { scanContentDir } from '../../scripts/catalog.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURES = join(ROOT, 'tests/fixtures/content');
const VOC = 'fr-classroom-objects';
const GRAM = 'fr-verb-etre-present';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function setup(ids: string[] = [VOC, GRAM]) {
  const dir = mkdtempSync(join(tmpdir(), 'lesson-generator-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'outlines'));
  const outline = JSON.parse(readFileSync(join(FIXTURES, 'outlines/fr-a1.json'), 'utf8'));
  outline.entries = outline.entries.filter((entry: { id: string }) => ids.includes(entry.id));
  writeFileSync(join(dir, 'outlines/fr-a1.json'), JSON.stringify(outline));
  return dir;
}
function payload(id: string): Record<string, unknown> {
  const brief = JSON.parse(readFileSync(join(FIXTURES, 'briefs', id + '.json'), 'utf8'));
  for (const key of ['schemaVersion', 'id', 'lang', 'level', 'locales', 'provenance']) delete brief[key];
  return brief;
}
const output = (id: string) => JSON.stringify(payload(id));
function options(dir: string, impl: (request: GenerationRequest) => Promise<string> = async () => output(VOC)) {
  const generate = vi.fn(impl);
  const adapter = vi.fn(() => ({ model: 'fake-model', generate }));
  return { opts: { contentDir: dir, adapter, sleep: async () => {} } satisfies BriefOptions, generate, adapter };
}
const saved = (dir: string, id = VOC) => join(dir, 'briefs', id + '.json');

describe('offline brief authoring', () => {
  it.each([VOC, GRAM])('saves validated multilingual %s with trusted provenance and reuses it without configuration', async (id) => {
    const dir = setup();
    const { opts, generate } = options(dir, async () => output(id));
    expect(await generateBrief(id, opts)).toEqual({ id, status: 'generated' });
    const artifact = JSON.parse(readFileSync(saved(dir, id), 'utf8'));
    expect(artifact.provenance.inputHashes.outline).toBe(catalogContexts(dir).find((c) => c.entry.id === id)?.outlineHash);
    expect(artifact.provenance).toMatchObject({ model: 'fake-model', generator: 'lesson-prototype', promptVersion: 'brief-v1' });
    expect(scanContentDir(dir).manifest.artifacts[id].draft?.status).toBe('valid');
    expect(await generateBrief(id, { ...opts, adapter: () => { throw new Error('must not load credentials'); } })).toEqual({ id, status: 'reused' });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(readdirSync(join(dir, 'briefs'))).toEqual([id + '.json']);
  });

  it('repairs malformed JSON and field errors within a shared three-call budget', async () => {
    const dir = setup();
    const broken = payload(VOC);
    broken.objective = { en: 'Incomplete' };
    const responses = ['{', JSON.stringify(broken), output(VOC)];
    const { opts, generate } = options(dir, async () => responses.shift()!);
    await generateBrief(VOC, opts);
    expect(generate).toHaveBeenCalledTimes(3);
    expect(generate.mock.calls[2][0].prompt).toContain('objective.fr');
    expect(generate.mock.calls[2][0].prompt).toContain('Previous response');
  });

  it('repairs semantic reference/coverage errors rather than saving schema-valid data', async () => {
    const dir = setup();
    const broken = payload(GRAM) as any;
    broken.exam.pages[0].ruleIds = ['unknown-rule'];
    const { opts, generate } = options(dir, async () => generate.mock.calls.length === 1 ? JSON.stringify(broken) : output(GRAM));
    await generateBrief(GRAM, opts);
    expect(generate.mock.calls[1][0].prompt).toContain('unknown rule');
    expect(scanContentDir(dir).manifest.artifacts[GRAM].draft?.status).toBe('valid');
  });

  it('exhausts repairs without saving a partial file and allows a later retry', async () => {
    const dir = setup();
    const { opts, generate } = options(dir, async () => '{}');
    await expect(generateBrief(VOC, opts)).rejects.toThrow('3-call budget');
    expect(generate).toHaveBeenCalledTimes(3);
    expect(readdirSync(join(dir, 'briefs'))).toEqual([]);
    await expect(generateBrief(VOC, options(dir).opts)).resolves.toMatchObject({ status: 'generated' });
  });

  it.each(['id', 'kind'])('rejects model attempts to contradict trusted %s', async (key) => {
    const dir = setup();
    const body = { ...payload(VOC), [key]: key === 'id' ? GRAM : 'grammar' };
    await expect(generateBrief(VOC, options(dir, async () => JSON.stringify(body)).opts)).rejects.toThrow('3-call budget');
    expect(readdirSync(join(dir, 'briefs'))).toEqual([]);
  });

  it.each(['../escape', 'fr-unknown', 'fr-fix-greetings', 'fr-fix-menu'])('rejects invalid, unknown and unsupported ID %s before adapter access', async (id) => {
    const dir = setup([VOC, 'fr-fix-greetings', 'fr-fix-menu']);
    const { opts, adapter } = options(dir);
    await expect(generateBrief(id, opts)).rejects.toThrow();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('fails catalog ambiguity before requests', async () => {
    const dir = setup();
    const outline = JSON.parse(readFileSync(join(dir, 'outlines/fr-a1.json'), 'utf8'));
    outline.level = 'A2';
    writeFileSync(join(dir, 'outlines/fr-a2.json'), JSON.stringify(outline));
    const { opts, adapter } = options(dir);
    await expect(generateBrief(VOC, opts)).rejects.toThrow('Catalog preflight');
    expect(adapter).not.toHaveBeenCalled();
  });

  it('requires explicit replacement for stale/malformed files and preserves old bytes on failed replacement', async () => {
    const dir = setup();
    await generateBrief(VOC, options(dir).opts);
    const prior = readFileSync(saved(dir), 'utf8');
    const outlinePath = join(dir, 'outlines/fr-a1.json');
    const outline = JSON.parse(readFileSync(outlinePath, 'utf8'));
    outline.entries[0].intent = 'Nouvel objectif.';
    writeFileSync(outlinePath, JSON.stringify(outline));
    const { opts, adapter } = options(dir, async () => '{}');
    await expect(generateBrief(VOC, opts)).rejects.toThrow('stale');
    expect(adapter).not.toHaveBeenCalled();
    await expect(generateBrief(VOC, { ...opts, regenerate: true })).rejects.toThrow('3-call budget');
    expect(readFileSync(saved(dir), 'utf8')).toBe(prior);
    writeFileSync(saved(dir), '{');
    await expect(generateBrief(VOC, opts)).rejects.toThrow('malformed');
    await expect(generateBrief(VOC, { ...options(dir).opts, regenerate: true })).resolves.toMatchObject({ status: 'generated' });
  });

  it('deduplicates parallel preparation for an ID and respects a cross-process lock', async () => {
    const dir = setup();
    const { opts, generate } = options(dir);
    const first = generateBrief(VOC, opts);
    expect(generateBrief(VOC, opts)).toBe(first);
    await first;
    expect(generate).toHaveBeenCalledTimes(1);
    mkdirSync(saved(dir) + '.lock');
    await expect(generateBrief(VOC, { ...opts, regenerate: true })).rejects.toThrow('another generator');
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('does not save when the outline changes during generation', async () => {
    const dir = setup();
    const { opts } = options(dir, async () => {
      const path = join(dir, 'outlines/fr-a1.json');
      const outline = JSON.parse(readFileSync(path, 'utf8'));
      outline.entries[0].intent = 'Changed during request.';
      writeFileSync(path, JSON.stringify(outline));
      return output(VOC);
    });
    await expect(generateBrief(VOC, opts)).rejects.toThrow('outline changed');
    expect(readdirSync(join(dir, 'briefs'))).toEqual([]);
  });

  it('uses serial outline order, skips unsupported categories and continues after failure', async () => {
    const dir = setup(['fr-fix-greetings', VOC, GRAM, 'fr-fix-menu']);
    let active = 0;
    const { opts, generate } = options(dir, async (request) => {
      expect(active++).toBe(0);
      await Promise.resolve();
      active--;
      if (request.prompt.includes(VOC)) throw new GenerationError('Gemini returned HTTP 403.');
      return output(GRAM);
    });
    const outcomes = await generateMissingBriefs(opts);
    expect(outcomes.map((r) => [r.id, r.status])).toEqual([
      ['fr-fix-greetings', 'skipped'], [VOC, 'failed'], [GRAM, 'generated'], ['fr-fix-menu', 'skipped'],
    ]);
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it('shares transient retry and repair budgets with capped backoff', async () => {
    const dir = setup();
    let count = 0;
    const { opts, generate } = options(dir, async () => {
      if (++count !== 2) throw new GenerationError('Gemini returned HTTP 429.', true);
      return '{}';
    });
    const sleep = vi.fn(async () => {});
    await expect(generateBrief(VOC, { ...opts, sleep })).rejects.toThrow('3-call budget');
    expect(generate).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000]]);
  });
});

describe('Gemini boundary and CLI', () => {
  it('reads only local dotenv configuration, with safe missing/invalid configuration errors', () => {
    const dir = setup();
    const env = join(dir, '.env');
    expect(() => loadConfig(env)).toThrow('Cannot read .env');
    writeFileSync(env, 'GEMINI_API_KEY="fake-secret"\nGEMINI_MODEL=models/fake-model\n');
    expect(loadConfig(env)).toEqual({ apiKey: 'fake-secret', model: 'fake-model' });
    writeFileSync(env, 'GEMINI_API_KEY=fake-secret\nGEMINI_MODEL=https://bad\n');
    expect(() => loadConfig(env)).toThrow('model name');
    writeFileSync(env, 'GEMINI_API_KEY=fake-secret\n');
    expect(() => loadConfig(env)).toThrow('Set GEMINI_API_KEY');
    writeFileSync(env, 'GEMINI_API_KEY=fake-secret\nGEMINI_API_KEY2=fake-second\nGEMINI_MODEL=fake-model\n');
    expect(loadConfig(env)).toEqual({ apiKey: 'fake-secret', fallbackApiKey: 'fake-second', model: 'fake-model' });
  });

  it('sends structured output schema and authenticates via header; omits thought text', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ candidates: [{
      finishReason: 'STOP', content: { parts: [{ thought: true, text: 'reasoning' }, { text: output(VOC) }] },
    }] })));
    const schema = structuredSchema('vocabulary', 'fr');
    const result = await geminiAdapter({ apiKey: 'fake-secret', model: 'fake-model' }, fetcher).generate({ prompt: 'test', schema });
    expect(result).toBe(output(VOC));
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain('fake-secret');
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'fake-secret' });
    expect(JSON.parse(String(init?.body)).generationConfig).toEqual({ responseMimeType: 'application/json', responseJsonSchema: schema });
    expect(schema.properties).not.toHaveProperty('provenance');
    expect(JSON.stringify(schema)).not.toContain('"const"');
    expect(payloadSchema('grammar', 'fr').safeParse(payload(GRAM)).success).toBe(true);
  });

  it.each([400, 403, 429, 503])('sanitizes HTTP %s errors and marks only transient failures retryable', async (status) => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('fake-secret', { status }));
    const adapter = geminiAdapter({ apiKey: 'fake-secret', model: 'fake-model' }, fetcher);
    const error = await adapter.generate({ prompt: 'test', schema: {} }).catch((e: unknown) => e) as GenerationError;
    expect(error.message).toBe('Gemini returned HTTP ' + status + '.');
    expect(error.retryable).toBe(status === 429 || status >= 500);
  });

  it('switches to the fallback key after HTTP 429 and keeps using it', async () => {
    const ok = () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }));
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => (init?.headers as Record<string, string>)['x-goog-api-key'] === 'fake-secret' ? new Response('', { status: 429 }) : ok());
    const adapter = geminiAdapter({ apiKey: 'fake-secret', fallbackApiKey: 'fake-second', model: 'fake-model' }, fetcher);
    await expect(adapter.generate({ prompt: 'test', schema: {} })).resolves.toBe('{}');
    await expect(adapter.generate({ prompt: 'test', schema: {} })).resolves.toBe('{}');
    expect(fetcher.mock.calls.map(([, init]) => (init?.headers as Record<string, string>)['x-goog-api-key'])).toEqual(['fake-secret', 'fake-second', 'fake-second']);
    const exhausted = geminiAdapter({ apiKey: 'fake-secret', fallbackApiKey: 'fake-second', model: 'fake-model' }, async () => new Response('', { status: 429 }));
    await expect(exhausted.generate({ prompt: 'test', schema: {} })).rejects.toThrow('HTTP 429');
  });

  it('sanitizes network exceptions and rejects truncated, blocked or empty output', async () => {
    const request = { prompt: 'test', schema: {} };
    const config = { apiKey: 'fake-secret', model: 'fake-model' };
    await expect(geminiAdapter(config, async () => { throw new Error('fake-secret'); }).generate(request)).rejects.toThrow('network request failed');
    for (const body of [{ candidates: [{ finishReason: 'MAX_TOKENS' }] }, { candidates: [{ finishReason: 'SAFETY' }] }, { candidates: [] }]) {
      await expect(geminiAdapter(config, async () => new Response(JSON.stringify(body))).generate(request)).rejects.toThrow();
    }
  });

  it('CLI exits nonzero for a missing ID and batch failures without paid API calls', () => {
    const missing = spawnSync('make', ['brief'], { cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH } });
    expect(missing.error).toBeUndefined();
    expect(missing.status).not.toBe(0);
    expect(missing.stdout + missing.stderr).toContain('ID is required');
    const dir = setup(['fr-fix-greetings', VOC]);
    const result = spawnSync(process.execPath, ['generator/cli.ts', 'briefs-missing', '--content-dir', dir, '--env', join(dir, 'absent')], { cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH } });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('skipped: 1, failed: 1');
    expect(result.stdout).toContain('Cannot read .env');
    const example = readFileSync(join(ROOT, '.env.example'), 'utf8');
    expect(example).toContain('GEMINI_API_KEY=\n');
    expect(execFileSync('git', ['check-ignore', '.env'], { cwd: ROOT, encoding: 'utf8' }).trim()).toBe('.env');
  });
});
