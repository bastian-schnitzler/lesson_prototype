import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { buildPlan, type PlanPage } from '../../src/domain/session/plan.ts';
import { skipsFeedbackWhenCorrect, type LockedUnit } from '../../src/domain/session/session.ts';
import { readingContentSchema } from '../../src/schemas/reading.ts';
import type { RendererProps } from '../../src/session/controls.tsx';
import { DocumentRenderer, KeywordsRenderer, OrderRenderer, QuestionRenderer, SKIMMED } from '../../src/session/readingRenderers.tsx';
import { MatchingRenderer } from '../../src/session/vocabularyRenderers.tsx';
import { ReadingDocument } from '../../src/components/ReadingDocument.tsx';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const CONTENT = join(resolve(import.meta.dirname, '../..'), 'content');
const planOf = (id: string) => buildPlan(
  readingContentSchema('fr').parse(JSON.parse(readFileSync(join(CONTENT, 'lessons', `${id}.json`), 'utf8'))),
  JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en',
);
const SMS = planOf('fr-reading-a-text-message');
const page = (plan: ReturnType<typeof planOf>, pageId: string) => plan.pages.find((p) => p.pageId === pageId)!;

function renderItem(Renderer: (props: RendererProps) => unknown, plan: ReturnType<typeof planOf>, p: PlanPage, index: number, extra: Partial<RendererProps> = {}) {
  const item = p.items[index];
  const props: RendererProps = {
    item, units: p.units.filter((u) => u.itemId === item.itemId), plan, mode: 'answering', drafts: {}, locked: {}, onChange: vi.fn(), seed: 1, motherTongue: 'en',
    pageId: p.pageId, revealed: {}, onReveal: vi.fn(), ...extra,
  };
  const R = Renderer as (props: RendererProps) => React.ReactElement;
  return { ...render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><R {...props} /></PreferencesProvider>), props };
}
const locked = (response: string, outcome: LockedUnit['outcome']): LockedUnit => ({ response, outcome, points: outcome === 'fully_correct' ? 1 : 0, timedOut: false, interfaceLanguage: 'en' });

describe('key words', () => {
  it('shows each word with audio, its meaning in the mother tongue and an explanation', () => {
    renderItem(KeywordsRenderer, SMS, page(SMS, 'keywords'), 0);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('samedi')).toHaveAttribute('lang', 'fr');
    expect(screen.getByText('we meet / shall we meet')).toHaveAttribute('lang', 'en');
    // One audio control per card (without a French voice in jsdom it offers the voice installation).
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('matches key words with their meaning on the shared matching board', () => {
    renderItem(MatchingRenderer, SMS, page(SMS, 'keyword-matching'), 0);
    expect(screen.getByRole('list', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'on se voit' })).toBeInTheDocument();
  });
});

describe('skim', () => {
  const skim = page(SMS, 'skim');

  it('counts down, then blurs the document and opens the question', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    renderItem(DocumentRenderer, SMS, skim, 0, { onReveal });
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');
    act(() => { vi.advanceTimersByTime(46_000); });
    expect(onReveal).toHaveBeenCalledWith('skim/doc-skim', SKIMMED);
  });

  it('lets the learner finish early', () => {
    const onReveal = vi.fn();
    renderItem(DocumentRenderer, SMS, skim, 0, { onReveal });
    fireEvent.click(screen.getByRole('button', { name: 'I’ve finished reading' }));
    expect(onReveal).toHaveBeenCalledWith('skim/doc-skim', SKIMMED);
  });

  it('keeps the question closed before the blur and the document blurred after it', () => {
    renderItem(QuestionRenderer, SMS, skim, 1);
    expect(screen.getByText(/The question opens when the text blurs/)).toBeInTheDocument();
    cleanup();
    const revealed = { 'skim/doc-skim': [SKIMMED] };
    const { container } = renderItem(DocumentRenderer, SMS, skim, 0, { revealed });
    expect(container.querySelector('.reading-document')).toHaveClass('is-blurred');
    expect(screen.queryByRole('timer')).toBeNull();
    cleanup();
    renderItem(QuestionRenderer, SMS, skim, 1, { revealed });
    expect(screen.getByRole('group', { name: 'Pourquoi Léa écrit-elle à Tom ?' })).toBeInTheDocument();
  });
});

