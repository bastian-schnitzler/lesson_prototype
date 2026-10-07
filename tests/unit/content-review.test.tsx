import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { ContentReview } from '../../src/artifacts/ContentReview.tsx';
import { VocabularyBriefView } from '../../src/artifacts/VocabularyBriefView.tsx';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import { vocabularyLesson } from '../../src/domain/vocabularyLesson.ts';
import { scanContentDir } from '../../scripts/catalog.ts';
import { checkSampleLessons } from '../../scripts/sample-lessons.ts';

const root = resolve(import.meta.dirname, '../..');
function artifacts(id: string, kind: 'grammar' | 'vocabulary', dir = 'content') {
  const read = (folder: string) => JSON.parse(readFileSync(resolve(root, dir, folder, `${id}.json`), 'utf8'));
  // Vocabulary lessons are derived from the brief (P2-04).
  const brief = briefSchema(kind, 'fr').parse(read('briefs'));
  return { brief, content: brief.kind === 'vocabulary' ? vocabularyLesson(brief) : contentSchema(kind, 'fr').parse(read('lessons')) };
}
afterEach(cleanup);

it('keeps all twenty authored samples current and valid, including the numeral un', () => {
  const result = scanContentDir();
  expect(checkSampleLessons(result)).toEqual([]);
  expect(result.warnings).toEqual([]);
  const id = 'fr-numbers-zero-to-twenty';
  const { content } = artifacts(id, 'vocabulary');
  if (content.kind !== 'vocabulary') throw new Error('Expected vocabulary');
  expect(content.steps.flatMap((s) => s.pages.flatMap((p) => p.items)).find((i) => i.type === 'vocabulary_typed_gap' && i.targetId === 'num-1')).toMatchObject({ accepted: { answers: ['un'] } });
  const artifact = result.manifest.artifacts[id];
  expect(checkSampleLessons({ ...result, manifest: { ...result.manifest, artifacts: { ...result.manifest.artifacts, [id]: { ...artifact, draft: { ...artifact.draft!, status: 'stale' } } } } })).toContain(`${id}: draft is stale.`);
});

it('reviews vocabulary in independent interface/native languages without session controls', () => {
  const data = artifacts('fr-family-members', 'vocabulary');
  const { container, rerender } = render(<PreferencesProvider initial={{ interfaceLanguage: 'de', motherTongue: 'en' }}><ContentReview {...data} /></PreferencesProvider>);
  const matchingIndex = data.content.steps.slice(0, 2).reduce((n, step) => n + step.pages.length, 0);
  fireEvent.click(screen.getAllByRole('tab')[matchingIndex]);
  expect(screen.getAllByText(/Akzeptierte Antworten/).length).toBeGreaterThan(0);
  expect(container.querySelector('[lang="en"]')).toHaveTextContent(/father|mother/);
  expect(container).toHaveTextContent('un père');
  expect(screen.getByRole('tabpanel').querySelectorAll('input, button, select, textarea')).toHaveLength(0);
  rerender(<PreferencesProvider key="fr" initial={{ interfaceLanguage: 'fr', motherTongue: 'de' }}><ContentReview {...data} /></PreferencesProvider>);
  fireEvent.click(screen.getAllByRole('tab')[matchingIndex]);
  expect(screen.getAllByText(/Réponses acceptées/).length).toBeGreaterThan(0);
  expect(container.querySelector('[lang="de"]')).toHaveTextContent(/Vater|Mutter/);
});

it('exposes grammar choices, written answers, rules, estimates and fixed exam limits', () => {
  const data = artifacts('fr-negation-ne-pas', 'grammar');
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}><ContentReview {...data} /></PreferencesProvider>);
  const reviewed = screen.getAllByRole('tab').map((tab) => { fireEvent.click(tab); return screen.getByRole('tabpanel').textContent; }).join(' ');
  expect(reviewed).toContain('grammar_word_order');
  expect(reviewed).toContain('rule-n-elision');
  expect(reviewed).toContain('Countdown limit: 4 min');
  expect(reviewed).toContain('Personalised production feedback');
  expect(reviewed).toContain('Answer explanation');
  expect(screen.getByRole('tabpanel').querySelectorAll('input, button, select, textarea')).toHaveLength(0);
});

