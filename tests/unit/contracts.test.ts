// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPlan, type LessonPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { isListeningPage, lessonResults, progress, scoreUnit, sessionReducer, startSession, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import { rendererRegistry } from '../../src/session/renderers.tsx';

/**
 * P1-10 contract review: every authored sample lesson must run through the shared plan,
 * session host and scorers in both mother tongues before category work starts.
 */
const ROOT = resolve(import.meta.dirname, '../..');
const IDS = readdirSync(join(ROOT, 'content/lessons')).map((f) => f.replace(/\.json$/, '')).sort();
const read = (dir: string, id: string) => JSON.parse(readFileSync(join(ROOT, 'content', dir, `${id}.json`), 'utf8'));
const planOf = (id: string, motherTongue: 'en' | 'de') => {
  const content = read('lessons', id), brief = read('briefs', id);
  return buildPlan(contentSchema(content.kind, 'fr').parse(content), briefSchema(brief.kind, 'fr').parse(brief), motherTongue);
};
const key = (u: PlanUnit): UnitResponse =>
  u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] };

/** Reveals every flashcard of the active page, as a learner must before Continue (P2-02). */
function revealPage(plan: LessonPlan, r: SessionRecord): SessionRecord {
  const page = plan.pages[r.pageIndex];
  for (const item of page.items) if (item.type === 'vocabulary_flashcards') for (const key of item.targetIds) r = sessionReducer(plan, r, { type: 'reveal', itemKey: `${page.pageId}/${item.itemId}`, key, now: 0 });
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

it('reviews all twenty first-ten samples, both categories', () => {
  expect(IDS).toHaveLength(20);
  expect(new Set(IDS.map((id) => read('lessons', id).kind))).toEqual(new Set(['vocabulary', 'grammar']));
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
  const content = read('lessons', 'fr-family-members'), brief = read('briefs', 'fr-family-members');
  const plan = buildPlan(contentSchema('vocabulary', 'fr').parse(content), briefSchema('vocabulary', 'fr').parse(brief), 'en', { interleaveGroups: true });
  const kinds = plan.pages.slice(0, 4).map((p) => p.items[0].type);
  expect(kinds).toEqual(['vocabulary_introduction', 'vocabulary_flashcards', 'vocabulary_introduction', 'vocabulary_flashcards']);
  const [intro1, cards1] = plan.pages;
  expect(cards1.items[0].type === 'vocabulary_flashcards' && cards1.items[0].targetIds).toEqual(intro1.items[0].type === 'vocabulary_introduction' && intro1.items[0].targetIds);
  expect(plan.pages.map((p) => p.index)).toEqual(plan.pages.map((_, n) => n));
  expect(lessonResults(plan, play(plan, key)).total).toBe(100);
});
