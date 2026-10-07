// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPlan, seededOrder, type LessonPlan } from '../../src/domain/session/plan.ts';
import { headerScore, lessonResults, progress, scoreUnit, sessionReducer, startSession, type SessionAction, type SessionRecord } from '../../src/domain/session/session.ts';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/content');
const load = (dir: string, id: string) => JSON.parse(readFileSync(join(FIXTURES, dir, `${id}.json`), 'utf8'));
const VOC = 'fr-classroom-objects';
const GRAM = 'fr-verb-etre-present';

function setup(id = VOC) {
  const plan = buildPlan(load('lessons', id), load('briefs', id), 'en');
  let record = startSession(plan, { sessionId: 's1', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 7, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  const page = () => plan.pages[record.pageIndex];
  const proceed = (now = 0) => {
    for (const item of page().items) if (item.type === 'vocabulary_flashcards') for (const key of item.targetIds) act({ type: 'reveal', itemKey: `${page().pageId}/${item.itemId}`, key, now });
    return act({ type: 'continue', now, interfaceLanguage: 'en' });
  };
  /** Answers every unit of the current page correctly (or with `answer`). */
  const answerAll = (answer?: (unitId: string) => unknown, now = 0) => {
    for (const u of page().units) {
      const right = u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] };
      act({ type: 'draft', unitId: u.id, response: (answer?.(u.id) ?? right) as never, now });
    }
  };
  return { plan, act, page, proceed, answerAll, get record(): SessionRecord { return record; } };
}

describe('lesson plan', () => {
  it('flattens concrete pages with roles and scorable units', () => {
    const { plan } = setup();
    expect(plan.pages.map((p) => [p.pageId, p.role, p.units.length])).toEqual([
      ['intro-1', 'presentation', 0], ['cards-1', 'presentation', 0], ['match-1', 'practice', 4], ['gender-1', 'practice', 4],
      ['gap-livre', 'practice', 1], ['gap-chaise', 'practice', 1], ['gap-stylo', 'practice', 1], ['gap-table', 'practice', 1],
      ['exam-1', 'exam', 2], ['exam-2', 'exam', 2],
    ]);
    const exam = plan.pages[8].units[0];
    expect(exam.prompt.native).toBe('a book');
    const grammar = setup(GRAM).plan;
    expect(grammar.pages.find((p) => p.role === 'exam')?.timeLimitS).toBe(90);
    expect(new Set(grammar.pages.flatMap((p) => p.units.map((u) => u.kind)))).toEqual(new Set(['choice', 'text', 'spot']));
  });

  it('shuffles deterministically from the session seed', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    expect(seededOrder(list, 7, 'unit')).toEqual(seededOrder(list, 7, 'unit'));
    expect(seededOrder(list, 7, 'unit').sort()).toEqual(list);
    expect([1, 2, 3, 4].some((seed) => seededOrder(list, seed, 'unit').join() !== list.join())).toBe(true);
  });
});

describe('one Continue action', () => {
  it('locks practice answers with feedback, then confirms and advances; locked points are immutable', () => {
    const s = setup();
    s.proceed();
    s.proceed();
    expect(s.page().pageId).toBe('match-1');
    s.proceed();
    expect(s.record.phase).toBe('answering'); // empty answers keep Continue disabled
    s.answerAll((id) => (id.endsWith('/livre') ? 'chaise' : undefined));
    s.proceed();
    expect(s.record.phase).toBe('feedback');
    expect(s.page().pageId).toBe('match-1');
    const livre = s.page().units[0].id;
    expect(s.record.locked[livre]).toMatchObject({ outcome: 'incorrect', points: 0 });
    s.act({ type: 'draft', unitId: livre, response: 'livre', now: 0 });
    expect(s.record.locked[livre].points).toBe(0);
    s.proceed();
    expect(s.page().pageId).toBe('gender-1');
    expect(s.record.locked[livre].points).toBe(0);
  });

  it('gives half credit for accent/case-only typing and none for wrong words', () => {
    const { plan } = setup();
    const unit = plan.pages[8].units[0];
    expect(scoreUnit(unit, 'un livre')).toEqual({ outcome: 'fully_correct', points: 1 });
    expect(scoreUnit(unit, 'Un livre')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(unit, 'une livre')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(unit, '  ')).toEqual({ outcome: 'unanswered', points: 0 });
  });
});

