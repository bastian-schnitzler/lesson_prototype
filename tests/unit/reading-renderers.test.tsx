import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastTryProvider, PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOutline, numberedPoints } from '../../src/domain/session/outline.ts';
import { buildPlan, type PlanPage, type PlanUnit } from '../../src/domain/session/plan.ts';
import { requiredReveals, sessionReducer, skipsFeedbackWhenCorrect, startSession, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import { UnitsRenderer, type RendererProps } from '../../src/session/controls.tsx';
import { DocumentRenderer, isSkimmed, QuestionRenderer, SKIMMED } from '../../src/session/readingRenderers.tsx';
import { FlashcardsRenderer } from '../../src/session/vocabularyRenderers.tsx';
import { correctSentences, isAutoSubmitPage, ResultsView, SessionView, StartView } from '../../src/session/views.tsx';

/** P5-04: reading document view, skim phase, questions and session (SPEC section 9). */
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const ROOT = resolve(import.meta.dirname, '../..');
const ID = 'fr-reading-a-text-message';
const read = (dir: string) => JSON.parse(readFileSync(join(ROOT, 'content', dir, `${ID}.json`), 'utf8'));
const plan = buildPlan(contentSchema('reading', 'fr').parse(read('lessons')), briefSchema('reading', 'fr').parse(read('briefs')), 'en', { examIntro: true });
const page = (pageId: string) => plan.pages.find((p) => p.pageId === pageId)!;
const wrap = (node: React.ReactNode) => <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>{node}</PreferencesProvider>;
const record = (pageIndex: number, extra: Partial<SessionRecord> = {}): SessionRecord => ({ ...startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now: 0 }), pageIndex, ...extra });

function renderItem(Renderer: (props: RendererProps) => unknown, pg: PlanPage, index: number, extra: Partial<RendererProps> = {}) {
  const onReveal = vi.fn();
  const onChange = vi.fn();
  const item = pg.items[index];
  const props: RendererProps = {
    item, units: pg.units.filter((u) => u.itemId === item.itemId), plan, mode: 'answering', drafts: {}, locked: {}, onChange, seed: 1, motherTongue: 'en',
    pageId: pg.pageId, revealed: {}, onReveal, ...extra,
  };
  const R = Renderer as (p: RendererProps) => React.JSX.Element;
  const view = render(wrap(<R {...props} />));
  return { onReveal, onChange, view };
}

describe('reading start page and navigation', () => {
  it('shows the situation, the key words and the sections A Key words, B The document, C Final exam', () => {
    render(wrap(<StartView plan={plan} level="A1" onStart={() => undefined} onResume={() => undefined} />));
    expect(screen.getByText('Léa sends her friend Tom a text message on Thursday evening to plan Saturday.')).toBeInTheDocument();
    expect(screen.getByText('5 key words')).toBeInTheDocument();
    const rows = [...document.querySelectorAll('.flow-section .flow-head')].map((r) => r.textContent);
    expect(rows).toEqual([expect.stringMatching(/^AKey words/), expect.stringMatching(/^BThe document/), expect.stringMatching(/^CFinal exam.*5 questions on 1 timed page(?!s)/)]);
    expect([...document.querySelectorAll('.flow-points li')].map((li) => li.textContent)).toEqual(['1Flashcards', '2Matching', '3Skim', '4Detail', '5Structure']);
    expect(document.body).not.toHaveTextContent('text_message');
  });

  it('numbers the learning points with the shared rules (D53, no exception)', () => {
    expect(numberedPoints(lessonOutline(plan)).map((p) => `${p.number ?? '⚑'} ${p.title.en}`)).toEqual(['1 Flashcards', '2 Matching', '3 Skim', '4 Detail', '5 Structure', '⚑ Final exam']);
  });
});

describe('key words', () => {
  it('shows the key words on the vocabulary flashcards: meaning in front, word and explanation behind', () => {
    const { onReveal } = renderItem(FlashcardsRenderer, page('flashcards'), 0);
    const card = screen.getByRole('article', { name: 'Card 2 of 5' });
    const [front, back] = card.querySelectorAll('.flashcard-face');
    expect(front).toHaveTextContent('we meet / shall we meet');
    expect(back.querySelector('[lang="fr"]')).toHaveTextContent('on se voit');
    expect(back).toHaveTextContent('on means nous in everyday French');
    fireEvent.click(within(card).getByRole('button', { name: 'Flip card to French' }));
    expect(onReveal).toHaveBeenCalledWith('flashcards/cards', 'on-se-voit');
    expect(requiredReveals(page('flashcards'))).toEqual([{ itemKey: 'flashcards/cards', keys: ['samedi', 'on-se-voit', 'la-gare', 'avant', 'apres'] }]);
  });

  it('keeps the matching rule 4: a fully correct board goes straight on', () => {
    expect(skipsFeedbackWhenCorrect(page('matching'))).toBe(true);
  });
});

