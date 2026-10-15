import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type PlanPage, type PlanUnit } from '../../src/domain/session/plan.ts';
import { scoreUnit, type LockedUnit, type UnitResponse } from '../../src/domain/session/session.ts';
import { ExplanationRenderer, PronounMatchRenderer, PronounTypingRenderer } from '../../src/session/grammarRenderers.tsx';
import { checkedOrder, MatchingRenderer } from '../../src/session/vocabularyRenderers.tsx';
import { promptParts, StartView } from '../../src/session/views.tsx';
import { answerText, SpotSummary, UnitsRenderer } from '../../src/session/controls.tsx';
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
  const boardOf = (plan: ReturnType<typeof sample>, rows = 6) => plan.pages.find((p) => p.items[0]?.type === 'grammar_person_matching' && p.units.length === rows)!;
  const board = boardOf(er); // the six-row forms board of aimer
  const columns = (container: HTMLElement) => [...container.querySelectorAll('.matching-columns > ul')].map((ul) => [...ul.children].map((li) => li.classList.contains('match-gap') ? '—' : li.querySelector('.match-item')!.textContent));

  it('plans one unit per French box; a form shared by several persons is right for each of them', () => {
    expect(board.units.map((u) => u.prompt.learning)).toEqual(['aime', 'aimes', 'aime', 'aimons', 'aimez', 'aiment']);
    expect(board.units[0].kind === 'choice' && board.units[0].correct).toEqual(['1sg', '3sg']);
    expect(scoreUnit(board.units[2], '1sg').points).toBe(1);
    expect(skipsFeedbackWhenCorrect(board)).toBe(true); // all right: green flash, no checked view
  });

  it('keeps the persons in order on the left, with a gap between the singular and the plural rows', () => {
    const { container } = renderPage(MatchingRenderer, er, board);
    const [left, right] = columns(container);
    expect(left).toEqual(['j’', 'tu', 'il / elle / on', '—', 'nous', 'vous', 'ils / elles']);
    expect(right[3]).toBe('—');
    expect(right.filter((x) => x !== '—').sort()).toEqual(['aime', 'aime', 'aiment', 'aimes', 'aimez', 'aimons']);
    expect(container.querySelector('.matching.has-gap')).not.toBeNull();
  });

  it('shows three rows without a gap when the board covers one number, and translates pronouns', () => {
    const fixture = pageOf(planOf(), 'grammar_person_matching');
    const three = renderPage(MatchingRenderer, planOf(), fixture);
    expect(columns(three.container)[0]).toEqual(['je', 'tu', 'il / elle']);
    expect(three.container.querySelector('.has-gap')).toBeNull();
    cleanup();
    const pronouns = sample('fr-subject-pronouns');
    const translation = renderPage(MatchingRenderer, pronouns, boardOf(pronouns));
    expect(columns(translation.container)[0]).toEqual(['I', 'you (one friend)', 'he', '—', 'we', 'you (several people)', 'they (men or a mixed group)']);
  });

  it('after Check moves every French box level with a correct partner, also for shared forms', () => {
    const rows = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
    const units = board.units as (PlanUnit & { kind: 'choice' })[];
    // The second aime was paired with je, the first one with il: both are right and keep their rows.
    const pairs: Record<string, string> = { [units[2].id]: '1sg', [units[0].id]: '3sg', [units[1].id]: '1pl', [units[3].id]: '2sg' };
    const order = checkedOrder(units, rows, (id) => pairs[id]);
    expect(order.map((u) => u.id)).toEqual([units[2].id, units[1].id, units[0].id, units[3].id, units[4].id, units[5].id]);
  });
});

