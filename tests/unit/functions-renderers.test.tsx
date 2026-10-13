import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { buildPlan, type PlanPage } from '../../src/domain/session/plan.ts';
import { nextDialogueLine, presentationComplete, sessionReducer, skipsFeedbackWhenCorrect, startSession, type SessionRecord } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import type { RendererProps } from '../../src/session/controls.tsx';
import { DialogueRenderer, FunctionFlashcardsRenderer } from '../../src/session/functionsRenderers.tsx';
import { MatchingRenderer } from '../../src/session/vocabularyRenderers.tsx';
import { SessionView } from '../../src/session/views.tsx';

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
  it('shows the French expression on the front and translation, explanation and example on the back', () => {
    const { onReveal } = renderItem(FunctionFlashcardsRenderer, page('cards-expressions'));
    const card = screen.getByRole('article', { name: 'Card 2 of 8' });
    const [front, back] = card.querySelectorAll('.flashcard-face');
    expect(front).toHaveTextContent('Je voudrais …');
    expect(front.querySelector('[lang="fr"]')).toHaveTextContent('Je voudrais …');
    expect(back).toHaveTextContent('Ich hätte gern');
    expect(back).toHaveTextContent('The polite way to order');
    expect(back).toHaveTextContent('Je voudrais un café, s’il vous plaît. – Ich hätte gern einen Kaffee, bitte.');
    fireEvent.click(within(card).getByRole('button', { name: 'Turn to the translation' }));
    expect(card).toHaveClass('is-flipped');
    expect(onReveal).toHaveBeenCalledWith('cards-expressions/cards-expressions', 'je-voudrais');
    fireEvent.click(within(card).getByRole('button', { name: 'Flip card back' }));
    expect(onReveal).toHaveBeenCalledTimes(1);
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
