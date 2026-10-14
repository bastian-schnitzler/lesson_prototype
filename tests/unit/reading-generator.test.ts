// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BriefOptions } from '../../generator/briefs.ts';
import { generateLesson } from '../../generator/content.ts';
import type { GenerationRequest } from '../../generator/gemini.ts';
import { briefPrompt, payloadSchema } from '../../generator/prompts.ts';
import { READING_BRIEF_PROMPT_VERSION, READING_CONTENT_PROMPT_VERSION } from '../../generator/readingPrompts.ts';
import { scanContentDir } from '../../scripts/catalog.ts';

/** Reading generation (reading-brief-v2 / reading-content-v2) with a fake model replaying an authored lesson; no paid calls. */
const ROOT = resolve(import.meta.dirname, '../..');
const ID = 'fr-reading-a-text-message';
type Json = any;
const read = (dir: string): Json => JSON.parse(readFileSync(join(ROOT, 'content', dir, `${ID}.json`), 'utf8'));
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** A content directory with the lesson's real outline entry only. */
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'lesson-reading-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'outlines'));
  const outline = JSON.parse(readFileSync(join(ROOT, 'content/outlines/fr-a1.json'), 'utf8'));
  outline.entries = outline.entries.filter((entry: { id: string }) => entry.id === ID);
  writeFileSync(join(dir, 'outlines/fr-a1.json'), JSON.stringify(outline));
  return dir;
}

/** The model's brief: the authored brief without the locally supplied fields. */
function briefPayload() {
  const { schemaVersion: _s, id: _i, lang: _l, level: _v, locales: _o, provenance: _p, ...rest } = read('briefs');
  return rest;
}

/** The model's lesson section, taken apart from the authored lesson. */
function lessonPayload() {
  const content = read('lessons');
  const items = (stage: string) => content.steps.find((s: Json) => s.stage === stage).pages.flatMap((p: Json) => p.items).filter((i: Json) => i.type !== 'reading_document');
  const [main, exam] = content.documents.map(({ documentId: _d, genre: _g, ...doc }: Json) => doc);
  const { type: _t, itemId: _i, focus: _f, ...skim } = items('skim')[0];
  const { itemId: _s, ...task } = items('structure')[0];
  return {
    documents: { main, exam },
    keywordMatching: items('keywords').find((i: Json) => i.type === 'reading_keyword_matching').pairs,
    skim,
    detail: items('detail'),
    structure: { instructions: content.steps.find((s: Json) => s.stage === 'structure').pages[0].instructions, task },
    exam: content.steps.find((s: Json) => s.stage === 'exam').pages.map((p: Json) => ({ pageId: p.pageId, items: p.items.filter((i: Json) => i.type !== 'reading_document').map(({ itemId: _x, ...q }: Json) => q) })),
  };
}

function options(dir: string, respond: (request: GenerationRequest) => unknown) {
  const generate = vi.fn(async (request: GenerationRequest) => ({ text: JSON.stringify(respond(request)), model: 'fake-model' }));
  return { opts: { contentDir: dir, adapter: () => ({ generate }), sleep: async () => {} } satisfies BriefOptions, generate };
}

describe('reading generation', () => {
  it('asks for the reading brief with its own rules and 30 / 70 scoring', () => {
    const outline = JSON.parse(readFileSync(join(ROOT, 'content/outlines/fr-a1.json'), 'utf8'));
    const entry = outline.entries.find((e: { id: string }) => e.id === ID);
    const prompt = briefPrompt({ entry, lang: 'fr', level: 'A1' });
    expect(prompt).toContain('practiceWeight 30, examWeight 70');
    expect(prompt).toContain('skimSeconds exactly 45');
    expect(prompt).not.toContain('teaching blocks');
    expect(payloadSchema('reading', 'fr').safeParse(briefPayload()).success).toBe(true);
  });

  it('generates a valid brief, then a valid lesson in one section, with the reading prompt versions', async () => {
    const dir = setup();
    const { opts, generate } = options(dir, (request) => (/Section "lesson"/.test(request.prompt) ? lessonPayload() : briefPayload()));
    const outcome = await generateLesson(ID, opts);
    expect(outcome).toMatchObject({ id: ID, status: 'generated', brief: 'generated' });
    expect(generate).toHaveBeenCalledTimes(2);
    const brief = JSON.parse(readFileSync(join(dir, 'briefs', `${ID}.json`), 'utf8'));
    const content = JSON.parse(readFileSync(join(dir, 'lessons', `${ID}.json`), 'utf8'));
    expect(brief.provenance.promptVersion).toBe(READING_BRIEF_PROMPT_VERSION);
    expect(content.provenance.promptVersion).toBe(READING_CONTENT_PROMPT_VERSION);
    expect(content.steps.map((s: Json) => s.stage)).toEqual(['keywords', 'skim', 'detail', 'structure', 'exam']);
    expect(content.steps[0].pages.map((p: Json) => p.estimatedDurationS)).toEqual([45, 45]);
    const manifest = scanContentDir(dir).manifest.artifacts[ID];
    expect([manifest.draft?.status, manifest.content?.status]).toEqual(['valid', 'valid']);
  });

  it('repairs the lesson section when a document is too long for the level', async () => {
    const dir = setup();
    let calls = 0;
    const { opts } = options(dir, (request) => {
      if (!/Section "lesson"/.test(request.prompt)) return briefPayload();
      const lesson = lessonPayload();
      if (calls++ === 0) lesson.documents.exam.parts[0].segments.push({ segmentId: 'x-s9', text: 'Après le pique-nique, on prend une glace au kiosque près du lac, puis on rentre ensemble en vélo.', value: null });
      return lesson;
    });
    expect((await generateLesson(ID, opts)).status).toBe('generated');
    expect(calls).toBe(2);
  });
});