describe('grammar start page (P3-02 review)', () => {
  it('outlines the lesson as lettered sections (P6-01 review): each block with its numbered points, then the exam', () => {
    const plan = planOf();
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><StartView plan={plan} level="A1" onStart={() => undefined} onResume={() => undefined} /></PreferencesProvider>);
    expect(screen.getByRole('heading', { name: 'Lesson outline' })).toBeInTheDocument();
    const sections = [...document.querySelectorAll('.flow-section')];
    expect(sections).toHaveLength(3); // two blocks and the exam; no feedback row
    expect(sections.map((s) => s.querySelector('.flow-letter')!.textContent)).toEqual(['A', 'B', 'C']);
    const points = (n: number) => [...sections[n].querySelectorAll('.flow-points li')].map((li) => li.textContent);
    expect(points(0)[0]).toMatch(/^1/);
    expect(points(0).slice(1)).toEqual(['2Match forms to pronouns', '3Choose the missing form', '4Singular forms']);
    expect(points(1)[0]).toMatch(/^5/);
    expect(sections[2]).toHaveTextContent(/Final exam.*Answer 5 questions on 2 timed pages/);
    expect(sections[2].querySelector('.flow-points')).toBeNull();
    for (const section of sections) expect(section.getAttribute('style')).toMatch(/--review-color/);
  });
});

