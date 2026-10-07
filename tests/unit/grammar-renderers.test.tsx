import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type PlanPage, type PlanUnit } from '../../src/domain/session/plan.ts';
import { scoreUnit, type LockedUnit } from '../../src/domain/session/session.ts';
import { PronounMatchRenderer, PronounTypingRenderer } from '../../src/session/grammarRenderers.tsx';
import { checkedOrder, MatchingRenderer } from '../../src/session/vocabularyRenderers.tsx';
import { StartView } from '../../src/session/views.tsx';
import { skipsFeedbackWhenCorrect } from '../../src/domain/session/session.ts';
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

describe('person matching (P3-02 review)', () => {
  const CONTENT = resolve(import.meta.dirname, '../../content');
  const sample = (id: string) => buildPlan(lessonOf(CONTENT, id), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en');
  const er = sample('fr-er-verbs-present');
  const board = pageOf(er, 'grammar_person_matching');
  const columns = (container: HTMLElement) => [...container.querySelectorAll('.matching-columns > ul')].map((ul) => [...ul.children].map((li) => li.classList.contains('match-gap') ? '—' : li.querySelector('.match-item')!.textContent));

  it('plans one unit per French box; a form shared by several persons is right for each of them', () => {
    expect(board.units.map((u) => u.prompt.learning)).toEqual(['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent']);
    expect(board.units[0].kind === 'choice' && board.units[0].correct).toEqual(['1sg', '3sg']);
    expect(scoreUnit(board.units[2], '1sg').points).toBe(1);
    expect(skipsFeedbackWhenCorrect(board)).toBe(true); // all right: green flash, no checked view
  });

  it('keeps the persons in order on the left, with a gap between the singular and the plural rows', () => {
    const { container } = renderPage(MatchingRenderer, er, board);
    const [left, right] = columns(container);
    expect(left).toEqual(['je', 'tu', 'il / elle / on', '—', 'nous', 'vous', 'ils / elles']);
    expect(right[3]).toBe('—');
    expect(right.filter((x) => x !== '—').sort()).toEqual(['parle', 'parle', 'parlent', 'parles', 'parlez', 'parlons']);
    expect(container.querySelector('.matching.has-gap')).not.toBeNull();
  });

  it('shows three rows without a gap when the board covers one number, and translates pronouns', () => {
    const fixture = pageOf(planOf(), 'grammar_person_matching');
    const three = renderPage(MatchingRenderer, planOf(), fixture);
    expect(columns(three.container)[0]).toEqual(['je', 'tu', 'il / elle']);
    expect(three.container.querySelector('.has-gap')).toBeNull();
    cleanup();
    const pronouns = sample('fr-subject-pronouns');
    const translation = renderPage(MatchingRenderer, pronouns, pageOf(pronouns, 'grammar_person_matching'));
    expect(columns(translation.container)[0]).toEqual(['I', 'you (one friend)', 'he', '—', 'we', 'you (several people)', 'they (men or a mixed group)']);
  });

  it('after Check moves every French box level with a correct partner, also for shared forms', () => {
    const rows = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
    const units = board.units as (PlanUnit & { kind: 'choice' })[];
    // The second parle was paired with je, the first one with il: both are right and keep their rows.
    const pairs: Record<string, string> = { [units[2].id]: '1sg', [units[0].id]: '3sg', [units[1].id]: '1pl', [units[3].id]: '2sg' };
    const order = checkedOrder(units, rows, (id) => pairs[id]);
    expect(order.map((u) => u.id)).toEqual([units[2].id, units[1].id, units[0].id, units[3].id, units[4].id, units[5].id]);
  });
});

describe('grammar start page (P3-02 review)', () => {
  it('outlines the lesson flow: one coloured part per teaching block with its exercises, then the exam', () => {
    const plan = planOf();
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><StartView plan={plan} level="A1" onStart={() => undefined} onResume={() => undefined} /></PreferencesProvider>);
    const parts = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(screen.getByRole('heading', { name: 'Lesson outline' })).toBeInTheDocument();
    expect(parts).toHaveLength(3); // two blocks and the exam; no feedback row
    expect(parts[0]).toHaveTextContent('Pronoun–form matching · Multiple-choice gaps · Person matching'); // no "Explanation"
    expect(parts[0]).not.toHaveTextContent('Explanation');
    expect(parts[1]).toHaveTextContent('Pronoun–form typing · Typed gaps · Error spotting');
    expect(parts[2]).toHaveTextContent(/Final exam.*Answer 5 items on 2 timed pages/);
    for (const part of parts) expect(part.getAttribute('style')).toMatch(/--review-color/);
  });
});

describe('P3-02 review: final full stops and one-row matching', () => {
  const CONTENT = resolve(import.meta.dirname, '../../content');
  const sample = (id: string) => buildPlan(lessonOf(CONTENT, id), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en');

  it('leaves out the full stop that ends a word-order sentence, but keeps a final question mark', () => {
    const order = (id: string) => sample(id).pages.flatMap((p) => p.units).filter((u) => u.kind === 'order') as (PlanUnit & { kind: 'order' })[];
    for (const u of order('fr-negation-ne-pas')) {
      expect(u.tokens.at(-1)?.text).not.toBe('.');
      expect(u.tokens.map((t) => t.text)).not.toContain('.');
      expect(u.answer).not.toMatch(/\.$/);
      expect(u.acceptedOrders.every((o) => o.length === u.tokens.length)).toBe(true);
      expect(scoreUnit(u, u.acceptedOrders[0]).points).toBe(1);
    }
    expect(order('fr-yes-no-questions').every((u) => u.answer.endsWith('?'))).toBe(true);
  });

  it('shows a one-row pronoun match as a multiple-choice gap after the pronoun', () => {
    const plan = sample('fr-er-verbs-present');
    const page = plan.pages.find((p) => p.items[0]?.type === 'grammar_pronoun_form_match' && p.units.length === 1)!;
    expect(skipsFeedbackWhenCorrect(page)).toBe(true); // a right choice flashes green and moves on
    const { container } = renderPage(PronounMatchRenderer, plan, page);
    expect(screen.queryByRole('group', { name: 'Available forms' })).toBeNull();
    expect(container.querySelector('.gap-sentence')).toHaveTextContent(`${page.units[0].prompt.learning} ____`);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});
