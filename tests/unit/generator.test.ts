// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogContexts, generateBrief, generateMissingBriefs, sampleContexts, type BriefOptions } from '../../generator/briefs.ts';
import { geminiAdapter, GenerationError, loadBatchConfig, loadConfig, type GenerationRequest } from '../../generator/gemini.ts';
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
  const generate = vi.fn(async (request: GenerationRequest) => ({ text: await impl(request), model: 'fake-model' }));
  const adapter = vi.fn(() => ({ generate }));
  return { opts: { contentDir: dir, adapter, sleep: async () => {} } satisfies BriefOptions, generate, adapter };
}
const saved = (dir: string, id = VOC) => join(dir, 'briefs', id + '.json');

describe('offline brief authoring', () => {
  it.each([VOC, GRAM])('saves validated multilingual %s with trusted provenance and reuses it without configuration', async (id) => {
    const dir = setup();
    const { opts, generate } = options(dir, async () => output(id));
    expect(await generateBrief(id, opts)).toEqual({ id, status: 'generated', message: 'model fake-model' });
    const artifact = JSON.parse(readFileSync(saved(dir, id), 'utf8'));
    expect(artifact.provenance.inputHashes.outline).toBe(catalogContexts(dir).find((c) => c.entry.id === id)?.outlineHash);
    expect(artifact.provenance).toMatchObject({ model: 'fake-model', generator: 'lesson-prototype', promptVersion: 'brief-v2' });
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

  it('runs a batch with staggered parallel workers and keeps outcomes in outline order', async () => {
    const dir = setup([VOC, GRAM]);
    let active = 0;
    let peak = 0;
    const { opts } = options(dir, async (request) => {
      peak = Math.max(peak, ++active);
      await new Promise((done) => setTimeout(done, 10));
      active--;
      return output(request.prompt.includes(VOC) ? VOC : GRAM);
    });
    const sleep = vi.fn(async () => {});
    const outcomes = await generateMissingBriefs({ ...opts, sleep, concurrency: 4, staggerMs: 30_000 });
    expect(outcomes.map((r) => [r.id, r.status])).toEqual([[VOC, 'generated'], [GRAM, 'generated']]);
    expect(peak).toBe(2);
    expect(sleep.mock.calls).toEqual([[30_000]]);
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
    writeFileSync(env, 'GEMINI_API_KEY=fake-secret\nGEMINI_API_KEY10=fake-tenth\nGEMINI_API_KEY2=fake-second\nGEMINI_API_KEY3=\nGEMINI_MODEL=fake-model, models/fake-fallback\n');
    expect(loadConfig(env)).toEqual({ apiKey: 'fake-secret', fallbackApiKeys: ['fake-second', 'fake-tenth'], model: 'fake-model', fallbackModels: ['fake-fallback'] });
  });

  it('reads batch concurrency and worker stagger with safe defaults', () => {
    const dir = setup();
    const env = join(dir, '.env');
    expect(loadBatchConfig(env)).toEqual({ concurrency: 1, staggerMs: 30_000 });
    writeFileSync(env, 'GEMINI_CONCURRENCY=3\nGEMINI_WORKER_STAGGER_S=10\n');
    expect(loadBatchConfig(env)).toEqual({ concurrency: 3, staggerMs: 10_000 });
    writeFileSync(env, 'GEMINI_CONCURRENCY=0\n');
    expect(() => loadBatchConfig(env)).toThrow('GEMINI_CONCURRENCY must be a whole number');
  });

  it('sends structured output schema and authenticates via header; omits thought text', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ candidates: [{
      finishReason: 'STOP', content: { parts: [{ thought: true, text: 'reasoning' }, { text: output(VOC) }] },
    }] })));
    const schema = structuredSchema('vocabulary', 'fr');
    const result = await geminiAdapter({ apiKey: 'fake-secret', model: 'fake-model' }, fetcher).generate({ prompt: 'test', schema });
    expect(result).toEqual({ text: output(VOC), model: 'fake-model' });
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
    const adapter = geminiAdapter({ apiKey: 'fake-secret', model: 'fake-model' }, fetcher, async () => {});
    const error = await adapter.generate({ prompt: 'test', schema: {} }).catch((e: unknown) => e) as GenerationError;
    expect(error.message).toBe('Gemini returned HTTP ' + status + '.');
    expect(error.retryable).toBe(status === 429 || status >= 500);
  });

  it('tries every key three times per model before falling back to the next model', async () => {
    const ok = () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{}' }] } }] }));
    const failures: Record<string, number[]> = { 'best/k1': [429, 429, 429], 'best/k2': [503, 503, 503], 'next/k1': [503, 500] };
    const fetcher = vi.fn<typeof fetch>(async (url, init) => {
      const pair = `${/models\/([^:]+):/.exec(String(url))![1]}/${(init?.headers as Record<string, string>)['x-goog-api-key']}`;
      const code = failures[pair]?.shift();
      return code ? new Response('', { status: code }) : ok();
    });
    const sent = () => fetcher.mock.calls.map(([url, init]) => `${/models\/([^:]+):/.exec(String(url))![1]}/${(init?.headers as Record<string, string>)['x-goog-api-key']}`);
    const sleep = vi.fn(async () => {});
    const report = vi.fn();
    const adapter = geminiAdapter({ apiKey: 'k1', fallbackApiKeys: ['k2'], model: 'best', fallbackModels: ['next'] }, fetcher, sleep, report);
    await expect(adapter.generate({ prompt: 'test', schema: {} })).resolves.toEqual({ text: '{}', model: 'next' });
    expect(sent()).toEqual(['best/k1', 'best/k1', 'best/k1', 'best/k2', 'best/k2', 'best/k2', 'next/k1', 'next/k1', 'next/k1']);
    expect(sleep.mock.calls).toEqual([[5000], [15000], [5000], [15000], [5000], [15000]]);
    expect(report).toHaveBeenCalledWith('  best/k1'.replace('/k1', ', key 1, attempt 1/3: HTTP 429'));
    // Quota exhausted on every attempt is skipped later; an overloaded key is tried again.
    failures['best/k2'] = [503, 503, 503];
    fetcher.mockClear();
    await expect(adapter.generate({ prompt: 'test', schema: {} })).resolves.toEqual({ text: '{}', model: 'next' });
    expect(sent()).toEqual(['best/k2', 'best/k2', 'best/k2', 'next/k1']);
    const exhausted = geminiAdapter({ apiKey: 'k1', fallbackApiKeys: ['k2'], model: 'best' }, async () => new Response('', { status: 429 }), async () => {});
    await expect(exhausted.generate({ prompt: 'test', schema: {} })).rejects.toThrow('HTTP 429');
    await expect(exhausted.generate({ prompt: 'test', schema: {} })).rejects.toThrow('quota is exhausted');
    const invalid = vi.fn<typeof fetch>(async () => new Response('', { status: 400 }));
    await expect(geminiAdapter({ apiKey: 'k1', fallbackApiKeys: ['k2'], model: 'best', fallbackModels: ['next'] }, invalid).generate({ prompt: 'test', schema: {} })).rejects.toThrow('HTTP 400');
    expect(invalid).toHaveBeenCalledTimes(1);
  });

  it('prepares exactly the first ten grammar and vocabulary entries of fr/A1 in outline order', () => {
    const ids = sampleContexts(join(ROOT, 'content')).map((ctx) => ctx.entry.id);
    expect(ids.filter((id) => ['fr-subject-pronouns', 'fr-regular-noun-plurals', 'fr-alphabet-and-accents', 'fr-days-of-the-week'].includes(id))).toEqual(['fr-subject-pronouns', 'fr-alphabet-and-accents', 'fr-days-of-the-week', 'fr-regular-noun-plurals']);
    expect(ids).toHaveLength(20);
    expect(() => sampleContexts(setup())).toThrow('10 grammar and 10 vocabulary');
  });

  it('sanitizes network exceptions and rejects truncated, blocked or empty output', async () => {
    const request = { prompt: 'test', schema: {} };
    const config = { apiKey: 'fake-secret', model: 'fake-model' };
    await expect(geminiAdapter(config, async () => { throw new Error('fake-secret'); }, async () => {}).generate(request)).rejects.toThrow('network request failed');
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
