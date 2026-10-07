import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type PlanPage } from '../../src/domain/session/plan.ts';
import { scoreUnit, type LockedUnit } from '../../src/domain/session/session.ts';
import { PronounMatchRenderer, PronounTypingRenderer } from '../../src/session/grammarRenderers.tsx';
import type { RendererProps } from '../../src/session/controls.tsx';

afterEach(cleanup);
const FIXTURES = resolve(import.meta.dirname, '../fixtures/content');
const GRAM = 'fr-verb-etre-present';
const brief = JSON.parse(readFileSync(join(FIXTURES, 'briefs', `${GRAM}.json`), 'utf8'));
const planOf = (mutate?: (content: ReturnType<typeof lessonOf>) => void) => {
  const content = lessonOf(FIXTURES, GRAM);
  mutate?.(content);
  return buildPlan(content, brief, 'en');
};
const pageOf = (plan: ReturnType<typeof planOf>, type: string) => plan.pages.find((p) => p.items[0]?.type === type)!;

function renderPage(Renderer: typeof PronounMatchRenderer, plan: ReturnType<typeof planOf>, page: PlanPage, extra: Partial<RendererProps> = {}) {
  const onChange = vi.fn();
  const props: RendererProps = {
    item: page.items[0], units: page.units, plan, mode: 'answering', drafts: {}, locked: {}, onChange, seed: 1, motherTongue: 'en',
    pageId: page.pageId, revealed: {}, onReveal: () => undefined, ...extra,
  };
  const view = render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><Renderer {...props} /></PreferencesProvider>);
  return { ...view, onChange, props };
}
const locked = (response: string, outcome: LockedUnit['outcome'], points: number): LockedUnit => ({ response, outcome, points, timedOut: false, interfaceLanguage: 'en' });

describe('pronoun/form matching (P3-02)', () => {
  const plan = planOf();
  const page = pageOf(plan, 'grammar_pronoun_form_match');
  const row = (pronoun: string) => page.units.find((u) => u.prompt.learning === pronoun)!;
  const bank = () => within(screen.getByRole('group', { name: 'Available forms' }));

  it('renders the generated rows and the form bank, without assuming six persons', () => {
    renderPage(PronounMatchRenderer, plan, page);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(bank().getAllByRole('button').map((b) => b.textContent).sort()).toEqual(['es', 'est', 'suis']);
    expect(screen.getByRole('button', { name: 'je: no form yet' })).toBeInTheDocument();
    expect(screen.queryByText(/rows filled/)).toBeNull();
  });

  it('places a selected form in a row, or a selected row receives a form', () => {
    const { onChange } = renderPage(PronounMatchRenderer, plan, page);
    fireEvent.click(bank().getByRole('button', { name: 'suis' }));
    expect(bank().getByRole('button', { name: 'suis' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'je: no form yet' }));
    fireEvent.click(screen.getByRole('button', { name: 'tu: no form yet' }));
    fireEvent.click(bank().getByRole('button', { name: 'es' }));
    expect(onChange.mock.calls).toEqual([[row('je').id, 't-suis'], [row('tu').id, 't-es']]);
  });

  it('fills a selected row from the bank and puts a clicked form back in the bank', () => {
    const drafts = { [row('je').id]: 't-est' };
    const { onChange } = renderPage(PronounMatchRenderer, plan, page, { drafts });
    expect(bank().queryByRole('button', { name: 'est' })).toBeNull(); // a placed token leaves the bank
    expect(screen.getByRole('button', { name: 'je: est' })).toBeInTheDocument();
    // Select the empty row il / elle first, then a form from the bank.
    fireEvent.click(screen.getByRole('button', { name: 'il / elle: no form yet' }));
    fireEvent.click(bank().getByRole('button', { name: 'suis' }));
    fireEvent.click(screen.getByRole('button', { name: 'je: est' })); // back to the bank
    expect(onChange.mock.calls).toEqual([[row('il / elle').id, 't-suis'], [row('je').id, '']]);
  });

  it('keeps duplicate form texts as separate tokens that are both valid', () => {
    const dup = planOf((c) => {
      if (c.kind !== 'grammar') return;
      const item = c.steps[1].pages[0].items[0];
      if (item.type !== 'grammar_pronoun_form_match') return;
      item.tokens = [{ tokenId: 't-est-1', text: 'est' }, { tokenId: 't-est-2', text: 'est' }, { tokenId: 't-sont', text: 'sont' }];
      item.rows = [
        { rowId: 'il', pronoun: 'il', validForms: ['est'], answerExplanation: item.rows[0].answerExplanation },
        { rowId: 'elle', pronoun: 'elle', validForms: ['est'], answerExplanation: item.rows[0].answerExplanation },
      ];
    });
    const dupPage = pageOf(dup, 'grammar_pronoun_form_match');
    const [il, elle] = dupPage.units;
    renderPage(PronounMatchRenderer, dup, dupPage, { drafts: { [il.id]: 't-est-2' } });
    expect(bank().getAllByRole('button').map((b) => b.textContent).sort()).toEqual(['est', 'sont']); // the other est stays
    expect(scoreUnit(il, 't-est-2').points).toBe(1);
    expect(scoreUnit(elle, 't-est-1').points).toBe(1);
    expect(scoreUnit(elle, 't-sont').points).toBe(0);
  });

  it('marks rows in place after Check: right green, wrong red with the correct form and its explanation', () => {
    const lockedUnits = { [row('je').id]: locked('t-suis', 'fully_correct', 1), [row('tu').id]: locked('t-est', 'incorrect', 0), [row('il / elle').id]: locked('t-es', 'incorrect', 0) };
    const { container } = renderPage(PronounMatchRenderer, plan, page, { mode: 'feedback', locked: lockedUnits });
    expect(screen.getByText('1 of 3 rows correct.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Available forms' })).toBeNull();
    expect(container.querySelectorAll('.form-row.is-right')).toHaveLength(1);
    const wrong = container.querySelectorAll('.form-row.is-wrong');
    expect(wrong).toHaveLength(2);
    expect(wrong[0]).toHaveTextContent('Correct answer: es');
    expect(wrong[0]).toHaveTextContent('Tu takes es; est is the form for il or elle.');
    expect(container.querySelector('.form-row.is-right .row-explanation')).toBeNull();
    for (const slot of screen.getAllByRole('button')) expect(slot).toBeDisabled();
  });
});

