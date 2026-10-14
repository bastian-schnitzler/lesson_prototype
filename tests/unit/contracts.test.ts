// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type LessonPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { isListeningPage, lessonResults, progress, requiredReveals, scoreUnit, sessionReducer, startSession, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import { rendererRegistry } from '../../src/session/renderers.tsx';

/**
 * P1-10 contract review: every authored sample lesson must run through the shared plan,
 * session host and scorers in both mother tongues before category work starts.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const IDS = readdirSync(join(ROOT, 'content/briefs')).map((f) => f.replace(/\.json$/, '')).sort();
const read = (dir: string, id: string) => JSON.parse(readFileSync(join(ROOT, 'content', dir, `${id}.json`), 'utf8'));
const planOf = (id: string, motherTongue: 'en' | 'de') => {
  // Vocabulary lessons are derived from the brief (P2-04); grammar and function lessons are parsed from their content file.
  const content = lessonOf(join(ROOT, 'content'), id), brief = read('briefs', id);
  return buildPlan(brief.kind === 'vocabulary' ? content : contentSchema(content.kind, 'fr').parse(content), briefSchema(brief.kind, 'fr').parse(brief), motherTongue);
};
const key = (u: PlanUnit): UnitResponse =>
  u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] };

/** Reveals every flashcard and dialogue line of the active page, as a learner must before Continue (P2-02, P4-04). */
function revealPage(plan: LessonPlan, r: SessionRecord): SessionRecord {
  for (const { itemKey, keys } of requiredReveals(plan.pages[r.pageIndex])) for (const key of keys) r = sessionReducer(plan, r, { type: 'reveal', itemKey, key, now: 0 });
  return r;
}

/** A wrong but complete response; practice Continue requires every unit to be answered. */
const wrong = (u: PlanUnit): UnitResponse =>
  u.kind === 'text' ? 'zzz' : u.kind === 'choice' ? u.options.find((o) => !u.correct.includes(o.id))!.id
    : u.kind === 'order' ? [...u.tokens].reverse().map((t) => t.id) : { tokenId: u.tokens.find((t) => t.id !== u.faultyTokenId)!.id, text: 'zzz' };

/** Plays one attempt, answering every unit with `respond`; returns the completed record. */
function play(plan: LessonPlan, respond: (u: PlanUnit, role: string) => UnitResponse | undefined) {
  let r = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 7, now: 0 });
  for (let guard = 0; r.status !== 'completed'; guard++) {
    if (guard > 1000) throw new Error('session did not complete');
    const page = plan.pages[r.pageIndex];
    if (r.phase === 'answering') for (const u of page.units) {
      const response = respond(u, page.role);
      if (response !== undefined) r = sessionReducer(plan, r, { type: 'draft', unitId: u.id, response, now: 0 });
    }
    if (isListeningPage(page)) r = sessionReducer(plan, r, { type: 'voice_ready', now: 0 });
    r = revealPage(plan, r);
    const next = sessionReducer(plan, r, { type: 'continue', now: 1, interfaceLanguage: 'en' });
    if (next === r) throw new Error(`Continue is blocked on ${page.pageId}`);
    r = next;
  }
  return r;
}

it('reviews the twenty first-ten samples, the three function test lessons (P4-03) and the sixteen reading lessons', () => {
  expect(IDS).toHaveLength(39);
  expect(IDS.filter((id) => read('briefs', id).kind === 'functions')).toEqual(['fr-asking-the-way', 'fr-greetings-and-goodbyes', 'fr-ordering-at-a-cafe']);
  expect(IDS.filter((id) => read('briefs', id).kind === 'reading')).toHaveLength(16);
});

