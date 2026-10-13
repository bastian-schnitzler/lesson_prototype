import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastTryProvider, PreferencesProvider } from '../../src/app/context.tsx';
import { buildPlan, type PlanPage } from '../../src/domain/session/plan.ts';
import { nextDialogueLine, presentationComplete, requiredReveals, sessionReducer, skipsFeedbackWhenCorrect, startSession, type SessionRecord } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import type { RendererProps } from '../../src/session/controls.tsx';
import { DialogueGapChoiceRenderer, DialogueRenderer, ExamDialogueRenderer, FunctionFlashcardsRenderer, FunctionWordOrderRenderer, ListeningReplyRenderer } from '../../src/session/functionsRenderers.tsx';
import { MatchingRenderer } from '../../src/session/vocabularyRenderers.tsx';
import { correctSentences, entryAudio, isAutoSubmitPage, resultTone, ResultsView, SessionView, StartView } from '../../src/session/views.tsx';
import { gapSentence, pronounWithForm } from '../../src/session/autoplay.ts';

/** P4-04: function flashcards, model dialogue and matching (SPEC section 8). */
afterEach(cleanup);
const ROOT = resolve(import.meta.dirname, '../..');
const ID = 'fr-ordering-at-a-cafe';
const read = (dir: string) => JSON.parse(readFileSync(join(ROOT, 'content', dir, `${ID}.json`), 'utf8'));
const plan = buildPlan(contentSchema('functions', 'fr').parse(read('lessons')), briefSchema('functions', 'fr').parse(read('briefs')), 'de');
const page = (pageId: string) => plan.pages.find((p) => p.pageId === pageId)!;

function renderItem(Renderer: (props: RendererProps) => unknown, pg: PlanPage, extra: Partial<RendererProps> = {}) {
  const onReveal = vi.fn();
  const onChange = vi.fn();
  const props: RendererProps = {
    item: pg.items[0], units: pg.units, plan, mode: 'answering', drafts: {}, locked: {}, onChange, seed: 1, motherTongue: 'de',
    pageId: pg.pageId, revealed: {}, onReveal, ...extra,
  };
  const R = Renderer as (p: RendererProps) => React.JSX.Element;
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}><R {...props} /></PreferencesProvider>);
  return { onReveal, onChange };
}