describe('detail and correction', () => {
  const detail = page(SMS, 'detail');

  it('always shows a correction step, so the evidence can be read', () => {
    expect(skipsFeedbackWhenCorrect(detail)).toBe(false);
    expect(skipsFeedbackWhenCorrect(page(SMS, 'skim'))).toBe(false);
    expect(skipsFeedbackWhenCorrect(page(SMS, 'keyword-matching'))).toBe(true);
  });

  it('keeps true / false in order and types short answers', () => {
    renderItem(QuestionRenderer, SMS, detail, 4);
    expect(screen.getAllByRole('radio').map((r) => r.parentElement?.textContent)).toEqual(['Vrai', 'Faux']);
    cleanup();
    renderItem(QuestionRenderer, SMS, detail, 2);
    expect(screen.getByRole('textbox', { name: 'À quelle heure est le rendez-vous au café ?' })).toHaveAttribute('lang', 'fr');
  });

  it('marks the segments that prove the checked answers', () => {
    const lockedUnits = Object.fromEntries(detail.units.map((u) => [u.id, locked('x', 'incorrect')]));
    const { container } = renderItem(DocumentRenderer, SMS, detail, 0, { mode: 'feedback', locked: lockedUnits });
    const marked = [...container.querySelectorAll('.is-evidence')].map((el) => el.getAttribute('data-segment'));
    expect(marked.sort()).toEqual(['m-s2', 'm-s3', 'm-s5']);
    expect(container.querySelector('.reading-keyword')).not.toBeNull();
  });
});

describe('structure and exam', () => {
  it('orders pieces of information with the token controls', () => {
    const structure = page(SMS, 'structure');
    renderItem(OrderRenderer, SMS, structure, 1);
    expect(screen.getByText('Select the pieces of information in the right order.')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('shows the exam document without key word highlights', () => {
    const { container } = renderItem(DocumentRenderer, SMS, page(SMS, 'exam-1'), 0, { mode: 'exam' });
    expect(container.querySelector('.reading-keyword')).toBeNull();
    expect(container.textContent).toContain('parc Monceau');
  });
});

describe('genre skins', () => {
  const docOf = (id: string) => planOf(id).reading!.documents.get('main')!;
  it.each([
    ['fr-reading-a-text-message', 'skin-message'], ['fr-reading-a-restaurant-menu', 'skin-menu'], ['fr-reading-an-article-on-la-bise', 'skin-article'],
    ['fr-reading-an-employment-contract', 'skin-contract'], ['fr-reading-public-signs', 'skin-sign'], ['fr-reading-dictionary-entries', 'skin-dictionary'],
    ['fr-reading-a-fable', 'skin-poem'], ['fr-reading-a-recipe', 'skin-recipe'], ['fr-reading-a-party-invitation', 'skin-generic'],
  ])('%s uses %s', (id, skin) => {
    const { container } = render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><ReadingDocument doc={docOf(id)} lang="fr" highlightKeywords /></PreferencesProvider>);
    expect(container.querySelector('article')).toHaveClass(skin);
  });

  it('numbers parts without headings and aligns values', () => {
    const { container } = render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><ReadingDocument doc={docOf('fr-reading-a-recipe')} lang="fr" highlightKeywords={false} /></PreferencesProvider>);
    expect(container.querySelectorAll('.reading-value')).toHaveLength(6);
    cleanup();
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><ReadingDocument doc={docOf('fr-reading-public-signs')} lang="fr" highlightKeywords={false} /></PreferencesProvider>);
    expect(screen.getByLabelText('Part 6')).toBeInTheDocument();
  });
});
