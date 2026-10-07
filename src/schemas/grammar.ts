import { z } from 'zod';

import {
  AcceptedAnswersSchema,
  DurationSecondsSchema,
  envelopeShape,
  LearningTextSchema,
  LocalizedLabelSchema,
  LocalizedLongTextSchema,
  LocalizedTextSchema,
  NestedIdSchema,
  nativeTextSchema,
  ScoringPolicySchema,
  TimeLimitSecondsSchema,
} from './artifactCommon.ts';
import { TopicSchema } from './common.ts';

/** The six practice interactions (SPEC section 7). */
export const GRAMMAR_EXERCISE_TYPES = [
  'grammar_pronoun_form_match',
  'grammar_pronoun_form_typing',
  'grammar_gap_choice',
  'grammar_gap_typing',
  'grammar_word_order',
  'grammar_error_spotter',
] as const;
export const GrammarExerciseTypeSchema = z.enum(GRAMMAR_EXERCISE_TYPES);
export type GrammarExerciseType = z.infer<typeof GrammarExerciseTypeSchema>;

/**
 * Pronoun/form exercises drill person forms, so they suit only topics with person-marked forms
 * (pronouns and verb conjugation); article, adverb, negation or question lessons use gaps and word
 * order instead (SPEC section 7, P3-01).
 */
export const PRONOUN_FORM_TYPES: readonly GrammarExerciseType[] = ['grammar_pronoun_form_match', 'grammar_pronoun_form_typing'];
export const PRONOUN_FORM_TOPICS = ['pronouns', 'verbs_morphology', 'verb_usage'] as const;

/** Final exams use written production only. */
export const GRAMMAR_EXAM_TYPES = ['grammar_gap_typing', 'grammar_pronoun_form_typing', 'grammar_word_order'] as const;

/* =================================================================== brief */

export const exampleSchema = (lang: string) => z.strictObject({ text: LearningTextSchema, translation: nativeTextSchema(lang) });

export const grammarBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('grammar'),
    topic: TopicSchema,
    scopeBoundaries: LocalizedTextSchema,
    prerequisites: z.array(LocalizedTextSchema).max(4),
    rules: z.array(z.strictObject({ id: NestedIdSchema, summary: LocalizedTextSchema })).min(1).max(12),
    blocks: z
      .array(
        z.strictObject({
          id: NestedIdSchema,
          title: LocalizedLabelSchema,
          ruleIds: z.array(NestedIdSchema).min(1),
          explanationPlan: LocalizedLongTextSchema,
          explanationDurationS: DurationSecondsSchema,
          examples: z.array(exampleSchema(lang)).min(1).max(8),
          pitfalls: z.array(LocalizedTextSchema).max(4),
          exercises: z
            .array(
              z.strictObject({
                id: NestedIdSchema,
                type: GrammarExerciseTypeSchema,
                itemCount: z.number().int().min(1).max(12),
                ruleIds: z.array(NestedIdSchema).min(1),
                estimatedDurationS: DurationSecondsSchema,
              }),
            )
            .min(1)
            .max(3),
        }),
      )
      .min(2)
      .max(4),
    feedbackPlaceholder: z.strictObject({ estimatedDurationS: DurationSecondsSchema }),
    exam: z.strictObject({
      pages: z
        .array(
          z.strictObject({
            pageId: NestedIdSchema,
            type: z.enum(GRAMMAR_EXAM_TYPES),
            itemCount: z.number().int().min(1).max(12),
            ruleIds: z.array(NestedIdSchema).min(1),
            estimatedDurationS: DurationSecondsSchema,
            timeLimitS: TimeLimitSecondsSchema,
          }),
        )
        .min(1)
        .max(20),
    }),
    scoring: ScoringPolicySchema,
  });
export type GrammarBrief = z.infer<ReturnType<typeof grammarBriefSchema>>;

/* ================================================================= content */