describe('function flashcards', () => {
  it('shows the translation on the front and expression, explanation and example on the back, as in vocabulary', () => {
    const { onReveal } = renderItem(FunctionFlashcardsRenderer, page('cards-expressions'));
    const card = screen.getByRole('article', { name: 'Card 2 of 8' });
    const [front, back] = card.querySelectorAll('.flashcard-face');
    expect(front).toHaveTextContent('Ich hätte gern');
    expect(front).not.toHaveTextContent('Je voudrais');
    expect(back.querySelector('[lang="fr"]')).toHaveTextContent('Je voudrais …');
    expect(back).toHaveTextContent('The polite way to order');
    expect(back).toHaveTextContent('Je voudrais un café, s’il vous plaît. – Ich hätte gern einen Kaffee, bitte.');
    fireEvent.click(within(card).getByRole('button', { name: 'Flip card to French' }));
    expect(card).toHaveClass('is-flipped');
    expect(onReveal).toHaveBeenCalledWith('cards-expressions/cards-expressions', 'je-voudrais');
    fireEvent.click(within(card).getByRole('button', { name: 'Flip card back' }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('shows the word cards before the expression cards', () => {
    expect(plan.pages.slice(0, 2).map((p) => p.pageId)).toEqual(['cards-words', 'cards-expressions']);
  });

  it('keeps the vocabulary order on the words page: mother tongue first, French with gender on the back', () => {
    renderItem(FunctionFlashcardsRenderer, page('cards-words'));
    const card = screen.getByRole('article', { name: 'Card 1 of 4' });
    const [front, back] = card.querySelectorAll('.flashcard-face');
    expect(front).toHaveTextContent('Kaffee');
    expect(back).toHaveTextContent('un café');
    expect(back).toHaveTextContent('Masculine');
    expect(within(card).getByRole('button', { name: 'Flip card to French' })).toBeInTheDocument();
  });

  it('restores turned cards and completes the page once every card was turned', () => {
    const pg = page('cards-words');
    const ids = ['cafe', 'the', 'croissant', 'jus-dorange'];
    renderItem(FunctionFlashcardsRenderer, pg, { revealed: { 'cards-words/cards-words': ['cafe'] } });
    expect(screen.getByRole('article', { name: 'Card 1 of 4' })).toHaveClass('is-flipped');
    expect(screen.getByText('1 of 4 cards turned')).toBeInTheDocument();
    expect(presentationComplete(pg, { revealed: { 'cards-words/cards-words': ids.slice(0, 3) } })).toBe(false);
    expect(presentationComplete(pg, { revealed: { 'cards-words/cards-words': ids } })).toBe(true);
  });
});

describe('model dialogue', () => {
  const pg = page('dialogue');
  const key = 'dialogue/dialogue';

  it('shows the first line, then one more line per Next line, alternately left and right', () => {
    renderItem(DialogueRenderer, pg, { revealed: { [key]: ['line-2'] } });
    const lines = screen.getAllByRole('listitem');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toHaveTextContent('le serveur');
    expect(lines[0]).toHaveTextContent('Bonjour, madame. Vous désirez ?');
    expect(lines[0]).not.toHaveClass('is-second');
    expect(lines[1]).toHaveClass('is-second');
    expect(lines[1].querySelector('.expression-mark')).toHaveTextContent('Je voudrais');
    expect(screen.getByText('Line 2 of 10')).toBeInTheDocument();
  });

  it('turns a line to its translation and note without storing it', () => {
    const { onReveal } = renderItem(DialogueRenderer, pg);
    const card = screen.getByRole('article', { name: 'le serveur' });
    fireEvent.click(within(card).getByRole('button', { name: 'Turn to the translation' }));
    expect(card).toHaveClass('is-flipped');
    expect(card.querySelector('.flashcard-back')).toHaveTextContent('Guten Tag. Was darf es sein?');
    expect(card.querySelector('.flashcard-back')).toHaveTextContent('The waiter greets you and asks for your order.');
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('reveals the lines in order and survives a resume', () => {
    let r: SessionRecord = { ...startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'de', seed: 1, now: 0 }), pageIndex: pg.index };
    for (let n = 2; n <= 10; n++) {
      expect(nextDialogueLine(pg, r)).toEqual({ itemKey: key, key: `line-${n}` });
      expect(presentationComplete(pg, r)).toBe(false);
      r = sessionReducer(plan, r, { type: 'reveal', ...nextDialogueLine(pg, r)!, now: 0 });
    }
    expect(nextDialogueLine(pg, r)).toBeUndefined();
    expect(presentationComplete(pg, r)).toBe(true);
    const resumed = JSON.parse(JSON.stringify(r)) as SessionRecord;
    expect(presentationComplete(pg, resumed)).toBe(true);
  });

  it('offers Next line in the footer until the last line, then Continue', () => {
    const dispatch = vi.fn();
    const base = { ...startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'de', seed: 1, now: 0 }), pageIndex: pg.index };
    const view = (record: SessionRecord) => <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}><SessionView plan={plan} record={record} dispatch={dispatch} /></PreferencesProvider>;
    const { rerender } = render(view(base));
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'reveal', itemKey: key, key: 'line-2' });
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    rerender(view({ ...base, revealed: { [key]: Array.from({ length: 9 }, (_, n) => `line-${n + 2}`) } }));
    expect(screen.queryByRole('button', { name: 'Next line' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});

describe('function matching', () => {
  const pg = page('match-expressions-1');

  it('pairs mother-tongue translations with French expressions on the shared board', () => {
    expect(pg.units).toHaveLength(4);
    expect(skipsFeedbackWhenCorrect(pg)).toBe(true);
    const { onChange } = renderItem(MatchingRenderer, pg);
    const [native, french] = screen.getAllByRole('list');
    const options = pg.units[0].kind === 'choice' ? pg.units[0].options.map((o) => o.text) : [];
    expect([...native.querySelectorAll('.match-item')].map((b) => b.textContent).sort()).toEqual([...options].sort());
    expect(options).toContain('Ich hätte gern');
    expect(within(french).getByRole('button', { name: 'Je voudrais …' })).toHaveAttribute('lang', 'fr');
    fireEvent.click(within(french).getByRole('button', { name: 'Je voudrais …' }));
    fireEvent.click(within(native).getByRole('button', { name: 'Ich hätte gern' }));
    expect(onChange).toHaveBeenLastCalledWith(pg.units.find((u) => u.prompt.learning === 'Je voudrais …')!.id, 'je-voudrais');
  });

  it('puts the words on their own board', () => {
    const words = page('match-words-1');
    renderItem(MatchingRenderer, words);
    expect(screen.getAllByRole('list')[1].querySelectorAll('.match-item')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'un jus d’orange' })).toBeInTheDocument();
  });
});

describe('function practice, exam and results (P4-05)', () => {
  const record = (pageIndex: number, extra: Partial<SessionRecord> = {}): SessionRecord => ({ ...startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'de', seed: 1, now: 0 }), pageIndex, ...extra });
  const wrap = (node: React.ReactNode) => <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}>{node}</PreferencesProvider>;

  it('shows the start page with situation, counts and a three-row outline', () => {
    render(wrap(<StartView plan={plan} level="A1" onStart={() => undefined} onResume={() => undefined} />));
    expect(screen.getByText('A customer orders at a café counter; the waiter serves her.')).toBeInTheDocument();
    expect(screen.getByText(/8 expressions · 4 words/)).toBeInTheDocument();
    const rows = [...document.querySelectorAll('.flow-list li')];
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringMatching(/^Flashcards · Dialogue/), expect.stringMatching(/^Matching · Gender and overview · Dialogue gaps · Word order · Listening/), expect.stringMatching(/^Final exam.*16 items on 3 timed pages/)]);
  });

  it('shows practice word order with tokens only', () => {
    renderItem(FunctionWordOrderRenderer, page('order-1'));
    expect(document.querySelector('.dialogue-context')).toBeNull();
    expect([...document.querySelectorAll('.order-bank .token')].map((b) => b.textContent).sort()).toEqual(['?', 'Bonsoir,', 'Vous', 'désirez', 'monsieur.'].sort());
  });

  it('puts role A above an exam reply whose bank holds the distractors', () => {
    const pg = page('exam-replies-1');
    renderItem(FunctionWordOrderRenderer, pg, { item: pg.items[0], units: pg.units.filter((u) => u.itemId === pg.items[0].itemId), mode: 'exam' });
    expect(document.querySelector('.dialogue-context .dialogue-role')).toHaveTextContent('le serveur');
    expect(document.querySelector('.dialogue-context')).toHaveTextContent('Madame, vous désirez ?');
    expect(document.querySelector('.dialogue-reply-role')).toHaveTextContent('la cliente');
    expect([...document.querySelectorAll('.order-bank .token')].map((b) => b.textContent)).toEqual(expect.arrayContaining(['voudrait', 'un']));
  });

  it('shows a dialogue gap under role A with four expression choices', () => {
    const { onChange } = renderItem(DialogueGapChoiceRenderer, page('gap-1'));
    expect(document.querySelector('.dialogue-context')).toHaveTextContent('Bonsoir, madame. Vous désirez ?');
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    fireEvent.click(screen.getByRole('radio', { name: 'Je voudrais' }));
    expect(onChange).toHaveBeenCalledWith(page('gap-1').units[0].id, 'je-voudrais');
  });

  it('unrolls the exam dialogue line by line with editable gap fields', () => {
    const pg = page('exam-dialogue');
    const { onChange } = renderItem(ExamDialogueRenderer, pg, { mode: 'exam', revealed: { 'exam-dialogue/exam-dialogue': ['exam-line-2'] } });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const fields = screen.getAllByRole('textbox');
    expect(fields).toHaveLength(2);
    fireEvent.change(fields[1], { target: { value: 'Je voudrais' } });
    expect(onChange).toHaveBeenCalledWith(pg.units[1].id, 'Je voudrais');
    expect(screen.getByText('Line 2 of 12')).toBeInTheDocument();
  });

  it('offers Next line on the exam dialogue page, then Continue', () => {
    const pg = page('exam-dialogue');
    const dispatch = vi.fn();
    const { rerender } = render(wrap(<SessionView plan={plan} record={record(pg.index)} dispatch={dispatch} remainingMs={200_000} />));
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'reveal', itemKey: 'exam-dialogue/exam-dialogue', key: 'exam-line-2' });
    rerender(wrap(<SessionView plan={plan} record={record(pg.index, { revealed: { 'exam-dialogue/exam-dialogue': Array.from({ length: 11 }, (_, n) => `exam-line-${n + 2}`) } })} dispatch={dispatch} remainingMs={200_000} />));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('reviews the exam in Replies and Dialogue accordions', () => {
    let r = record(0);
    for (let guard = 0; r.status !== 'completed' && guard < 200; guard++) {
      const pg = plan.pages[r.pageIndex];
      // Practice and the exam dialogue answered correctly, exam replies left empty.
      for (const u of pg.units) {
        const response = u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' && pg.role !== 'exam' ? u.acceptedOrders[0] : undefined;
        if (response !== undefined) r = sessionReducer(plan, r, { type: 'draft', unitId: u.id, response, now: 0 });
      }
      for (const { itemKey, keys } of requiredReveals(pg)) for (const key of keys) r = sessionReducer(plan, r, { type: 'reveal', itemKey, key, now: 0 });
      r = sessionReducer(plan, r, { type: 'continue', now: 1, interfaceLanguage: 'en' });
    }
    render(wrap(<LastTryProvider><ResultsView plan={plan} record={r} dispatch={() => undefined} /></LastTryProvider>));
    const summaries = [...document.querySelectorAll('.result-accordion summary')].map((s) => s.textContent);
    expect(summaries).toEqual(['Replies0 of 8 correct.', 'Dialogue8 of 8 correct.']);
    // Result menu (all categories): selected purple; others green (all right), red (all wrong) or red stripes (mixed).
    const menu = [...document.querySelectorAll('.result-menu button')];
    expect(menu[0]).toHaveAttribute('aria-pressed', 'true');
    expect(menu[0]).toHaveClass('is-mixed');
    expect(menu.slice(1).every((b) => b.classList.contains('is-all-right'))).toBe(true);
    expect(screen.getAllByText(/le serveur: Madame, vous désirez \?/).length).toBeGreaterThan(0);
  });
});

