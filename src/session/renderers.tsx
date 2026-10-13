import type { ComponentType } from 'react';

import type { Item } from '../domain/session/plan.ts';
import { UnitsRenderer, type RendererProps } from './controls.tsx';
import { ExplanationRenderer, PlaceholderRenderer, PronounMatchRenderer, PronounTypingRenderer } from './grammarRenderers.tsx';
import { DialogueGapChoiceRenderer, DialogueRenderer, ExamDialogueRenderer, FunctionFlashcardsRenderer, FunctionWordOrderRenderer } from './functionsRenderers.tsx';
import { FlashcardsRenderer, GenderRenderer, IntroductionRenderer, MatchingRenderer, OverviewRenderer } from './vocabularyRenderers.tsx';

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
  vocabulary_matching: MatchingRenderer,
  vocabulary_gender_select: GenderRenderer,
  vocabulary_typed_gap: UnitsRenderer,
  vocabulary_listening_choice: UnitsRenderer,
  vocabulary_translation_exam: UnitsRenderer,
  vocabulary_listening_dictation: UnitsRenderer,
  grammar_explanation: ExplanationRenderer,
  production_feedback_placeholder: PlaceholderRenderer,
  grammar_person_matching: MatchingRenderer,
  grammar_pronoun_form_match: PronounMatchRenderer,
  grammar_pronoun_form_typing: PronounTypingRenderer,
  grammar_gap_choice: UnitsRenderer,
  grammar_gap_typing: UnitsRenderer,
  grammar_word_order: UnitsRenderer,
  grammar_error_spotter: UnitsRenderer,
  // Function lessons (P4-04, P4-05).
  function_flashcards: FunctionFlashcardsRenderer,
  function_dialogue: DialogueRenderer,
  function_matching: MatchingRenderer,
  function_word_order: FunctionWordOrderRenderer,
  function_dialogue_gap_choice: DialogueGapChoiceRenderer,
  function_dialogue_gap_typing: ExamDialogueRenderer,
};