const TokenSchema = z.strictObject({ tokenId: NestedIdSchema, text: LearningTextSchema });
const scored = { ruleIds: z.array(NestedIdSchema).min(1), answerExplanation: LocalizedTextSchema };

export const grammarItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('grammar_explanation'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      heading: LocalizedLabelSchema,
      text: LocalizedLongTextSchema,
      formTable: z
        .array(z.strictObject({ subject: LearningTextSchema, form: LearningTextSchema, example: LearningTextSchema.nullable() }))
        .max(12),
      examples: z.array(exampleSchema(lang)).max(8),
    }),
    z.strictObject({ type: z.literal('production_feedback_placeholder'), itemId: NestedIdSchema }),
    z.strictObject({
      type: z.literal('grammar_pronoun_form_match'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      /** Draggable forms; duplicate texts are allowed (distinct token IDs). */
      tokens: z.array(TokenSchema).min(2).max(12),
      rows: z
        .array(z.strictObject({ rowId: NestedIdSchema, pronoun: LearningTextSchema, validForms: z.array(LearningTextSchema).min(1), answerExplanation: LocalizedTextSchema }))
        .min(1)
        .max(8),
    }),
    z.strictObject({
      type: z.literal('grammar_pronoun_form_typing'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      rows: z
        .array(z.strictObject({ rowId: NestedIdSchema, pronoun: LearningTextSchema, accepted: AcceptedAnswersSchema, answerExplanation: LocalizedTextSchema }))
        .min(1)
        .max(8),
    }),
    z.strictObject({
      type: z.literal('grammar_gap_choice'),
      itemId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      choices: z.array(z.strictObject({ choiceId: NestedIdSchema, text: LearningTextSchema })).length(4),
      answerChoiceId: NestedIdSchema,
      ...scored,
    }),
    z.strictObject({
      type: z.literal('grammar_gap_typing'),
      itemId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      accepted: AcceptedAnswersSchema,
      /** Practice only; must be null in exam pages. */
      hint: LocalizedTextSchema.nullable(),
      ...scored,
    }),
    z.strictObject({
      type: z.literal('grammar_word_order'),
      itemId: NestedIdSchema,
      /** Tokens in display order; punctuation and repeated words are explicit tokens. */
      tokens: z.array(TokenSchema).min(2).max(16),
      acceptedOrders: z.array(z.array(NestedIdSchema).min(2)).min(1).max(4),
      ...scored,
    }),
    z.strictObject({
      type: z.literal('grammar_error_spotter'),
      itemId: NestedIdSchema,
      tokens: z.array(TokenSchema).min(2).max(16),
      /** Exactly one token is wrong and is replaced by the correction. */
      faultyTokenId: NestedIdSchema,
      correction: z.strictObject({
        mode: z.enum(['type', 'select']),
        accepted: AcceptedAnswersSchema,
        /** Select mode: the options offered, including an accepted answer. */
        choices: z.array(LearningTextSchema).max(4),
      }),
      ...scored,
    }),
  ]);
export type GrammarItem = z.infer<ReturnType<typeof grammarItemSchema>>;

const pageSchema = (lang: string) =>
  z.strictObject({
    pageId: NestedIdSchema,
    estimatedDurationS: DurationSecondsSchema,
    timeLimitS: TimeLimitSecondsSchema.nullable(),
    instructions: LocalizedTextSchema,
    items: z.array(grammarItemSchema(lang)).min(1).max(12),
  });

export const grammarContentSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('grammar'),
    topic: TopicSchema,
    steps: z
      .array(
        z.strictObject({
          id: NestedIdSchema,
          role: z.enum(['explanation', 'exercise', 'feedback', 'exam']),
          /** Teaching block of explanation/exercise steps; null for feedback and exam. */
          blockId: NestedIdSchema.nullable(),
          label: LocalizedLabelSchema,
          pages: z.array(pageSchema(lang)).min(1).max(20),
        }),
      )
      .min(6)
      .max(20),
  });
export type GrammarContent = z.infer<ReturnType<typeof grammarContentSchema>>;
