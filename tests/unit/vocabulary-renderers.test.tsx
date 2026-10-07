import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { buildPlan } from '../../src/domain/session/plan.ts';
import { GenderRenderer, MatchingRenderer } from '../../src/session/vocabularyRenderers.tsx';

afterEach(cleanup);
const FIXTURES = resolve(import.meta.dirname, '../fixtures/content');
const load = (dir: string) => JSON.parse(readFileSync(join(FIXTURES, dir, 'fr-classroom-objects.json'), 'utf8'));
const plan = buildPlan(load('lessons'), load('briefs'), 'en');
const page = plan.pages.find((p) => p.items[0].type === 'vocabulary_matching')!;

function renderMatching(seed: number, drafts: Record<string, string> = {}, onChange = vi.fn()) {
  render(
    <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>
      <MatchingRenderer item={page.items[0]} units={page.units} plan={plan} mode="answering" drafts={drafts} locked={{}} onChange={onChange}
        seed={seed} motherTongue="en" pageId={page.pageId} revealed={{}} onReveal={() => undefined} />
    </PreferencesProvider>,
  );
  const [native, french] = screen.getAllByRole('list').map((l) => [...l.querySelectorAll('.match-item')].map((b) => b.textContent!));
  cleanup();
  return { native, french, onChange };
}

it('shuffles both columns independently per seed, keeping every item exactly once', () => {
  const orders = Array.from({ length: 8 }, (_, seed) => renderMatching(seed + 1));
  for (const { native, french } of orders) {
    expect([...native].sort()).toEqual(['book', 'chair', 'pen', 'table']);
    expect(french.map((f) => f.replace(/(Masculine|Feminine)$/, '')).sort()).toEqual(['un livre', 'un stylo', 'une chaise', 'une table']);
  }
  const relative = (o: { native: string[]; french: string[] }) => o.native.map((n) => o.french.findIndex((f) => f.includes({ book: 'livre', chair: 'chaise', pen: 'stylo', table: 'table' }[n]!))).join();
  expect(new Set(orders.map(relative)).size).toBeGreaterThan(1);
});

it('records a pair by target identity and moves an option away from its previous partner', () => {
  const onChange = vi.fn();
  const livre = page.units.find((u) => u.kind === 'choice' && u.correct[0] === 'livre')!;
  const chaise = page.units.find((u) => u.kind === 'choice' && u.correct[0] === 'chaise')!;
  render(
    <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>
      <MatchingRenderer item={page.items[0]} units={page.units} plan={plan} mode="answering" drafts={{ [chaise.id]: 'livre' }} locked={{}} onChange={onChange}
        seed={3} motherTongue="en" pageId={page.pageId} revealed={{}} onReveal={() => undefined} />
    </PreferencesProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: /^book/ }));
  fireEvent.click(screen.getByRole('button', { name: /^un livre/ }));
  expect(onChange.mock.calls).toEqual([[chaise.id, ''], [livre.id, 'livre']]);
});

const content = (dir: string) => JSON.parse(readFileSync(join(resolve(import.meta.dirname, '../../content'), dir, 'fr-countries-and-nationalities.json'), 'utf8'));
const countries = buildPlan(content('lessons'), content('briefs'), 'en');
const genderPage = countries.pages.find((p) => p.items[0].type === 'vocabulary_gender_select')!;
const renderGender = (mode: 'answering' | 'feedback', locked: Record<string, { response: string; outcome: string; points: number; timedOut: boolean; interfaceLanguage: 'en' }> = {}) =>
  render(
    <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>
      <GenderRenderer item={genderPage.items[0]} units={genderPage.units} plan={countries} mode={mode} drafts={{}} locked={locked as never} onChange={() => undefined}
        seed={1} motherTongue="en" pageId={genderPage.pageId} revealed={{}} onReveal={() => undefined} />
    </PreferencesProvider>,
  );

it('shows every word on the gender page: nouns as bare lemmas with gender choices, other words without input', () => {
  const { container } = renderGender('answering');
  const rows = container.querySelectorAll('.gender-row');
  expect(rows).toHaveLength(countries.targets.size);
  const nouns = [...countries.targets.values()].filter((t) => t.wordClass === 'noun');
  expect(container.querySelectorAll('fieldset.gender-options')).toHaveLength(nouns.length);
  expect(screen.getAllByText('no gender')).toHaveLength(countries.targets.size - nouns.length);
  expect(container.textContent).not.toMatch(/\b(un|une|le|la) /); // no articles while answering
  expect(container.querySelector('.icon-button, .listen')).toBeNull(); // no audio clues
});

it('turns into the reviewed overview: summary, all words, the wrong choice under the correct gender', () => {
  const units = genderPage.units.filter((u) => u.kind === 'choice');
  const locked = Object.fromEntries(units.map((u, n) => [u.id, n === 0
    ? { response: u.kind === 'choice' && u.correct[0] === 'feminine' ? 'masculine' : 'feminine', outcome: 'incorrect', points: 0, timedOut: false, interfaceLanguage: 'en' as const }
    : { response: u.kind === 'choice' ? u.correct[0] : '', outcome: 'fully_correct', points: 1, timedOut: false, interfaceLanguage: 'en' as const }]));
  const { container } = renderGender('feedback', locked);
  expect(screen.getByText(`${units.length - 1} of ${units.length} genders correct.`)).toBeInTheDocument();
  expect(container.querySelectorAll('.overview-list > li')).toHaveLength(countries.targets.size);
  const wrong = container.querySelector('.overview-list > li.is-wrong')!;
  expect(wrong.querySelector('.overview-gender .match-right')).not.toBeNull();
  expect(wrong.querySelector('.overview-gender .match-wrong s')).not.toBeNull();
  expect(wrong.querySelector('.overview-fix')).not.toBeNull();
});