it('previews both error-spotter correction modes alongside all other grammar interactions', () => {
  const { brief, content } = artifacts('fr-verb-etre-present', 'grammar', 'tests/fixtures/content');
  if (content.kind !== 'grammar') throw new Error('Expected grammar');
  const explanation = { en: 'With je, use suis.', fr: 'Avec je, utilisez suis.', de: 'Mit je steht suis.' };
  const common = { ruleIds: ['rule-singular'], answerExplanation: explanation };
  const accepted = { answers: ['suis'], accentSensitive: [] };
  content.steps[1].pages[0].items.push(
    { type: 'grammar_gap_choice', itemId: 'choice-preview', before: 'Je', after: 'ici.', hint: null, choices: ['suis', 'es', 'est', 'sont'].map((text, i) => ({ choiceId: `c-${i}`, text })), answerChoiceId: 'c-0', ...common },
    { type: 'grammar_word_order', itemId: 'order-preview', tokens: [{ tokenId: 'b', text: 'suis' }, { tokenId: 'a', text: 'Je' }], acceptedOrders: [['a', 'b']], ...common },
    ...(['type', 'select'] as const).map((mode) => ({ type: 'grammar_error_spotter' as const, itemId: `spot-${mode}`, tokens: [{ tokenId: 'a', text: 'Je' }, { tokenId: 'b', text: 'est' }], faultyTokenId: 'b', correction: { mode, accepted, choices: mode === 'select' ? ['suis', 'es'] : [] }, ...common })),
  );
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}><ContentReview content={content} brief={brief} /></PreferencesProvider>);
  const reviewed = screen.getAllByRole('tab').map((tab) => { fireEvent.click(tab); return screen.getByRole('tabpanel').textContent; }).join(' ');
  for (const type of ['grammar_gap_choice', 'grammar_gap_typing', 'grammar_pronoun_form_match', 'grammar_pronoun_form_typing', 'grammar_word_order', 'grammar_error_spotter']) expect(reviewed).toContain(type);
  expect(reviewed).toContain('est → suis (type)');
  expect(reviewed).toContain('est → suis (select)');
});

it('shows one page at a time and supports grouped outline jumps and keyboard tabs', () => {
  const data = artifacts('fr-family-members', 'vocabulary');
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}><ContentReview {...data} /></PreferencesProvider>);
  const tabs = screen.getAllByRole('tab');
  expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  expect(screen.getByRole('tabpanel')).toHaveTextContent('vocabulary_introduction');
  fireEvent.click(tabs[1]);
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(tabs[0]).toHaveAttribute('tabindex', '-1');
  fireEvent.keyDown(tabs[1], { key: 'End' });
  expect(tabs.at(-1)).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveTextContent('vocabulary_listening_dictation'); // dictation pages close every exam (P2-04)
  fireEvent.click(screen.getByRole('button', { name: /Flashcards/ }));
  expect(screen.getByRole('tabpanel')).toHaveTextContent('vocabulary_flashcards');
  expect(screen.getByRole('tabpanel')).not.toHaveTextContent('vocabulary_translation_exam');
});

it('previews listening items read-only with pronunciation text, options and answers', () => {
  const data = artifacts('fr-classroom-instructions', 'vocabulary');
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><ContentReview {...data} /></PreferencesProvider>);
  const listening = screen.getAllByRole('tab').map((tab) => { fireEvent.click(tab); return screen.getByRole('tabpanel').textContent ?? ''; })
    .filter((t) => t.includes('vocabulary_listening_'));
  expect(listening.some((t) => t.includes('vocabulary_listening_choice') && /Pronunciation: \/.+\//.test(t) && t.includes('Options:'))).toBe(true);
  expect(listening.some((t) => t.includes('vocabulary_listening_dictation') && /Pronunciation: \/.+\//.test(t) && t.includes('Accepted answers'))).toBe(true);
  expect(screen.getByRole('tabpanel').querySelectorAll('input, button, select, textarea')).toHaveLength(0);
});

it('shows one vocabulary target group at a time in the Draft tabs', () => {
  const { brief } = artifacts('fr-classroom-objects', 'vocabulary');
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><VocabularyBriefView data={brief} /></PreferencesProvider>);
  const tabs = within(screen.getByRole('tablist', { name: 'Target inventory' })).getAllByRole('tab');
  expect(tabs.map((tab) => tab.textContent)).toEqual(['Masculine objects6 targets', 'Feminine objects6 targets']);
  // The first panel is the target inventory; the derived lesson preview follows below (P2-04).
  const panel = () => screen.getAllByRole('tabpanel')[0];
  expect(screen.getByRole('heading', { name: 'Lesson preview' })).toBeInTheDocument();
  expect(panel()).toHaveTextContent('un livre');
  expect(panel()).not.toHaveTextContent('une chaise');
  fireEvent.click(tabs[1]);
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(panel()).toHaveTextContent('une chaise');
  expect(panel()).not.toHaveTextContent('un livre');
});

it('labels grammar form tables by subject and form, not as exam answers', () => {
  render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><ContentReview {...artifacts('fr-verb-etre-present', 'grammar')} /></PreferencesProvider>);
  const headers = screen.getByRole('tabpanel').querySelectorAll('th');
  expect([...headers].map((h) => h.textContent)).toEqual(['Subject', 'Form', 'Example']);
});