describe('progress, header score and exam timing', () => {
  it('weights progress by page duration and hides exam points until the exam is complete', () => {
    const s = setup();
    s.proceed(); // intro 60 s
    expect(progress(s.plan, s.record)).toBeCloseTo((100 * 60) / 470);
    s.proceed(); // cards 90 s
    for (let i = 0; i < 6; i++) {
      s.answerAll();
      s.proceed();
      expect(progress(s.plan, s.record)).toBeLessThan(100); // awaiting confirmation is not complete
      s.proceed();
    }
    expect(s.page().pageId).toBe('exam-1');
    expect(headerScore(s.plan, s.record)).toBeCloseTo(35);
    s.answerAll(() => 'faux', 1000);
    s.proceed(1000);
    expect(headerScore(s.plan, s.record)).toBeCloseTo(35); // no exam feedback during the exam
    s.answerAll(undefined, 2000);
    s.proceed(2000);
    expect(s.record.phase).toBe('results');
    expect(progress(s.plan, s.record)).toBe(100);
    expect(headerScore(s.plan, s.record)).toBeCloseTo(35 + 65 / 2);
    expect(lessonResults(s.plan, s.record)).toMatchObject({ practiceScore: 100, examScore: 50, total: 67.5 });
  });

  it('starts each exam countdown from the brief limit and locks drafts once at the deadline', () => {
    const s = setup();
    while (s.page().role !== 'exam') {
      if (s.page().role === 'practice') s.answerAll();
      s.proceed(5_000);
      if (s.record.phase === 'feedback') s.proceed(5_000);
    }
    expect(s.record.exam['exam-1']).toEqual({ startedAt: 5_000, deadline: 65_000, timedOut: false });
    const [first, second] = s.page().units;
    s.act({ type: 'draft', unitId: first.id, response: 'un livre', now: 30_000 });
    s.act({ type: 'expire', now: 64_999, interfaceLanguage: 'en' });
    expect(s.page().pageId).toBe('exam-1');
    s.act({ type: 'draft', unitId: second.id, response: 'une chaise', now: 65_000 }); // after the deadline: ignored
    s.proceed(65_001); // a late Continue resolves as the timeout, once
    s.act({ type: 'expire', now: 65_002, interfaceLanguage: 'en' });
    expect(s.page().pageId).toBe('exam-2');
    expect(s.record.locked[first.id]).toMatchObject({ outcome: 'fully_correct', points: 1, timedOut: true });
    expect(s.record.locked[second.id]).toMatchObject({ outcome: 'unanswered', points: 0, timedOut: true });
    expect(s.record.exam['exam-1'].timedOut).toBe(true);
    expect(s.record.exam['exam-2'].deadline).toBe(65_001 + 60_000);
  });

  it('weights practice 35% and exam 65% regardless of item counts', () => {
    const plan = {
      pages: [
        { pageId: 'p', role: 'practice', units: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}` })) },
        { pageId: 'e', role: 'exam', units: Array.from({ length: 10 }, (_, i) => ({ id: `e${i}` })) },
      ],
      steps: [],
    } as unknown as LessonPlan;
    const locked = Object.fromEntries([
      ...[0, 1, 2, 3].map((i) => [`p${i}`, { points: 1 }]),
      ...[0, 1, 2, 3, 4, 5].map((i) => [`e${i}`, { points: 1 }]),
    ]);
    const results = lessonResults(plan, { locked, completed: [] } as unknown as SessionRecord);
    expect(results.practiceScore).toBe(80);
    expect(results.examScore).toBe(60);
    expect(results.total).toBeCloseTo(67);
  });

  it('selects results without changing responses, scores or progress', () => {
    const s = setup();
    s.act({ type: 'select', selection: 'match' });
    expect(s.record.selection).toBe('exam'); // only on the results page
    while (s.record.phase !== 'results') {
      if (s.page().role !== 'presentation' && s.record.phase === 'answering') s.answerAll();
      s.proceed();
    }
    const before = { locked: s.record.locked, completed: s.record.completed };
    s.act({ type: 'select', selection: 'match' });
    expect(s.record.selection).toBe('match');
    expect({ locked: s.record.locked, completed: s.record.completed }).toEqual(before);
  });
});

describe('contract additions from the P1-10 review', () => {
  it('keeps revealed flashcards for resume, only on the active page and without duplicates', () => {
    const s = setup();
    while (!s.page().items.some((it) => it.type === 'vocabulary_flashcards')) s.proceed();
    const item = s.page().items[0];
    const itemKey = `${s.page().pageId}/${item.itemId}`;
    if (item.type !== 'vocabulary_flashcards') throw new Error('Expected flashcards');
    s.act({ type: 'reveal', itemKey, key: item.targetIds[0], now: 5 });
    const once = s.record;
    s.act({ type: 'reveal', itemKey, key: item.targetIds[0], now: 6 });
    expect(s.record).toBe(once);
    s.act({ type: 'reveal', itemKey: 'other-page/x', key: 'y', now: 7 });
    expect(s.record).toBe(once);
    expect(structuredClone(s.record).revealed).toEqual({ [itemKey]: [item.targetIds[0]] });
  });

  it('carries the assessed grammar rule IDs on every grammar unit', () => {
    const { plan } = setup(GRAM);
    const graded = plan.pages.flatMap((p) => p.units);
    expect(graded.length).toBeGreaterThan(0);
    expect(graded.every((u) => u.ruleIds && u.ruleIds.length > 0)).toBe(true);
    expect(setup().plan.pages.flatMap((p) => p.units).every((u) => u.ruleIds === undefined)).toBe(true);
  });
});

describe('matching feedback (P2-02)', () => {
  const toMatching = () => {
    const s = setup();
    while (!s.page().items.some((it) => it.type === 'vocabulary_matching')) s.proceed();
    return s;
  };
  it('skips the correction view when every pair is correct', () => {
    const s = toMatching();
    const matching = s.page().pageId;
    s.answerAll();
    s.proceed();
    expect(s.record.phase).toBe('answering');
    expect(s.page().pageId).not.toBe(matching);
    expect(s.record.completed).toContain(matching);
  });
  it('shows the correction view when a pair is wrong', () => {
    const s = toMatching();
    const units = s.page().units;
    s.answerAll((id) => (id === units[0].id ? (units[1] as { correct: string[] }).correct[0] : undefined));
    s.proceed();
    expect(s.record.phase).toBe('feedback');
  });
});
