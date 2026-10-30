import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type PlanPage, type PlanUnit } from '../../src/domain/session/plan.ts';
import { headerScore, isAnswered, lessonResults, scoreUnit, sessionReducer, skipsFeedbackWhenCorrect, startSession, type LockedUnit, type SessionAction, type SessionRecord } from '../../src/domain/session/session.ts';
import { UnitsRenderer, type RendererProps } from '../../src/session/controls.tsx';

/** P3-03: multiple-choice gaps and exact-typing phrase gaps in grammar lessons. */

afterEach(cleanup);
const CONTENT = resolve(import.meta.dirname, '../../content');
const ID = 'fr-here-there-now-tomorrow';
const plan = buildPlan(lessonOf(CONTENT, ID), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${ID}.json`), 'utf8')), 'en');
const page = (pageId: string) => plan.pages.find((p) => p.pageId === pageId)!;
const unitOf = (pageId: string, n = 0) => page(pageId).units[n];

function renderPage(p: PlanPage, extra: Partial<RendererProps> = {}) {
  const onChange = vi.fn();
  const props: RendererProps = {
    item: p.items[0], units: p.units, plan, mode: p.role === 'exam' ? 'exam' : 'answering', drafts: {}, locked: {}, onChange, seed: 1, motherTongue: 'en',
    pageId: p.pageId, revealed: {}, onReveal: () => undefined, inlineFeedback: skipsFeedbackWhenCorrect(p), ...extra,
  };
  const view = render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><UnitsRenderer {...props} /></PreferencesProvider>);
  return { ...view, onChange };
}
const locked = (response: string, unit: PlanUnit): LockedUnit => ({ response, ...scoreUnit(unit, response), timedOut: false, interfaceLanguage: 'en' });

/** A session advanced to `pageId`, answering every earlier page correctly. */
function sessionAt(pageId: string) {
  let record: SessionRecord = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 3, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  const current = () => plan.pages[record.pageIndex];
  for (let guard = 0; current().pageId !== pageId && guard < 200; guard++) {
    if (record.phase === 'answering') for (const u of current().units) act({ type: 'draft', unitId: u.id, response: (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] }) as never, now: 0 });
    act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
  }
  return { act, current, get record() { return record; } };
}

describe('multiple-choice gaps (P3-03)', () => {
  const choice = page('ex-place-choice-1');
  const unit = choice.units[0] as PlanUnit & { kind: 'choice' };

  it('offers four distinct choices with one accepted answer', () => {
    expect(unit.options).toHaveLength(4);
    expect(new Set(unit.options.map((o) => o.text)).size).toBe(4);
    expect(unit.correct).toHaveLength(1);
    expect(unit.answer).toBe('ici');
  });

  it('shuffles the choices per session seed without changing which one is right', () => {
    const orders = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { container, onChange } = renderPage(choice, { seed });
      const labels = [...container.querySelectorAll('.choice')].map((el) => el.textContent);
      expect([...labels].sort()).toEqual(unit.options.map((o) => o.text).sort());
      orders.add(labels.join('|'));
      fireEvent.click(screen.getByLabelText('ici'));
      expect(onChange).toHaveBeenLastCalledWith(unit.id, unit.correct[0]);
      cleanup();
    }
    expect(orders.size).toBeGreaterThan(1);
    // The same seed always gives the same order, so resume and results show what the learner saw.
    const first = renderPage(choice, { seed: 4 }).container.textContent;
    cleanup();
    expect(renderPage(choice, { seed: 4 }).container.textContent).toBe(first);
  });

  it('scores by choice identity: the accepted choice earns the point, any other none', () => {
    expect(scoreUnit(unit, unit.correct[0])).toEqual({ outcome: 'fully_correct', points: 1 });
    for (const o of unit.options.filter((o) => o.id !== unit.correct[0])) expect(scoreUnit(unit, o.id)).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(unit, undefined)).toEqual({ outcome: 'unanswered', points: 0 });
  });

  it('marks a wrong choice red and the right one green in place, without a feedback card', () => {
    const wrong = unit.options.find((o) => o.text === 'hier')!;
    const { container } = renderPage(choice, { mode: 'feedback', locked: { [unit.id]: locked(wrong.id, unit) } });
    expect(container.querySelector('.choice.is-wrong')).toHaveTextContent('hier');
    expect(container.querySelector('.choice.is-right')).toHaveTextContent('ici');
    expect(container.querySelector('.feedback')).toBeNull();
  });

  it('submits a wrong choice at once and waits for Continue; a right one moves straight on', () => {
    const s = sessionAt('ex-place-choice-1');
    const wrong = unit.options.find((o) => !unit.correct.includes(o.id))!;
    s.act({ type: 'draft', unitId: unit.id, response: wrong.id, now: 0 });
    s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    expect(s.record.phase).toBe('feedback');
    expect(s.record.locked[unit.id]).toMatchObject({ outcome: 'incorrect', points: 0 });
    // Changing the answer after the check neither rescores nor unlocks it.
    s.act({ type: 'draft', unitId: unit.id, response: unit.correct[0], now: 0 });
    s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    expect(s.record.locked[unit.id].points).toBe(0);
    expect(s.current().pageId).toBe('ex-place-choice-2');
    const next = s.current().units[0] as PlanUnit & { kind: 'choice' };
    s.act({ type: 'draft', unitId: next.id, response: next.correct[0], now: 0 });
    s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    expect(s.current().pageId).toBe('ex-place-choice-3');
  });
});

describe('exact-typing phrase gaps (P3-03)', () => {
  it('accepts every content-defined answer in full', () => {
    const today = unitOf('exam-present') as PlanUnit & { kind: 'text' };
    expect(today.accepted.answers).toEqual(['Aujourd’hui', 'aujourd’hui']);
    expect(scoreUnit(today, 'Aujourd’hui').points).toBe(1);
    expect(scoreUnit(today, "aujourd'hui").points).toBe(1); // typographic apostrophes are normalized
    expect(scoreUnit(today, '  aujourd’hui ').points).toBe(1);
  });

  it('gives half a point for accents or capitals, also where the accent makes another word (D40)', () => {
    const there = unitOf('ex-place-typing-2');
    expect(scoreUnit(there, 'là')).toEqual({ outcome: 'fully_correct', points: 1 });
    expect(scoreUnit(there, 'la')).toEqual({ outcome: 'orthography_only', points: 0.5 }); // a spelling mistake
    expect(scoreUnit(there, 'Là')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    const soon = unitOf('exam-future', 3);
    expect(scoreUnit(soon, 'bientot')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(soon, 'demain')).toEqual({ outcome: 'incorrect', points: 0 });
  });

  it('shows the hint above the sentence in practice and never in the exam', () => {
    const practice = renderPage(page('ex-place-typing-2')).container;
    expect(practice.querySelector('.gap-hint')).toHaveTextContent('there, away from me');
    expect(practice.querySelector('.gap-sentence')).toHaveTextContent(/^La gare \? Elle est , après le pont\.$/);
    cleanup();
    expect(renderPage(page('exam-place')).container.querySelector('.gap-hint')).toBeNull();
  });

  it('needs an answer before Check in practice, but lets an exam page be submitted blank for zero', () => {
    const unit = unitOf('ex-place-typing-1');
    expect(isAnswered(unit, '')).toBe(false);
    expect(isAnswered(unit, '   ')).toBe(false);
    expect(isAnswered(unit, 'ici')).toBe(true);
    const s = sessionAt('exam-place');
    s.act({ type: 'continue', now: 1000, interfaceLanguage: 'en' });
    expect(s.current().pageId).toBe('exam-present');
    for (const u of page('exam-place').units) expect(s.record.locked[u.id]).toMatchObject({ outcome: 'unanswered', points: 0, response: null });
  });

  it('marks a checked practice answer in place: red with the correct form, amber with the form and the explanation below', () => {
    const p = page('ex-place-typing-2');
    const unit = p.units[0];
    const wrong = renderPage(p, { mode: 'feedback', locked: { [unit.id]: locked('ici', unit) } }).container;
    expect(wrong.querySelector('input.text-input.is-wrong')).toHaveValue('ici');
    expect(wrong.querySelector('.inline-answer')).toHaveTextContent('là');
    expect(wrong.querySelector('input')).toHaveAttribute('readonly');
    cleanup();
    const almost = renderPage(p, { mode: 'feedback', locked: { [unit.id]: locked('la', unit) } }).container;
    expect(almost.querySelector('input.text-input.is-almost')).toBeTruthy();
    expect(almost.querySelector('.inline-answer')).toHaveTextContent('là');
  });

  it('reveals nothing on exam pages and keeps the header score until the results', () => {
    const s = sessionAt('exam-place');
    const before = headerScore(plan, s.record);
    const units = page('exam-place').units;
    units.forEach((u, n) => s.act({ type: 'draft', unitId: u.id, response: n === 1 ? 'ici' : u.answer, now: 0 }));
    const { container } = renderPage(page('exam-place'), { drafts: s.record.drafts });
    expect(container.querySelector('.is-wrong, .is-right, .is-almost, .inline-answer, .feedback')).toBeNull();
    s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    expect(s.record.phase).toBe('answering');
    expect(headerScore(plan, s.record)).toBe(before);
    // The results then show the recorded classification of every answer.
    for (let guard = 0; s.record.phase !== 'results' && guard < 20; guard++) s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    expect(s.record.locked[units[1].id]).toMatchObject({ response: 'ici', outcome: 'incorrect', points: 0 });
    expect(lessonResults(plan, s.record).exam).toMatchObject({ earned: units.length - 1 });
  });
});