describe('skim', () => {
  const pg = page('skim');

  it('shows the document with its key words, the countdown and I’ve finished reading; the question waits', () => {
    const { onReveal } = renderItem(DocumentRenderer, pg, 0);
    expect(screen.getByText('Time to skim')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');
    expect([...document.querySelectorAll('mark')].map((m) => m.textContent)).toContain('on se voit');
    fireEvent.click(screen.getByRole('button', { name: 'I’ve finished reading' }));
    expect(onReveal).toHaveBeenCalledWith('skim/skim-document', SKIMMED);
    cleanup();
    renderItem(QuestionRenderer, pg, 1);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByText(/The question opens when the time is up/)).toBeInTheDocument();
  });

  it('puts the document away when the time is up', () => {
    vi.useFakeTimers();
    const { onReveal } = renderItem(DocumentRenderer, pg, 0);
    act(() => vi.advanceTimersByTime(46_000));
    expect(onReveal).toHaveBeenCalledWith('skim/skim-document', SKIMMED);
  });

  it('answers from memory without the document, then shows it again with the correction', () => {
    const revealed = { 'skim/skim-document': [SKIMMED] };
    expect(isSkimmed(pg, revealed)).toBe(true);
    const dispatch = vi.fn();
    const { rerender } = render(wrap(<SessionView plan={plan} record={record(pg.index, { revealed })} dispatch={dispatch} />));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Answer from memory');
    expect(document.querySelector('.reading-document')).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    // One choice does not submit the page: the skim question is confirmed with Check (section 9).
    expect(isAutoSubmitPage(pg)).toBe(false);
    fireEvent.click(screen.getByRole('radio', { name: 'Pour proposer de se voir samedi' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'draft', unitId: pg.units[0].id, response: 'o4' });
    const unit = pg.units[0];
    const checked = record(pg.index, { revealed, phase: 'feedback', drafts: { [unit.id]: 'o1' }, locked: { [unit.id]: { response: 'o1', outcome: 'incorrect', points: 0, timedOut: false, interfaceLanguage: 'en' } } });
    rerender(wrap(<SessionView plan={plan} record={checked} dispatch={dispatch} />));
    expect(document.querySelector('.reading-document')).not.toBeNull();
    expect(screen.getByText(/Léa suggests meeting/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});

describe('detail, structure and exam', () => {
  it('keeps Vrai / Faux in order and shows the questions beside the open document', () => {
    const pg = page('detail');
    renderItem(QuestionRenderer, pg, 4);
    expect(screen.getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Vrai', 'Faux']);
    cleanup();
    renderItem(DocumentRenderer, pg, 0);
    expect(document.querySelector('.reading-doc-slot')).toHaveClass('is-side');
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('names the ordering task by pieces of the text, not by the words of a sentence', () => {
    const structure = page('structure');
    renderItem(UnitsRenderer, structure, structure.items.findIndex((it) => it.type === 'reading_order'));
    expect(screen.getByRole('group', { name: 'Available pieces' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Your order' })).toHaveTextContent('Select the pieces in the order of the text.');
  });

  it('keeps the checked view of a document page even when every answer is right, and speaks nothing on Check', () => {
    for (const id of ['skim', 'detail', 'structure']) expect(skipsFeedbackWhenCorrect(page(id)), id).toBe(false);
    expect(correctSentences(page('structure'))).toBeUndefined();
  });

  it('shows the exam document without highlights and numbers its questions', () => {
    const pg = page('exam');
    renderItem(DocumentRenderer, pg, 0, { mode: 'exam' });
    expect(screen.getByRole('article', { name: 'Exam document' })).toHaveTextContent('Dimanche matin');
    expect(document.querySelectorAll('mark')).toHaveLength(0);
    cleanup();
    renderItem(QuestionRenderer, pg, 2, { mode: 'exam' });
    expect(document.querySelector('.reading-number')).toHaveTextContent('2.');
  });

  it('counts the answered exam questions next to Continue; one exam page is named in the singular', () => {
    const exam = page('exam');
    const [first, second] = exam.units;
    const drafts = { [first.id]: first.kind === 'choice' ? first.correct[0] : '', [second.id]: second.kind === 'choice' ? second.correct[0] : '' };
    render(wrap(<SessionView plan={plan} record={record(exam.index, { drafts })} dispatch={() => undefined} remainingMs={60_000} />));
    expect(screen.getByRole('status')).toHaveTextContent('2 of 5 answered');
    expect(document.querySelector('.lesson-nav .nav-title')).toHaveTextContent('1 page · 5 questions');
    expect(document.querySelector('.lesson-nav .nav-note')).toHaveTextContent('The page has a countdown.');
    cleanup();
    render(wrap(<SessionView plan={plan} record={record(page('exam-intro').index)} dispatch={() => undefined} />));
    expect(screen.getByText('The page has a countdown. You see your results only after the exam.')).toBeInTheDocument();
  });

  it('names the exam page on the info page and lists the results without exam parts', () => {
    render(wrap(<SessionView plan={plan} record={record(page('exam-intro').index)} dispatch={() => undefined} />));
    expect(screen.getByText('5 questions on a new document of the same kind.')).toBeInTheDocument();
    expect(screen.getByText(/Questions on the document/)).toBeInTheDocument();
    cleanup();
    const key = (u: PlanUnit): UnitResponse => (u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : '');
    let r = record(0);
    for (let guard = 0; r.status !== 'completed' && guard < 50; guard++) {
      const pg = plan.pages[r.pageIndex];
      if (r.phase === 'answering') for (const u of pg.units) r = sessionReducer(plan, r, { type: 'draft', unitId: u.id, response: key(u), now: 0 });
      for (const { itemKey, keys } of requiredReveals(pg)) for (const k of keys) r = sessionReducer(plan, r, { type: 'reveal', itemKey, key: k, now: 0 });
      r = sessionReducer(plan, r, { type: 'continue', now: 1, interfaceLanguage: 'en' });
    }
    render(wrap(<LastTryProvider><ResultsView plan={plan} record={r} dispatch={() => undefined} /></LastTryProvider>));
    const nav = document.querySelector('.lesson-nav')!;
    expect(nav.querySelectorAll('.results-part')).toHaveLength(0);
    expect([...nav.querySelectorAll('.results-entry')].map((b) => b.textContent)).toEqual([
      expect.stringMatching(/^Final exam/), expect.stringMatching(/^Matching/), expect.stringMatching(/^Skim/), expect.stringMatching(/^Detail/), expect.stringMatching(/^Structure/),
    ]);
  });
});
