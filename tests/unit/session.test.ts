// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, seededOrder, type LessonPlan } from '../../src/domain/session/plan.ts';
import { outline } from '../../src/domain/session/outline.ts';
import { headerScore, isListeningPage, lessonResults, progress, scoreUnit, sessionReducer, skipsFeedbackWhenCorrect, startSession, type SessionAction, type SessionRecord } from '../../src/domain/session/session.ts';

const FIXTURES = resolve(import.meta.dirname, '../fixtures/content');
const load = (dir: string, id: string) => JSON.parse(readFileSync(join(FIXTURES, dir, `${id}.json`), 'utf8'));
const VOC = 'fr-classroom-objects';
const GRAM = 'fr-verb-etre-present';

function setup(id = VOC) {
  const plan = buildPlan(lessonOf(FIXTURES, id), load('briefs', id), 'en');
  let record = startSession(plan, { sessionId: 's1', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 7, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  const page = () => plan.pages[record.pageIndex];
  const proceed = (now = 0) => {
    for (const item of page().items) if (item.type === 'vocabulary_flashcards') for (const key of item.targetIds) act({ type: 'reveal', itemKey: `${page().pageId}/${item.itemId}`, key, now });
    // Every vocabulary lesson has listening pages (P2-04); the test browser has a voice.
    if (isListeningPage(page())) act({ type: 'voice_ready', now });
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
      ['intro-all', 'presentation', 0], ['cards-all', 'presentation', 0], ['match-1', 'practice', 4], ['overview', 'practice', 4],
      ['gap-livre', 'practice', 1], ['gap-chaise', 'practice', 1], ['gap-stylo', 'practice', 1], ['gap-table', 'practice', 1],
      ['listen-livre', 'practice', 1], ['listen-chaise', 'practice', 1], ['listen-stylo', 'practice', 1], ['listen-table', 'practice', 1],
      ['exam-all-1', 'exam', 4], ['dictation-all-1', 'exam', 4],
    ]); // derived from the brief: every word in every exercise (P2-04)
    const exam = plan.pages.find((p) => p.role === 'exam')!.units[0];
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
    expect(s.page().pageId).toBe('overview');
    expect(s.record.locked[livre].points).toBe(0);
  });

  it('gives half credit for accent/case-only typing and none for wrong words', () => {
    const { plan } = setup();
    const unit = plan.pages.find((p) => p.role === 'exam')!.units[0];
    expect(scoreUnit(unit, 'un livre')).toEqual({ outcome: 'fully_correct', points: 1 });
    expect(scoreUnit(unit, 'Un livre')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(unit, 'une livre')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(unit, '  ')).toEqual({ outcome: 'unanswered', points: 0 });
  });
});