describe.each(IDS)('%s', (id) => {
  it.each(['en', 'de'] as const)('plans pages, renderers, timers and unit keys consistently (%s)', (motherTongue) => {
    const plan = planOf(id, motherTongue);
    const units = plan.pages.flatMap((p) => p.units);
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
    for (const page of plan.pages) {
      for (const item of page.items) expect(rendererRegistry[item.type], item.type).toBeDefined();
      expect(page.timeLimitS !== null, `${page.pageId} countdown`).toBe(page.role === 'exam');
      // Listening units never share a page with other units (voice gating, D42).
      expect(page.units.some((u) => u.speak) ? isListeningPage(page) : true, page.pageId).toBe(true);
    }
    for (const u of units) expect(scoreUnit(u, key(u)), u.id).toEqual({ outcome: 'fully_correct', points: 1 });
    expect(plan.steps.some((s) => s.role === 'practice')).toBe(true);
    expect(plan.steps.at(-1)?.role).toBe('exam');
  });

  it('completes with 100 when every key is entered and 0 with wrong practice and an empty exam', () => {
    const plan = planOf(id, 'en');
    const best = play(plan, key);
    expect(lessonResults(plan, best).total).toBe(100);
    expect(progress(plan, best)).toBe(100);
    const empty = play(plan, (u, role) => (role === 'practice' ? wrong(u) : undefined));
    expect(lessonResults(plan, empty)).toMatchObject({ total: 0, practice: { earned: 0 }, exam: { earned: 0 } });
  });
});

it('orders a learner session as introduction, flashcards, introduction, flashcards, … and still completes', () => {
  const content = lessonOf(join(ROOT, 'content'), 'fr-family-members'), brief = read('briefs', 'fr-family-members');
  const plan = buildPlan(content, briefSchema('vocabulary', 'fr').parse(brief), 'en', { interleaveGroups: true });
  const kinds = plan.pages.slice(0, 4).map((p) => p.items[0].type);
  expect(kinds).toEqual(['vocabulary_introduction', 'vocabulary_flashcards', 'vocabulary_introduction', 'vocabulary_flashcards']);
  const [intro1, cards1] = plan.pages;
  expect(cards1.items[0].type === 'vocabulary_flashcards' && cards1.items[0].targetIds).toEqual(intro1.items[0].type === 'vocabulary_introduction' && intro1.items[0].targetIds);
  expect(plan.pages.map((p) => p.index)).toEqual(plan.pages.map((_, n) => n));
  expect(lessonResults(plan, play(plan, key)).total).toBe(100);
});

it('puts the exam info page right before the first exam page without changing scores', () => {
  const content = lessonOf(join(ROOT, 'content'), 'fr-classroom-objects'), brief = read('briefs', 'fr-classroom-objects');
  const plan = buildPlan(content, briefSchema('vocabulary', 'fr').parse(brief), 'en', { interleaveGroups: true, examIntro: true });
  const intro = plan.pages.findIndex((p) => p.special === 'examIntro');
  expect(plan.pages[intro]).toMatchObject({ role: 'presentation', units: [], timeLimitS: null });
  expect(plan.pages[intro + 1].role).toBe('exam');
  expect(plan.pages.slice(0, intro).every((p) => p.role !== 'exam')).toBe(true);
  expect(lessonResults(plan, play(plan, key)).total).toBe(100);
});

describe.each(IDS.filter((id) => read('briefs', id).kind === 'vocabulary'))('%s as a learner session', (id) => {
  it('completes all six stages in session order (groups interleaved, exam info page) with 100 and 0', () => {
    const content = lessonOf(join(ROOT, 'content'), id), brief = read('briefs', id);
    const plan = buildPlan(content, briefSchema('vocabulary', 'fr').parse(brief), 'en', { interleaveGroups: true, examIntro: true });
    const stages = new Set(plan.pages.map((p) => p.stepId));
    expect(stages.size).toBe(7); // six stages; stage 5 has a typed-gap and a listening step
    expect(plan.pages.filter((p) => p.special === 'examIntro')).toHaveLength(1);
    expect(lessonResults(plan, play(plan, key)).total).toBe(100);
    expect(lessonResults(plan, play(plan, (u, role) => (role === 'practice' ? wrong(u) : undefined))).total).toBe(0);
  });
});
