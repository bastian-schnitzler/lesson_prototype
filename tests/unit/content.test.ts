// @vitest-environment node
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BriefOptions } from '../../generator/briefs.ts';
import { generateLesson, splitDuration } from '../../generator/content.ts';
import { GenerationError, type GenerationRequest } from '../../generator/gemini.ts';
import { scanContentDir } from '../../scripts/catalog.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURES = join(ROOT, 'tests/fixtures/content');
const VOC = 'fr-classroom-objects';
const GRAM = 'fr-verb-etre-present';
const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

/** Temporary content directory with the fixture outline and briefs, but no lessons. */
function setup(ids = [VOC, GRAM]) {
  const dir = mkdtempSync(join(tmpdir(), 'lesson-content-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'outlines'));
  mkdirSync(join(dir, 'briefs'));
  const outline = JSON.parse(readFileSync(join(FIXTURES, 'outlines/fr-a1.json'), 'utf8'));
  outline.entries = outline.entries.filter((entry: { id: string }) => ids.includes(entry.id));
  writeFileSync(join(dir, 'outlines/fr-a1.json'), JSON.stringify(outline));
  for (const id of ids) cpSync(join(FIXTURES, 'briefs', `${id}.json`), join(dir, 'briefs', `${id}.json`));
  return dir;
}

const fixture = (dir: string, id: string) => JSON.parse(readFileSync(join(FIXTURES, dir, `${id}.json`), 'utf8'));
type Item = Record<string, unknown> & { type: string; targetId?: string; itemId: string };
const items = (lesson: { steps: { pages: { items: Item[] }[] }[] }) => lesson.steps.flatMap((s) => s.pages.flatMap((p) => p.items));
const withoutId = ({ itemId: _, ...rest }: Item) => rest;

/** Section responses reconstructed from the reviewed fixture lessons. */
function sectionResponses(id: string): Record<string, unknown> {
  const brief = fixture('briefs', id);
  const all = items(fixture('lessons', id));
  const of = (type: string) => all.filter((it) => it.type === type);
  if (id === VOC) {
    const intro = of('vocabulary_introduction')[0];
    const pairs = new Map((of('vocabulary_matching') as unknown as { pairs: { targetId: string; nativeLabel: unknown; answerExplanation: unknown }[] }[]).flatMap((m) => m.pairs).map((p) => [p.targetId, p]));
    const rows = new Map((of('vocabulary_gender_select')[0] as unknown as { rows: { targetId: string; answerExplanation: unknown }[] }).rows.map((r) => [r.targetId, r]));
    return {
      introduction: { groups: brief.groups.map((g: { id: string }) => ({ groupId: g.id, text: intro.text })) },
      words: { targets: brief.targets.map((t: { id: string }) => ({ targetId: t.id, matchingLabel: pairs.get(t.id)!.nativeLabel, matchingExplanation: pairs.get(t.id)!.answerExplanation, genderExplanation: rows.get(t.id)?.answerExplanation ?? null })) },
      practice: { typedGaps: of('vocabulary_typed_gap').map(({ itemId: _, type: __, ...gap }) => gap), listening: [] },
      exam: { translation: of('vocabulary_translation_exam').map((it) => ({ targetId: it.targetId, prompt: it.prompt, extraAnswers: [], answerExplanation: it.answerExplanation })), dictation: [] },
    };
  }
  const steps = fixture('lessons', id).steps as { role: string; blockId: string | null; pages: { pageId: string; items: Item[] }[] }[];
  const exercises = (blockId: string) => steps.filter((s) => s.role === 'exercise' && s.blockId === blockId);
  const responses: Record<string, unknown> = {};
  for (const block of brief.blocks as { id: string; exercises: { id: string }[] }[]) {
    const fixtureBlock = block.id;
    const explanation = steps.find((s) => s.role === 'explanation' && s.blockId === fixtureBlock)!.pages[0].items[0];
    const { itemId: _, type: __, ruleIds: ___, ...text } = explanation;
    responses[`block-${block.id}`] = {
      explanation: text,
      exercises: block.exercises.map((ex, n) => ({ exerciseId: ex.id, items: exercises(fixtureBlock)[n].pages.flatMap((p) => p.items.map(withoutId)) })),
    };
  }
  const exam = steps.find((s) => s.role === 'exam')!;
  responses.exam = { pages: exam.pages.map((p) => ({ pageId: p.pageId, items: p.items.map(withoutId) })) };
  return responses;
}

function options(dir: string, respond: (section: string, request: GenerationRequest, id: string) => unknown) {
  const generate = vi.fn(async (request: GenerationRequest) => {
    const section = /Section "([^"]+)"/.exec(request.prompt)?.[1] ?? '';
    const id = request.label!.split('/')[0];
    return { text: JSON.stringify(respond(section, request, id)), model: 'fake-model' };
  });
  return { opts: { contentDir: dir, adapter: () => ({ generate }), sleep: async () => {} } satisfies BriefOptions, generate };
}