describe('P3-02 review: final full stops and one-row matching', () => {
  const CONTENT = resolve(import.meta.dirname, '../../content');
  const sample = (id: string) => buildPlan(lessonOf(CONTENT, id), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en');

  it('leaves out the full stop that ends a word-order sentence, but keeps a final question mark', () => {
    const order = (id: string) => sample(id).pages.flatMap((p) => p.units).filter((u) => u.kind === 'order') as (PlanUnit & { kind: 'order' })[];
    const fixtureOrders = buildPlan(lessonOf(FIXTURES, 'fr-negation-ne-pas'), JSON.parse(readFileSync(join(FIXTURES, 'briefs', 'fr-negation-ne-pas.json'), 'utf8')), 'en').pages.flatMap((p) => p.units).filter((u) => u.kind === 'order') as (PlanUnit & { kind: 'order' })[];
    expect(fixtureOrders.length).toBeGreaterThan(0); // the fixture still ends its sentences with a "." token
    for (const u of [...fixtureOrders, ...order('fr-negation-ne-pas')]) {
      expect(u.tokens.at(-1)?.text).not.toBe('.');
      expect(u.tokens.map((t) => t.text)).not.toContain('.');
      expect(u.answer).not.toMatch(/\.$/);
      expect(u.acceptedOrders.every((o) => o.length === u.tokens.length)).toBe(true);
      expect(scoreUnit(u, u.acceptedOrders[0]).points).toBe(1);
    }
    expect(order('fr-yes-no-questions').some((u) => u.answer.endsWith('?'))).toBe(true);
  });

  it('shows a one-row pronoun match as a multiple-choice gap after the pronoun', () => {
    const plan = planOf((c) => {
      if (c.kind !== 'grammar') return;
      const item = c.steps[1].pages[0].items[0];
      if (item.type === 'grammar_pronoun_form_match') { item.rows = item.rows.slice(0, 1); item.tokens.push({ tokenId: 't-extra', text: 'sommes' }); }
    });
    const page = plan.pages.find((p) => p.items[0]?.type === 'grammar_pronoun_form_match')!;
    expect(skipsFeedbackWhenCorrect(page)).toBe(true); // a right choice flashes green and moves on
    const { container } = renderPage(PronounMatchRenderer, plan, page);
    expect(screen.queryByRole('group', { name: 'Available forms' })).toBeNull();
    expect(container.querySelector('.gap-sentence')).toHaveTextContent(`${page.units[0].prompt.learning} ____`);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });
});

describe('results task columns (P3-02 review)', () => {
  const t = (key: string) => (key === 'session.typeWhatYouHear' ? 'Write what you hear' : key);
  const CONTENT = resolve(import.meta.dirname, '../../content');
  const sample = (id: string) => buildPlan(lessonOf(CONTENT, id), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en');

  it('gives word order no task text instead of "Write what you hear"', () => {
    const units = sample('fr-negation-ne-pas').pages.flatMap((p) => p.units);
    for (const u of units.filter((x) => x.kind === 'order')) expect(promptParts(u, t as never)).toEqual([]);
    expect(units.flatMap((u) => promptParts(u, t as never))).not.toContain('Write what you hear');
  });

  it('splits a task at its arrows and keeps "Write what you hear" for dictation', () => {
    const plurals = sample('fr-regular-noun-plurals').pages.flatMap((p) => p.units);
    expect(plurals.some((u) => promptParts(u, t as never).length === 2)).toBe(true);
    const dictation = buildPlan(lessonOf(FIXTURES, 'fr-classroom-objects'), JSON.parse(readFileSync(join(FIXTURES, 'briefs', 'fr-classroom-objects.json'), 'utf8')), 'en')
      .pages.flatMap((p) => p.units).find((u) => u.itemType === 'vocabulary_listening_dictation')!;
    expect(promptParts(dictation, t as never)).toEqual(['Write what you hear']);
  });
});

describe('gap choice hint (P3-02 review)', () => {
  it('shows the cue on its own line above the sentence, in the interface language, not in the exam', () => {
    const CONTENT = resolve(import.meta.dirname, '../../content');
    const id = 'fr-here-there-now-tomorrow';
    const plan = buildPlan(lessonOf(CONTENT, id), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en');
    const page = plan.pages.find((p) => p.items[0]?.type === 'grammar_gap_choice' && /à côté de la porte/.test(p.units[0].prompt.after ?? ''))!;
    const { container } = renderPage(UnitsRenderer, plan, page);
    const hint = container.querySelector('.gap-hint')!;
    expect(hint).toHaveTextContent('here, where I am');
    expect(hint.compareDocumentPosition(container.querySelector('.gap-sentence')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // A comma follows the gap directly (P3-07).
    expect(container.querySelector('.gap-sentence')).toHaveTextContent(/^Viens, je suis ____, à côté de la porte\.$/);
  });
});

describe('new verbs (P3-07)', () => {
  it('lists the lesson’s new verbs with the mother-tongue translation on the start page and the first explanation page', () => {
    const plan = planOf();
    expect(plan.newVerbs).toEqual([{ infinitive: 'être', translation: 'to be' }]);
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><StartView plan={plan} level="A1" onStart={() => undefined} onResume={() => undefined} /></PreferencesProvider>);
    const table = screen.getByRole('heading', { name: 'New verbs' }).parentElement!;
    expect(within(table).getByRole('rowheader')).toHaveTextContent('être');
    expect(within(table).getByRole('cell')).toHaveTextContent('to be');
    cleanup();
    const explanations = plan.pages.filter((p) => p.items[0]?.type === 'grammar_explanation');
    renderPage(ExplanationRenderer, plan, explanations[0]);
    expect(screen.getByRole('heading', { name: 'New verbs' })).toBeInTheDocument();
    cleanup();
    renderPage(ExplanationRenderer, plan, explanations[1]);
    expect(screen.queryByRole('heading', { name: 'New verbs' })).toBeNull();
  });

  it('shows the translation in the chosen mother tongue', () => {
    const plan = buildPlan(lessonOf(FIXTURES, GRAM), brief, 'de');
    expect(plan.newVerbs).toEqual([{ infinitive: 'être', translation: 'sein' }]);
  });
});

describe('error spotter (P3-07 review)', () => {
  it('shows the correction only after a word is selected', () => {
    const plan = planOf();
    const page = plan.pages.find((p) => p.items[0]?.type === 'grammar_error_spotter')!;
    const unit = page.units[0];
    renderPage(UnitsRenderer, plan, page);
    expect(screen.queryByText('Correction')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    cleanup();
    renderPage(UnitsRenderer, plan, page, { drafts: { [unit.id]: { tokenId: unit.kind === 'spot' ? unit.tokens[0].id : '', text: '' } } });
    expect(screen.getByText('Correction')).toBeInTheDocument();
  });
});

describe('error spotter feedback (feedback #16)', () => {
  const plan = planOf();
  const unit = plan.pages.flatMap((p) => p.units).find((u) => u.kind === 'spot')!;
  if (unit.kind !== 'spot') throw new Error('no error spotter in the fixture');
  const wrong = unit.tokens.find((tk) => tk.id !== unit.faultyTokenId)!;

  it('shows the corrected sentence without bracket markup', () => {
    const text = answerText(unit, { tokenId: unit.faultyTokenId, text: 'XX' }, (k) => k);
    expect(text).not.toMatch(/[[\]]/);
    expect(text).toContain('XX');
  });

  it('names the selected word, says when it was not the mistake and repeats the correction', () => {
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><SpotSummary unit={unit} response={{ tokenId: wrong.id, text: 'zz' }} lang="fr" /></PreferencesProvider>);
    expect(screen.getByText(`Selected word: ${wrong.text}`)).toBeInTheDocument();
    expect(screen.getByText(`“${wrong.text}” is not the mistake in this sentence.`)).toBeInTheDocument();
    expect(screen.getByText('Your correction: zz')).toBeInTheDocument();
  });
});

describe('word order and error spotter (P3-04)', () => {
  /** The être fixture with a practice word-order page: a repeated word and punctuation are tokens. */
  const orderPlan = () => planOf((c) => {
    if (c.kind !== 'grammar') return;
    const step = c.steps[1]; // the first exercise step
    step.pages.unshift({
      pageId: 'order', estimatedDurationS: 25, timeLimitS: null, instructions: step.pages[0].instructions,
      items: [{
        type: 'grammar_word_order', itemId: 'order-1', ruleIds: ['r-plural'], answerExplanation: { en: 'e', fr: 'e', de: 'e' },
        tokens: [{ tokenId: 'e', text: 'ensuite' }, { tokenId: 'c', text: ',' }, { tokenId: 'n1', text: 'nous' }, { tokenId: 'n2', text: 'nous' }, { tokenId: 'v', text: 'lavons' }],
        acceptedOrders: [['e', 'c', 'n1', 'n2', 'v']],
      }],
    });
  });
  const plan = orderPlan();
  const page = plan.pages.find((p) => p.pageId === 'order')!;
  const unit = page.units[0] as PlanUnit & { kind: 'order' };

  /** UnitsRenderer whose answers are kept in state, so focus can be followed across renders. */
  function Stateful({ initial }: { initial: Record<string, UnitResponse> }) {
    const [drafts, setDrafts] = useState(initial);
    const props: RendererProps = {
      item: page.items[0], units: page.units, plan, mode: 'answering', drafts, locked: {}, seed: 1, motherTongue: 'en',
      onChange: (id, response) => setDrafts((d) => ({ ...d, [id]: response })), pageId: page.pageId, revealed: {}, onReveal: () => undefined,
    };
    return <><UnitsRenderer {...props} /><output data-testid="order">{JSON.stringify(drafts[unit.id] ?? [])}</output></>;
  }
  const renderStateful = (order: string[] = []) => render(
    <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><Stateful initial={{ [unit.id]: order }} /></PreferencesProvider>,
  );
  const current = () => JSON.parse(screen.getByTestId('order').textContent ?? '[]') as string[];
  const line = () => within(screen.getByRole('group', { name: 'Your sentence' }));
  const bank = () => within(screen.getByRole('group', { name: 'Available words' }));

  it('labels the sentence line and the word bank, and names each placed word with its position', () => {
    renderStateful(['e', 'c']);
    expect(line().getByRole('button', { name: /^ensuite, position 1 of 2\./ })).toBeInTheDocument();
    expect(bank().getAllByRole('button').map((b) => b.textContent).sort()).toEqual(['lavons', 'nous', 'nous']);
  });

  it('moves a placed word with the arrow keys, Home and End, and keeps it focused', () => {
    renderStateful(['e', 'c', 'n1', 'n2', 'v']);
    const lavons = () => line().getByRole('button', { name: /^lavons,/ });
    lavons().focus();
    fireEvent.keyDown(lavons(), { key: 'ArrowLeft' });
    expect(current()).toEqual(['e', 'c', 'n1', 'v', 'n2']);
    expect(document.activeElement).toBe(lavons());
    fireEvent.keyDown(lavons(), { key: 'Home' });
    expect(current()).toEqual(['v', 'e', 'c', 'n1', 'n2']);
    expect(document.activeElement).toBe(lavons());
    fireEvent.keyDown(lavons(), { key: 'ArrowLeft' }); // already first: nothing changes
    expect(current()).toEqual(['v', 'e', 'c', 'n1', 'n2']);
    fireEvent.keyDown(lavons(), { key: 'End' });
    expect(current()).toEqual(['e', 'c', 'n1', 'n2', 'v']);
    expect(lavons()).toHaveAccessibleName(/position 5 of 5/);
  });

  it('keeps focus near a word that is placed or sent back', () => {
    renderStateful();
    bank().getAllByRole('button')[0].focus();
    const first = bank().getAllByRole('button')[0];
    fireEvent.click(first);
    expect(current()).toHaveLength(1);
    expect(document.activeElement).toBe(bank().getAllByRole('button')[0]); // the next word in the bank
    const placed = line().getAllByRole('button')[0];
    fireEvent.click(placed);
    expect(current()).toEqual([]);
    expect(document.activeElement?.closest('.order-bank')).not.toBeNull(); // the line is empty: back to the bank
  });

  it('places repeated words as separate tokens and accepts them in either token order', () => {
    renderStateful(['e', 'c']);
    for (const b of bank().getAllByRole('button', { name: 'nous' })) fireEvent.click(b);
    expect(current().slice(2).sort()).toEqual(['n1', 'n2']);
    expect(bank().queryByRole('button', { name: 'nous' })).toBeNull();
    expect(scoreUnit(unit, ['e', 'c', 'n2', 'n1', 'v']).points).toBe(1);
    expect(scoreUnit(unit, ['c', 'e', 'n1', 'n2', 'v']).points).toBe(0); // punctuation is placed like a word
  });

  describe('error spotter', () => {
    const spotPage = pageOf(planOf(), 'grammar_error_spotter');
    const spot = spotPage.units[0] as PlanUnit & { kind: 'spot' };
    const selectSpot = { ...spot, correction: { mode: 'select' as const, accepted: { answers: ['êtes'] }, choices: ['es', 'êtes', 'sont', 'est'] } };

    it('offers the sentence words as a labelled group of toggle buttons', () => {
      renderPage(UnitsRenderer, planOf(), spotPage);
      const words = within(screen.getByRole('group', { name: 'Select the wrong word' })).getAllByRole('button');
      expect(words.map((b) => b.textContent)).toEqual(['Vous', 'est', 'prêts.']);
      for (const w of words) expect(w).toHaveAttribute('aria-pressed', 'false');
    });

    it('needs both the detection and the repair', () => {
      expect(scoreUnit(spot, { tokenId: 'w2', text: 'êtes' })).toEqual({ outcome: 'fully_correct', points: 1 });
      expect(scoreUnit(spot, { tokenId: 'w2', text: 'etes' })).toMatchObject({ points: 0.5 }); // typed: accent slip is half credit
      expect(scoreUnit(spot, { tokenId: 'w2', text: 'sont' })).toEqual({ outcome: 'incorrect', points: 0 }); // detected, not repaired
      expect(scoreUnit(spot, { tokenId: 'w1', text: 'êtes' })).toEqual({ outcome: 'incorrect', points: 0 }); // repair on the wrong word
      expect(scoreUnit(selectSpot, { tokenId: 'w2', text: 'êtes' }).points).toBe(1);
      expect(scoreUnit(selectSpot, { tokenId: 'w2', text: 'es' }).points).toBe(0);
    });
  });
});