describe('progress, header score and exam timing', () => {
  it('weights progress by page duration and hides exam points until the exam is complete', () => {
    const s = setup();
    s.proceed(); // intro 32 s of 432 s (derived durations, P2-04)
    expect(progress(s.plan, s.record)).toBeCloseTo((100 * 32) / 432);
    s.proceed(); // cards 40 s
    while (s.page().role === 'practice') {
      s.answerAll();
      s.proceed();
      // Fully correct matching and typed gaps go straight on; other practice pages await confirmation.
      if (s.record.phase === 'feedback') {
        expect(progress(s.plan, s.record)).toBeLessThan(100);
        s.proceed();
      }
    }
    expect(s.page().pageId).toBe('exam-all-1');
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
    // Four words at 20 s each (derived limit, P2-04).
    expect(s.record.exam['exam-all-1']).toEqual({ startedAt: 5_000, deadline: 85_000, timedOut: false });
    const [first, second] = s.page().units;
    s.act({ type: 'draft', unitId: first.id, response: 'un livre', now: 30_000 });
    s.act({ type: 'expire', now: 84_999, interfaceLanguage: 'en' });
    expect(s.page().pageId).toBe('exam-all-1');
    s.act({ type: 'draft', unitId: second.id, response: 'une chaise', now: 85_000 }); // after the deadline: ignored
    s.act({ type: 'continue', now: 85_001, interfaceLanguage: 'en' }); // a late Continue resolves as the timeout, once
    s.act({ type: 'expire', now: 85_002, interfaceLanguage: 'en' });
    expect(s.page().pageId).toBe('dictation-all-1');
    expect(s.record.locked[first.id]).toMatchObject({ outcome: 'fully_correct', points: 1, timedOut: true });
    expect(s.record.locked[second.id]).toMatchObject({ outcome: 'unanswered', points: 0, timedOut: true });
    expect(s.record.exam['exam-all-1'].timedOut).toBe(true);
    // The dictation countdown (30 s per word) starts once its audio can play.
    expect(s.record.exam['dictation-all-1']).toBeUndefined();
    s.act({ type: 'voice_ready', now: 90_000 });
    expect(s.record.exam['dictation-all-1'].deadline).toBe(90_000 + 120_000);
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

describe('green-and-continue for single-answer pages (P2-04 review)', () => {
  const pages = (id: string) => setup(id).plan.pages;
  it('applies to every practice page whose items each ask for one answer', () => {
    const listening = pages('fr-classroom-instructions').filter((p) => p.units.some((u) => u.itemType === 'vocabulary_listening_choice') && p.role === 'practice');
    expect(listening.length).toBeGreaterThan(0);
    for (const p of listening) expect(skipsFeedbackWhenCorrect(p)).toBe(true);
    const typed = pages(VOC).filter((p) => p.items.some((it) => it.type === 'vocabulary_typed_gap'));
    for (const p of typed) expect(skipsFeedbackWhenCorrect(p)).toBe(true);
  });
  it('keeps the checked view for pages with several answers per item and never applies to exam pages', () => {
    const gender = pages(VOC).filter((p) => p.items.some((it) => it.type === 'vocabulary_gender_select') && p.units.length > 1);
    expect(gender.length).toBeGreaterThan(0);
    for (const p of gender) expect(skipsFeedbackWhenCorrect(p)).toBe(false);
    for (const p of pages(VOC).filter((p) => p.role === 'exam')) expect(skipsFeedbackWhenCorrect(p)).toBe(false);
  });
  it('moves straight on after a fully correct listening choice', () => {
    const s = setup('fr-classroom-instructions');
    while (!s.page().units.some((u) => u.itemType === 'vocabulary_listening_choice')) {
      if (s.page().role === 'practice') s.answerAll();
      s.proceed();
      if (s.record.phase === 'feedback') s.proceed();
    }
    const id = s.page().pageId;
    s.answerAll();
    s.proceed();
    expect(s.record.phase).toBe('answering');
    expect(s.page().pageId).not.toBe(id);
  });
});

describe('grammar renderer composition (P3-01)', () => {
  const GRAMMAR_TYPES = ['grammar_person_matching', 'grammar_pronoun_form_match', 'grammar_pronoun_form_typing', 'grammar_gap_choice', 'grammar_gap_typing', 'grammar_word_order', 'grammar_error_spotter'];

  /** The être fixture plus a timed word-order page, so the exam mixes all three exam types. */
  function mixedExam() {
    const content = lessonOf(FIXTURES, GRAM) as Extract<ReturnType<typeof lessonOf>, { kind: 'grammar' }>;
    const exam = content.steps.at(-1)!;
    exam.pages.push({
      pageId: 'exam-order', estimatedDurationS: 40, timeLimitS: 60, instructions: exam.pages[0].instructions,
      items: [{
        type: 'grammar_word_order', itemId: 'order-1', ruleIds: ['r-plural'], answerExplanation: { en: 'e', fr: 'e', de: 'e' },
        tokens: [{ tokenId: 'a', text: 'nous' }, { tokenId: 'b', text: 'sommes' }, { tokenId: 'c', text: 'ici' }, { tokenId: 'd', text: 'aujourd’hui' }],
        acceptedOrders: [['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c']],
      }],
    });
    return buildPlan(content, load('briefs', GRAM), 'en');
  }

  it('plans every practice type of the fixture as scorable units with an item-level explanation', () => {
    const { plan } = setup(GRAM);
    const units = plan.pages.filter((p) => p.role === 'practice').flatMap((p) => p.units);
    expect(new Set(units.map((u) => u.itemType))).toEqual(new Set(GRAMMAR_TYPES.filter((t) => t !== 'grammar_word_order')));
    for (const u of units) expect(u.explanation.en.length).toBeGreaterThan(0);
  });

  it('grades a mixed exam (typed gaps, typed pronoun forms, word order) with the one shared scorer', () => {
    const plan = mixedExam();
    const exam = plan.pages.filter((p) => p.role === 'exam');
    expect(new Set(exam.flatMap((p) => p.units.map((u) => u.kind)))).toEqual(new Set(['text', 'order']));
    expect(new Set(exam.flatMap((p) => p.items.map((i) => i.type)))).toEqual(new Set(['grammar_gap_typing', 'grammar_pronoun_form_typing', 'grammar_word_order']));
    let record = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now: 0 });
    const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
    const right = (u: (typeof exam)[number]['units'][number]) => (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders.at(-1) : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] });
    for (let guard = 0; record.phase !== 'results' && guard < 200; guard++) {
      const page = plan.pages[record.pageIndex];
      if (record.phase === 'answering') for (const u of page.units) act({ type: 'draft', unitId: u.id, response: right(u) as never, now: 0 });
      act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    }
    expect(record.phase).toBe('results');
    const results = lessonResults(plan, record);
    expect(results.exam).toMatchObject({ earned: exam.flatMap((p) => p.units).length, possible: exam.flatMap((p) => p.units).length });
    expect(results.examScore).toBe(100);
  });

  it('accepts duplicate form texts, alternative valid forms and alternative word orders', () => {
    const tokens = (texts: string[]) => texts.map((text, n) => ({ id: `t${n}`, text, lang: 'learning' as const }));
    const base = { id: 'u', itemId: 'i', prompt: {}, explanation: { en: 'e', fr: 'e', de: 'e' }, answer: '', answerLang: 'learning' as const };
    // Two tokens with the same text are both correct for the row (il / elle est).
    const match = { ...base, kind: 'choice' as const, itemType: 'grammar_pronoun_form_match' as const, options: tokens(['est', 'est', 'sont']), correct: ['t0', 't1'] };
    expect(scoreUnit(match, 't1').points).toBe(1);
    expect(scoreUnit(match, 't2').points).toBe(0);
    const typing = { ...base, kind: 'text' as const, itemType: 'grammar_pronoun_form_typing' as const, accepted: { answers: ['payes', 'paies'], accentSensitive: [] } };
    expect(scoreUnit(typing, 'paies').points).toBe(1);
    // Repeated words have distinct tokens; either token order of the same sentence counts.
    const order = { ...base, kind: 'order' as const, itemType: 'grammar_word_order' as const, tokens: tokens(['nous', 'nous', 'lavons']), acceptedOrders: [['t0', 't2', 't1'], ['t1', 't0', 't2']] };
    expect(scoreUnit(order, ['t1', 't2', 't0']).points).toBe(1); // same sentence as the first order
    expect(scoreUnit(order, ['t0', 't1', 't2']).points).toBe(1); // the alternative order
    expect(scoreUnit(order, ['t2', 't0', 't1']).points).toBe(0);
  });
});

