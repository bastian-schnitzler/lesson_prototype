import type { ComponentType } from 'react';

import type { Item } from '../domain/session/plan.ts';
import { UnitsRenderer, type RendererProps } from './controls.tsx';
import { ExplanationRenderer, PlaceholderRenderer } from './grammarRenderers.tsx';
import { FlashcardsRenderer, GenderRenderer, IntroductionRenderer, OverviewRenderer } from './vocabularyRenderers.tsx';

export { UnitFeedback, type RendererProps } from './controls.tsx';

/**
 * The typed renderer registry: one component per item type. Baseline renderers from P1-09;
 * phases 2/3 replace individual entries with the full interactions (drag and drop, card
 * flipping, audio-first listening) without changing the session host or scoring.
 */
export const rendererRegistry: Record<Item['type'], ComponentType<RendererProps>> = {
  vocabulary_introduction: IntroductionRenderer,
  vocabulary_flashcards: FlashcardsRenderer,
  vocabulary_overview: OverviewRenderer,
  vocabulary_matching: UnitsRenderer,
  vocabulary_gender_select: GenderRenderer,
  vocabulary_typed_gap: UnitsRenderer,
  vocabulary_listening_choice: UnitsRenderer,
  vocabulary_translation_exam: UnitsRenderer,
  vocabulary_listening_dictation: UnitsRenderer,
  grammar_explanation: ExplanationRenderer,
  production_feedback_placeholder: PlaceholderRenderer,
  grammar_pronoun_form_match: UnitsRenderer,
  grammar_pronoun_form_typing: UnitsRenderer,
  grammar_gap_choice: UnitsRenderer,
  grammar_gap_typing: UnitsRenderer,
  grammar_word_order: UnitsRenderer,
  grammar_error_spotter: UnitsRenderer,
};
