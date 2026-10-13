import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferencesProvider } from '../../src/app/context.tsx';
import { indefinitePlural, pluralPhrase } from '../../src/domain/plural.ts';
import { pluralOf, type PlanUnit } from '../../src/domain/session/plan.ts';
import { isPluralAnswer, scoreUnit } from '../../src/domain/session/session.ts';
import { UnitsRenderer, type RendererProps } from '../../src/session/controls.tsx';

/** P4-05 review: "des" + plural with the right gender counts in translation exams. */
afterEach(cleanup);

describe('French plurals', () => {
  it.each([
    ['un livre', 'des livres'], ['une table', 'des tables'], ['un gâteau', 'des gâteaux'], ['un cheval', 'des chevaux'],
    ['un festival', 'des festivals'], ['un jus d’orange', 'des jus d’orange'], ['une salle de classe', 'des salles de classe'],
    ['un stylo bleu', 'des stylos bleus'], ['un œil', 'des yeux'], ['un travail', 'des travaux'], ['un nez', 'des nez'],
  ])('%s → %s', (singular, plural) => expect(indefinitePlural(singular)).toBe(plural));

  it('leaves forms without an indefinite article alone', () => {
    expect(indefinitePlural('la France')).toBeUndefined();
    expect(pluralPhrase('bijou')).toBe('bijoux');
  });
});

describe('scoring a plural answer', () => {
  const unit: PlanUnit = {
    kind: 'text', id: 'p/i', itemId: 'i', itemType: 'vocabulary_translation_exam', prompt: { native: 'book' }, explanation: { en: 'e', fr: 'e', de: 'e' },
    answer: 'un livre', answerLang: 'learning', accepted: { answers: ['un livre'], accentSensitive: [] },
    plural: pluralOf({ answers: ['un livre'], accentSensitive: [] }, ['masculine']),
  };

  it('needs des + the plural and the right gender', () => {
    expect(isPluralAnswer('des livres')).toBe(true);
    expect(isPluralAnswer('desserts')).toBe(false);
    expect(scoreUnit(unit, 'des livres', 'masculine')).toEqual({ outcome: 'fully_correct', points: 1 });
    expect(scoreUnit(unit, 'des livres', 'feminine')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(unit, 'des livres')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(unit, 'Des livres', 'masculine')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(unit, 'un livre')).toEqual({ outcome: 'fully_correct', points: 1 });
  });

  it('asks the gender after the field once des and a word are typed', () => {
    const onChange = vi.fn();
    const props = (draft: string): RendererProps => ({
      item: { type: 'vocabulary_translation_exam', itemId: 'i', targetId: 't', prompt: { en: 'book' }, accepted: unit.kind === 'text' ? unit.accepted : { answers: [], accentSensitive: [] }, answerExplanation: { en: 'e', fr: 'e', de: 'e' } } as RendererProps['item'],
      units: [unit], plan: { lang: 'fr', targets: new Map() } as unknown as RendererProps['plan'], mode: 'exam', drafts: { [unit.id]: draft }, locked: {}, onChange,
      seed: 1, motherTongue: 'en', pageId: 'p', revealed: {}, onReveal: () => undefined,
    });
    const { rerender } = render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><UnitsRenderer {...props('des')} /></PreferencesProvider>);
    expect(screen.queryByRole('radio', { name: 'Masculine' })).toBeNull();
    rerender(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><UnitsRenderer {...props('des livres')} /></PreferencesProvider>);
    fireEvent.click(screen.getByRole('radio', { name: 'Masculine' }));
    expect(onChange).toHaveBeenCalledWith('p/i#gender', 'masculine');
  });
});

describe('plural answers in a vocabulary exam session', () => {
  it('stores the gender draft and scores des + plural with it when the page locks', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const { buildPlan } = await import('../../src/domain/session/plan.ts');
    const { sessionReducer, startSession } = await import('../../src/domain/session/session.ts');
    const { vocabularyLesson } = await import('../../src/domain/vocabularyLesson.ts');
    const brief = JSON.parse(readFileSync(join(resolve(import.meta.dirname, '../fixtures/content'), 'briefs', 'fr-classroom-objects.json'), 'utf8'));
    const plan = buildPlan(vocabularyLesson(brief), brief, 'en');
    const page = plan.pages.find((p) => p.role === 'exam' && p.units.some((u) => u.kind === 'text' && u.plural))!;
    const unit = page.units.find((u) => u.kind === 'text' && u.plural)!;
    const plural = unit.kind === 'text' ? unit.plural! : undefined;
    let r = { ...startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now: 0 }), pageIndex: page.index };
    r = sessionReducer(plan, r, { type: 'draft', unitId: unit.id, response: plural!.accepted.answers[0], now: 0 });
    r = sessionReducer(plan, r, { type: 'draft', unitId: `${unit.id}#gender`, response: plural!.genders[0], now: 0 });
    expect(r.drafts[`${unit.id}#gender`]).toBe(plural!.genders[0]);
    r = sessionReducer(plan, r, { type: 'continue', now: 1, interfaceLanguage: 'en' });
    expect(r.locked[unit.id]).toMatchObject({ outcome: 'fully_correct', gender: plural!.genders[0] });
  });
});