describe('pronoun/form typing (P3-02)', () => {
  const plan = planOf();
  const page = pageOf(plan, 'grammar_pronoun_form_typing');
  const row = (pronoun: string) => page.units.find((u) => u.prompt.learning === pronoun)!;

  it('renders one labelled field per generated row', () => {
    const { onChange } = renderPage(PronounTypingRenderer, plan, page);
    expect(screen.getAllByRole('textbox')).toHaveLength(page.units.length);
    fireEvent.change(screen.getByRole('textbox', { name: 'Form for nous' }), { target: { value: 'sommes' } });
    expect(onChange).toHaveBeenCalledWith(row('nous').id, 'sommes');
  });

  it('normalizes typed forms: surrounding spaces are ignored, accents and case give half credit', () => {
    const vous = row('vous');
    expect(scoreUnit(vous, '  êtes ').points).toBe(1);
    expect(scoreUnit(vous, 'etes')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(vous, 'Êtes')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(vous, 'sont').points).toBe(0);
  });

  it('marks each row in place after Check, with the correct form and explanation for wrong or almost rows', () => {
    const lockedUnits = Object.fromEntries(page.units.map((u) => [u.id, u === row('vous') ? locked('etes', 'orthography_only', 0.5) : locked(u.kind === 'text' ? u.accepted.answers[0] : '', 'fully_correct', 1)]));
    const { container } = renderPage(PronounTypingRenderer, plan, page, { mode: 'feedback', locked: lockedUnits });
    expect(container.querySelectorAll('.text-input.is-right')).toHaveLength(page.units.length - 1);
    const almost = container.querySelector('.text-input.is-almost')!.closest('li')!;
    expect(almost).toHaveTextContent('Correct answer: êtes');
    expect(almost).toHaveTextContent('Vous takes êtes, with an accent circonflexe on e.');
    expect(container.querySelectorAll('.row-explanation')).toHaveLength(1);
  });

  it('shows no marks on exam pages and counts a missing row as zero', () => {
    const exam = plan.pages.find((p) => p.role === 'exam' && p.items[0].type === 'grammar_pronoun_form_typing')!;
    const { container } = renderPage(PronounTypingRenderer, plan, exam, { mode: 'exam', drafts: { [exam.units[0].id]: 'wrong' } });
    expect(container.querySelectorAll('.is-right, .is-wrong, .is-almost, .inline-answer, .row-explanation')).toHaveLength(0);
    expect(scoreUnit(exam.units[0], undefined)).toEqual({ outcome: 'unanswered', points: 0 });
  });
});
