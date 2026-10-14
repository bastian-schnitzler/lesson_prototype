import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastTryProvider, PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type LessonPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { headerScore, lessonResults, sessionReducer, startSession, type SessionAction, type SessionRecord } from '../../src/domain/session/session.ts';
import { ResultsView, SessionView } from '../../src/session/views.tsx';
import type { Locale } from '../../src/schemas/common.ts';

/** P3-05: production-feedback placeholder, timed mixed exam and deferred answer review (grammar). */

afterEach(cleanup);
const CONTENT = resolve(import.meta.dirname, '../../content');
const ID = 'fr-negation-ne-pas';
const brief = JSON.parse(readFileSync(join(CONTENT, 'briefs', `${ID}.json`), 'utf8'));
const planOf = (mutate?: (content: ReturnType<typeof lessonOf>) => void) => {
  const content = lessonOf(CONTENT, ID);
  mutate?.(content);
  return buildPlan(content, brief, 'en', { interleaveGroups: true, examIntro: true });
};
const PLAN = planOf();
const right = (u: PlanUnit) => (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] });
const isPlaceholder = (plan: LessonPlan, n: number) => plan.pages[n].items.some((it) => it.type === 'production_feedback_placeholder');

function session(plan = PLAN) {
  let record: SessionRecord = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 3, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  /** Answers each page with `answer` (default: right) and continues until `stop` holds. */
  const run = (stop: (r: SessionRecord) => boolean, answer: (u: PlanUnit) => unknown = right) => {
    for (let guard = 0; !stop(record) && record.status === 'active' && guard < 300; guard++) {
      const page = plan.pages[record.pageIndex];
      if (record.phase === 'answering') for (const u of page.units) act({ type: 'draft', unitId: u.id, response: answer(u) as never, now: 0 });
      act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    }
  };
  return { act, run, get record() { return record; } };
}
const wrap = (node: React.ReactNode, locale: Locale = 'en') => <PreferencesProvider initial={{ interfaceLanguage: locale, motherTongue: 'en' }}>{node}</PreferencesProvider>;

describe('production-feedback placeholder', () => {
  const at = PLAN.pages.findIndex((_, n) => isPlaceholder(PLAN, n));

  it('follows the last teaching block and precedes the exam info page and the first exam page', () => {
    expect(at).toBeGreaterThan(0);
    const lastPractice = PLAN.pages.findLastIndex((p) => p.role === 'practice');
    const firstExam = PLAN.pages.findIndex((p) => p.role === 'exam');
    expect(at).toBe(lastPractice + 1);
    expect(PLAN.pages[at + 1].special).toBe('examIntro');
    expect(at + 2).toBe(firstExam);
    expect(PLAN.pages[at]).toMatchObject({ role: 'presentation', units: [], timeLimitS: null });
  });

  it.each([
    ['en', 'Individual feedback would be here on production.', 'Continue'],
    ['fr', 'Un retour personnalisé serait affiché ici en production.', 'Continuer'],
    ['de', 'Hier würde in der Produktivversion individuelles Feedback angezeigt.', 'Weiter'],
  ] as const)('shows the fixed %s text with an enabled Continue', (locale, text, button) => {
    const s = session();
    s.run((r) => r.pageIndex === at);
    render(wrap(<SessionView plan={PLAN} record={s.record} dispatch={() => undefined} />, locale));
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: button })).toBeEnabled();
  });

  it('adds no score and needs no answer: Continue moves on to the exam info page', () => {
    const s = session();
    s.run((r) => r.pageIndex === at);
    const scores = () => { const { practice, exam, total } = lessonResults(PLAN, s.record); return { practice, exam, total, header: headerScore(PLAN, s.record) }; };
    const before = scores();
    s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    expect(s.record.pageIndex).toBe(at + 1);
    expect(scores()).toEqual(before);
  });
});

