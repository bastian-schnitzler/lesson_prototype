import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferencesProvider } from '../../src/app/context.tsx';
import type { PlanUnit } from '../../src/domain/session/plan.ts';
import { isPluralAnswer, scoreUnit } from '../../src/domain/session/session.ts';
import { UnitsRenderer, type RendererProps } from '../../src/session/controls.tsx';

/** P4-05 review: plurals in translation exams count only for pluralia tantum, and then with the right gender. */
afterEach(cleanup);

describe('scoring a plural answer', () => {
  const base = { kind: 'text' as const, id: 'p/i', itemId: 'i', itemType: 'vocabulary_translation_exam' as const, prompt: { native: 'book' }, explanation: { en: 'e', fr: 'e', de: 'e' }, answerLang: 'learning' as const };
  const unit: PlanUnit = { ...base, answer: 'un livre', accepted: { answers: ['un livre'], accentSensitive: [] }, noun: { genders: ['masculine'], pluraleTantum: false } };
  const tantum: PlanUnit = { ...base, answer: 'des ciseaux', accepted: { answers: ['des ciseaux'], accentSensitive: [] }, noun: { genders: ['masculine'], pluraleTantum: true } };

  it('counts a plural answer as wrong unless the noun is a plurale tantum', () => {
    expect(isPluralAnswer('des livres')).toBe(true);
    expect(isPluralAnswer('desserts')).toBe(false);
    expect(scoreUnit(unit, 'des livres', 'masculine')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(unit, 'un livre')).toEqual({ outcome: 'fully_correct', points: 1 });
  });

  it('needs the right gender for a plurale tantum; a singular is wrong', () => {
    expect(scoreUnit(tantum, 'des ciseaux', 'masculine')).toEqual({ outcome: 'fully_correct', points: 1 });
    expect(scoreUnit(tantum, 'des ciseaux', 'feminine')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(tantum, 'des ciseaux')).toEqual({ outcome: 'incorrect', points: 0 });
    expect(scoreUnit(tantum, 'Des ciseaux', 'masculine')).toEqual({ outcome: 'orthography_only', points: 0.5 });
    expect(scoreUnit(tantum, 'un ciseau', 'masculine')).toEqual({ outcome: 'incorrect', points: 0 });
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

describe('the gender draft in a vocabulary exam session', () => {
  it('is stored and kept with the locked answer', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, resolve } = await import('node:path');
    const { buildPlan } = await import('../../src/domain/session/plan.ts');
    const { sessionReducer, startSession } = await import('../../src/domain/session/session.ts');
    const { vocabularyLesson } = await import('../../src/domain/vocabularyLesson.ts');
    const brief = JSON.parse(readFileSync(join(resolve(import.meta.dirname, '../fixtures/content'), 'briefs', 'fr-classroom-objects.json'), 'utf8'));
    const plan = buildPlan(vocabularyLesson(brief), brief, 'en');
    const page = plan.pages.find((p) => p.role === 'exam' && p.units.some((u) => u.kind === 'text' && u.noun))!;
    const unit = page.units.find((u) => u.kind === 'text' && u.noun)!;
    let r = { ...startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now: 0 }), pageIndex: page.index };
    r = sessionReducer(plan, r, { type: 'draft', unitId: unit.id, response: 'des stylos', now: 0 });
    r = sessionReducer(plan, r, { type: 'draft', unitId: `${unit.id}#gender`, response: 'masculine', now: 0 });
    r = sessionReducer(plan, r, { type: 'continue', now: 1, interfaceLanguage: 'en' });
    expect(r.locked[unit.id]).toMatchObject({ outcome: 'incorrect', gender: 'masculine' }); // not a plurale tantum
  });
});