describe('sidebar navigation (P6-01)', () => {
  it('revisits completed theory pages read-only and returns to the active page', () => {
    const s = setup();
    s.proceed(); s.proceed(); // intro-all, cards-all done; on match-1
    expect(s.page().pageId).toBe('match-1');
    const before = s.record;
    s.act({ type: 'navigate', pageIndex: 0 });
    expect(s.record.viewIndex).toBe(0);
    expect(s.record.pageIndex).toBe(before.pageIndex);
    expect(outline(s.plan, s.record).slice(0, 3).map((e) => e.state)).toEqual(['current', 'done', 'available']);
    // Nothing but Continue acts while revisiting; scores and progress stay put.
    s.act({ type: 'draft', unitId: s.page().units[0].id, response: 'x', now: 1 });
    expect(s.record.drafts).toEqual(before.drafts);
    expect(progress(s.plan, s.record)).toBe(progress(s.plan, before));
    s.act({ type: 'continue', now: 1, interfaceLanguage: 'en' });
    expect(s.record.viewIndex).toBe(1);
    s.act({ type: 'continue', now: 1, interfaceLanguage: 'en' });
    expect(s.record.viewIndex).toBeUndefined();
    expect(s.record.pageIndex).toBe(before.pageIndex);
    expect(s.record.completed).toEqual(before.completed);
  });

  it('only allows completed theory pages: not locked, practice or exam pages', () => {
    const s = setup();
    s.act({ type: 'navigate', pageIndex: 1 }); // not completed yet
    expect(s.record.viewIndex).toBeUndefined();
    s.proceed(); s.proceed(); s.answerAll(); s.proceed(); // match-1 locked, feedback phase
    s.act({ type: 'navigate', pageIndex: 2 }); // completed? practice page: never
    expect(s.record.viewIndex).toBeUndefined();
    s.act({ type: 'navigate', pageIndex: 5 });
    expect(s.record.viewIndex).toBeUndefined();
    s.act({ type: 'navigate', pageIndex: 0 });
    expect(s.record.viewIndex).toBe(0); // allowed during feedback
    expect(s.record.locked).toEqual(setupLocked(s));
  });

  it('is disabled during the exam and after completion, so countdowns and answers are untouched', () => {
    const s = setup();
    while (s.page().role !== 'exam') { s.answerAll(); s.proceed(); }
    const before = s.record;
    s.act({ type: 'navigate', pageIndex: 0 });
    expect(s.record).toBe(before);
    expect(outline(s.plan, s.record).every((e) => !e.navigable)).toBe(true);
    while (s.record.status === 'active') { s.answerAll(); s.proceed(); }
    s.act({ type: 'navigate', pageIndex: 0 });
    expect(s.record.viewIndex).toBeUndefined();
    expect(outline(s.plan, s.record).every((e) => e.state === 'done' && !e.navigable)).toBe(true);
  });

  it('reports question counts and time limits for exam pages', () => {
    const exam = outline(setup(GRAM).plan, setup(GRAM).record).filter((e) => e.role === 'exam');
    expect(exam.length).toBeGreaterThan(0);
    expect(exam.every((e) => e.questionCount > 0 && e.timeLimitS !== null && e.state === 'locked')).toBe(true);
  });
});

const setupLocked = (s: ReturnType<typeof setup>) => Object.fromEntries(Object.entries(s.record.locked));