describe('timed mixed exam', () => {
  it('shows no hint, mark or correction on exam pages, and the header keeps the practice score', () => {
    // An exam gap with a hint (content validation forbids it) still shows none.
    const plan = planOf((c) => {
      if (c.kind !== 'grammar') return;
      for (const page of c.steps.at(-1)!.pages) for (const item of page.items) if (item.type === 'grammar_gap_typing') item.hint = { en: 'HINT', fr: 'HINT', de: 'HINT' };
    });
    const s = session(plan);
    s.run((r) => plan.pages[r.pageIndex].role === 'exam');
    const practiceScore = headerScore(plan, s.record);
    const wrong = (u: PlanUnit) => (u.kind === 'order' ? [...u.acceptedOrders[0]].reverse() : 'faux');
    // Two exam pages answered wrong: the second page still shows nothing of the first one's correctness.
    for (let n = 0; n < 2; n++) {
      const page = plan.pages[s.record.pageIndex];
      for (const u of page.units) s.act({ type: 'draft', unitId: u.id, response: wrong(u) as never, now: 0 });
      const { container, unmount } = render(wrap(<SessionView plan={plan} record={s.record} dispatch={() => undefined} remainingMs={60_000} />));
      expect(screen.getByRole('timer')).toBeInTheDocument();
      expect(screen.queryByText(/HINT/)).toBeNull();
      expect(container.querySelectorAll('.is-wrong, .is-right, .is-almost, .inline-answer, .feedback, .gap-hint')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
      unmount();
      s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
      expect(s.record.phase).toBe('answering'); // no feedback phase between exam pages
      expect(headerScore(plan, s.record)).toBe(practiceScore);
    }
  });

  it('gives every exam page its own countdown from the brief', () => {
    const s = session();
    s.run((r) => PLAN.pages[r.pageIndex].role === 'exam');
    const limits = brief.exam.pages.map((p: { timeLimitS: number }) => p.timeLimitS);
    for (const limit of limits) {
      const page = PLAN.pages[s.record.pageIndex];
      expect(page.role).toBe('exam');
      const { startedAt, deadline } = s.record.exam[page.pageId];
      expect(deadline - startedAt).toBe(limit * 1000);
      s.act({ type: 'expire', now: deadline, interfaceLanguage: 'en' });
      expect(s.record.exam[page.pageId].timedOut).toBe(true);
    }
    expect(s.record.phase).toBe('results');
  });
});

describe('final results', () => {
  /** Practice right; exam: word order wrong, one half-credit gap, the last page left to expire. */
  function finished() {
    const s = session();
    s.run((r) => PLAN.pages[r.pageIndex].role === 'exam');
    const exam = PLAN.pages.filter((p) => p.role === 'exam');
    let halfDone = false;
    for (const page of exam) {
      const last = page === exam.at(-1);
      for (const [n, u] of page.units.entries()) {
        if (last && n > 0) continue; // only the first answer is saved before the countdown ends
        let response = right(u);
        if (u.kind === 'order') response = [...u.acceptedOrders[0]].reverse();
        else if (u.kind === 'text' && !halfDone) { response = (response as string).toUpperCase(); halfDone = true; }
        s.act({ type: 'draft', unitId: u.id, response: response as never, now: 0 });
      }
      if (last) s.act({ type: 'expire', now: s.record.exam[page.pageId].deadline, interfaceLanguage: 'en' });
      else s.act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    }
    expect(s.record.phase).toBe('results');
    return { record: s.record, exam };
  }

  it('shows every exam answer with its class, the correct answer and timeout markers, exam selected by default', () => {
    const { record, exam } = finished();
    const results = lessonResults(PLAN, record);
    expect(results.exam.possible).toBe(exam.flatMap((p) => p.units).length);
    const { container } = render(wrap(<LastTryProvider><ResultsView plan={PLAN} record={record} dispatch={() => undefined} /></LastTryProvider>));
    expect(screen.getByRole('heading', { level: 1, name: 'Final exam' })).toBeInTheDocument();
    const items = container.querySelectorAll('.result-item');
    expect(items).toHaveLength(results.exam.possible);
    expect(container.querySelectorAll('.result-item.outcome-orthography_only')).toHaveLength(1);
    expect(container.querySelectorAll('.result-item.outcome-incorrect')).toHaveLength(exam[0].units.length);
    // The expired page: every unit is marked; the unsaved ones are unanswered.
    expect(container.querySelectorAll('.result-item.outcome-unanswered')).toHaveLength(exam.at(-1)!.units.length - 1);
    expect(screen.getAllByText('Time expired; the saved answer was locked.')).toHaveLength(exam.at(-1)!.units.length);
    // A word-order row shows the correct sentence and the learner's reversed one.
    const order = exam[0].units[0] as PlanUnit & { kind: 'order' };
    expect(within(items[0] as HTMLElement).getByText(order.answer)).toBeInTheDocument();
    expect(results.examScore).toBeGreaterThan(0);
    expect(results.examScore).toBeLessThan(100);
  });

  it('offers the exam as one part and the practice exercises in order in the sidebar', () => {
    const { record } = finished();
    const dispatch = vi.fn();
    const view = render(wrap(<LastTryProvider><ResultsView plan={PLAN} record={record} dispatch={dispatch} /></LastTryProvider>));
    const nav = within(document.querySelector('.lesson-nav') as HTMLElement);
    const entries = nav.getAllByRole('button');
    expect(document.querySelectorAll('.results-part')).toHaveLength(0); // grammar exams are not split
    expect(entries[0]).toHaveTextContent(/^Final exam/);
    expect(entries[0]).toHaveAttribute('aria-pressed', 'true');
    const exercises = PLAN.steps.filter((s) => s.role === 'practice');
    expect(entries.slice(1).map((b) => b.firstChild?.textContent)).toEqual(exercises.map((s) => s.label.en));
    fireEvent.click(entries[2]);
    expect(dispatch).toHaveBeenCalledWith({ type: 'select', selection: exercises[1].stepId });
    view.unmount();
    // A selected exercise shows its own answers; the totals do not change.
    render(wrap(<LastTryProvider><ResultsView plan={PLAN} record={{ ...record, selection: exercises[1].stepId }} dispatch={dispatch} /></LastTryProvider>));
    expect(screen.getByRole('heading', { level: 1, name: exercises[1].label.en })).toBeInTheDocument();
    expect(document.querySelectorAll('.result-item')).toHaveLength(PLAN.pages.filter((p) => p.stepId === exercises[1].stepId).flatMap((p) => p.units).length);
  });
});