describe('function gender page (P4-05 review)', () => {
  it('asks the gender of every noun on one page, like vocabulary stage 4', async () => {
    const { GenderRenderer } = await import('../../src/session/vocabularyRenderers.tsx');
    const pg = page('gender');
    expect(pg.units).toHaveLength(4);
    expect(pg.units[0]).toMatchObject({ prompt: { learning: 'café' }, correct: ['masculine'], form: 'un café' });
    const { onChange } = renderItem(GenderRenderer, pg);
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    fireEvent.click(screen.getAllByRole('radio')[0]);
    expect(onChange).toHaveBeenCalledWith(pg.units[0].id, 'masculine');
  });
});

describe('function listening choice (P4-05 review)', () => {
  const pg = page('listening-1');

  it('follows word order, which follows the dialogue gaps', () => {
    const order = [...new Set(plan.pages.map((p) => p.stepId))];
    expect(order.indexOf('dialogue-gaps')).toBeLessThan(order.indexOf('word-order'));
    expect(order.indexOf('word-order')).toBe(order.indexOf('listening') - 1);
  });

  it('plays role A and four replies without showing their text, then reveals it after Check', () => {
    const { onChange } = renderItem(ListeningReplyRenderer, pg);
    // One audio control for role A and one per reply (jsdom has no voice, so they offer the install help).
    expect(document.querySelectorAll('.listening-reply .listen')).toHaveLength(5);
    expect(screen.queryByText('Bonjour, madame. Vous désirez ?')).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByText('Reply 1')).toBeInTheDocument();
    expect(screen.queryByText('Je voudrais un thé, s’il vous plaît.')).toBeNull();
    fireEvent.click(screen.getByLabelText('Reply 2'));
    expect(onChange).toHaveBeenCalledWith(pg.units[0].id, expect.stringMatching(/^o[1-4]$/));
    cleanup();
    const unit = pg.units[0];
    const wrong = unit.kind === 'choice' ? unit.options.find((o) => !unit.correct.includes(o.id))!.id : '';
    renderItem(ListeningReplyRenderer, pg, { mode: 'feedback', inlineFeedback: true, locked: { [unit.id]: { response: wrong, outcome: 'incorrect', points: 0, timedOut: false, interfaceLanguage: 'en' } } });
    expect(screen.getByText('Bonjour, madame. Vous désirez ?')).toBeInTheDocument();
    expect(screen.getByText('Je voudrais un thé, s’il vous plaît.').closest('.choice')).toHaveClass('is-right');
    expect(document.querySelector('.choice.is-wrong')).not.toBeNull();
  });

  it('needs a French voice like other listening pages', async () => {
    const { isListeningPage } = await import('../../src/domain/session/session.ts');
    expect(isListeningPage(pg)).toBe(true);
  });
});