describe('offline lesson content generation', () => {
  it.each([VOC, GRAM])('assembles validated %s content from sections and reuses it without model calls', async (id) => {
    const dir = setup();
    const responses = sectionResponses(id);
    const { opts, generate } = options(dir, (section) => responses[section]);
    await expect(generateLesson(id, opts)).resolves.toMatchObject({ id, status: 'generated', brief: 'reused' });
    expect(generate).toHaveBeenCalledTimes(Object.keys(responses).length);
    const manifest = scanContentDir(dir).manifest.artifacts[id];
    expect(manifest.content?.status).toBe('valid');
    const lesson = JSON.parse(readFileSync(join(dir, 'lessons', `${id}.json`), 'utf8'));
    expect(lesson.provenance).toMatchObject({ model: 'fake-model', promptVersion: 'content-v1' });
    generate.mockClear();
    await expect(generateLesson(id, opts)).resolves.toMatchObject({ status: 'reused', brief: 'reused' });
    expect(generate).not.toHaveBeenCalled();
  });

  it('assembles brief-determined parts locally and copies exam limits from the brief', async () => {
    const dir = setup();
    const responses = sectionResponses(VOC);
    const { opts } = options(dir, (section) => responses[section]);
    await generateLesson(VOC, opts);
    const lesson = JSON.parse(readFileSync(join(dir, 'lessons', `${VOC}.json`), 'utf8'));
    const brief = fixture('briefs', VOC);
    expect(lesson.steps.map((s: { stage: string }) => s.stage)).toEqual(['introduction', 'flashcards', 'matching', 'overview', 'practice', 'exam']);
    expect(lesson.steps[1].pages[0].items[0]).toEqual({ type: 'vocabulary_flashcards', itemId: `cards-${brief.groups[0].id}`, targetIds: brief.groups[0].targetIds });
    expect(lesson.steps[5].pages.map((p: { timeLimitS: number }) => p.timeLimitS)).toEqual(brief.plan.exam.pages.map((p: { timeLimitS: number }) => p.timeLimitS));
    expect(lesson.steps[5].pages[0].items[0].accepted.answers).toContain(brief.targets.find((t: { id: string }) => t.id === lesson.steps[5].pages[0].items[0].targetId).examForms[0]);
  });

  it('repairs only the section that failed validation, within its three-call budget', async () => {
    const dir = setup();
    const responses = sectionResponses(GRAM);
    let broken = true;
    const { opts, generate } = options(dir, (section, request) => {
      if (section !== 'exam' || !broken) return responses[section];
      broken = false;
      expect(request.prompt).not.toContain('Repair');
      const exam = structuredClone(responses.exam) as { pages: { items: Record<string, unknown>[] }[] };
      exam.pages[0].items.pop();
      return exam;
    });
    await expect(generateLesson(GRAM, opts)).resolves.toMatchObject({ status: 'generated' });
    const calls = generate.mock.calls.map(([r]) => /Section "([^"]+)"/.exec(r.prompt)![1]);
    expect(calls).toEqual(['block-b-singular', 'block-b-plural', 'exam', 'exam']);
    expect(generate.mock.calls[3][0].prompt).toContain('Repair the previous attempt');
  });

  it('prepares a missing brief before the content', async () => {
    const dir = setup([GRAM]);
    rmSync(join(dir, 'briefs', `${GRAM}.json`));
    const brief = fixture('briefs', GRAM);
    for (const key of ['schemaVersion', 'id', 'lang', 'level', 'locales', 'provenance']) delete brief[key];
    const responses = sectionResponses(GRAM);
    const { opts, generate } = options(dir, (section) => (section ? responses[section] : brief));
    await expect(generateLesson(GRAM, opts)).resolves.toMatchObject({ status: 'generated', brief: 'generated' });
    expect(generate).toHaveBeenCalledTimes(1 + Object.keys(responses).length);
    expect(scanContentDir(dir).manifest.artifacts[GRAM].content?.status).toBe('valid');
  });

  it('keeps the valid brief and leaves no lesson when content generation fails', async () => {
    const dir = setup();
    const { opts } = options(dir, () => { throw new GenerationError('Gemini returned HTTP 403.'); });
    await expect(generateLesson(VOC, opts)).rejects.toThrow('HTTP 403');
    expect(scanContentDir(dir).manifest.artifacts[VOC].draft?.status).toBe('valid');
    expect(scanContentDir(dir).manifest.artifacts[VOC].content).toBeUndefined();
  });

  it('splits planned durations into whole pages of at least five seconds', () => {
    expect(splitDuration(100, 3)).toEqual([34, 33, 33]);
    expect(splitDuration(8, 3)).toEqual([5, 5, 5]);
  });
});