it('colours result-menu parts by their outcome; half credit is not fully right', () => {
  expect(resultTone({ earned: 4, possible: 4 })).toBe(' is-all-right');
  expect(resultTone({ earned: 0, possible: 4 })).toBe(' is-all-wrong');
  expect(resultTone({ earned: 3.5, possible: 4 })).toBe(' is-mixed');
  expect(resultTone({ earned: 0, possible: 0 })).toBe('');
});

it('submits multiple-choice practice pages on selection, but not matching, gender or word order (P4-05 review)', () => {
  expect(isAutoSubmitPage(page('gap-1'))).toBe(true);
  expect(isAutoSubmitPage(page('listening-1'))).toBe(false); // confirmed with Check
  expect(isAutoSubmitPage(page('match-expressions-1'))).toBe(false);
  expect(isAutoSubmitPage(page('gender'))).toBe(false);
  expect(isAutoSubmitPage(page('order-1'))).toBe(false);
  expect(isAutoSubmitPage(page('exam-replies-1'))).toBe(false);
});

describe('autoplay (P4-05 review)', () => {
  it('plays role A when a dialogue gap or a listening choice opens, nothing on other pages', () => {
    expect(entryAudio(page('gap-1'))).toBe('Bonsoir, madame. Vous désirez ?');
    expect(entryAudio(page('listening-1'))).toBe('Bonjour, madame. Vous désirez ?');
    expect(entryAudio(page('order-1'))).toBeUndefined();
  });

  it('speaks the correct sentence of a gap after it is answered', () => {
    expect(correctSentences(page('gap-1'))).toBe('Je voudrais un chocolat chaud, s’il vous plaît.');
    expect(correctSentences(page('listening-1'))).toBeUndefined(); // only role A is played
    expect(correctSentences(page('order-1'))).toBe('Bonsoir, monsieur. Vous désirez ?');
    expect(correctSentences(page('match-expressions-1'))).toBeUndefined();
    expect(pronounWithForm('je', 'ai')).toBe("j'ai");
    expect(pronounWithForm('nous', 'sommes')).toBe('nous sommes');
    expect(gapSentence('Nous', 'sommes', 'français.')).toBe('Nous sommes français.');
    expect(gapSentence('Il', 'est', ', je pense.')).toBe('Il est, je pense.');
  });
});
