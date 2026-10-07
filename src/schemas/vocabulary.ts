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
  nativeTranslationsSchema,
  ScoringPolicySchema,
  TimeLimitSecondsSchema,
} from './artifactCommon.ts';
import { ThemeSchema } from './common.ts';

export const WORD_CLASSES = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'numeral',
  'letter',
  'preposition',
  'conjunction',
  'interjection',
  'phrase',
  'other',
] as const;
export const GENDERS = ['masculine', 'feminine', 'neuter'] as const;
export const GenderSchema = z.enum(GENDERS);
export type Gender = z.infer<typeof GenderSchema>;

/* =================================================================== brief */

const targetSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    /** Base term in the learning language, without article: livre. */
    term: LearningTextSchema,
    translations: nativeTranslationsSchema(lang),
    wordClass: z.enum(WORD_CLASSES),
    /** Accepted genders for nouns; empty for every other word class (D8). */
    genders: z.array(GenderSchema).max(3),
    number: z.enum(['singular', 'plural']).nullable(),
    /** Displayed form with the teaching article where applicable: un livre. */
    teachingForm: LearningTextSchema,
    /** Full accepted exam answers, article included where required (D39). */
    examForms: z.array(LearningTextSchema).min(1).max(4),
    /** Words of the exam forms whose accents mark a different word (D40). */
    accentSensitive: z.array(LearningTextSchema).max(4),
    /** Why a noun has no indefinite-article form (proper names, set phrases…); null otherwise. */
    articleException: LocalizedTextSchema.nullable(),
    /** Forms for the other gender/number (espagnol / espagnole), used for prompt disambiguation. */
    genderVariants: z.array(LearningTextSchema).max(4),
    pronunciation: LearningTextSchema,
    difficulty: z.enum(['core', 'demanding']),
    context: z.strictObject({ sentence: LearningTextSchema, translation: nativeTextSchema(lang) }),
    ambiguityNote: LocalizedTextSchema.nullable(),
  });
export type VocabularyTarget = z.infer<ReturnType<typeof targetSchema>>;

const examPagePlanSchema = z.strictObject({
  pageId: NestedIdSchema,
  kind: z.enum(['translation', 'listening_dictation']),
  targetIds: z.array(NestedIdSchema).min(1).max(12),
  estimatedDurationS: DurationSecondsSchema,
  timeLimitS: TimeLimitSecondsSchema,
});

export const vocabularyBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('vocabulary'),
    theme: ThemeSchema,
    coverageNotes: LocalizedLongTextSchema,
    targetCount: z.number().int().min(1).max(60),
    countRationale: LocalizedTextSchema,
    difficultyBalance: LocalizedTextSchema,
    prerequisites: z.array(LocalizedTextSchema).max(4),
    /** Groups keep large inventories manageable; every target belongs to exactly one. */
    groups: z
      .array(z.strictObject({ id: NestedIdSchema, label: LocalizedLabelSchema, targetIds: z.array(NestedIdSchema).min(1).max(16) }))
      .min(1)
      .max(6),
    targets: z.array(targetSchema(lang)).min(1).max(60),
    plan: z.strictObject({
      introduction: z.strictObject({ estimatedDurationS: DurationSecondsSchema }),
      flashcards: z.strictObject({ estimatedDurationS: DurationSecondsSchema }),
      matching: z.strictObject({ groupSize: z.number().int().min(2).max(12), estimatedDurationS: DurationSecondsSchema }),
      genderOverview: z.strictObject({ scored: z.boolean(), estimatedDurationS: DurationSecondsSchema }),
      typedGaps: z.strictObject({ targetIds: z.array(NestedIdSchema).min(1).max(60), estimatedDurationS: DurationSecondsSchema }),
      listening: z.strictObject({
        /** True when the outline intent asks for oral recognition or pronunciation. */
        required: z.boolean(),
        practiceTargetIds: z.array(NestedIdSchema).max(60),
        estimatedDurationS: DurationSecondsSchema.nullable(),
      }),
      exam: z.strictObject({ pages: z.array(examPagePlanSchema).min(1).max(60) }),
    }),
    scoring: ScoringPolicySchema,
  });
export type VocabularyBrief = z.infer<ReturnType<typeof vocabularyBriefSchema>>;

/* ================================================================= content */

const unit = { answerExplanation: LocalizedTextSchema };

const vocabularyItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('vocabulary_introduction'), itemId: NestedIdSchema, targetIds: z.array(NestedIdSchema).min(1), text: LocalizedLongTextSchema }),
    z.strictObject({ type: z.literal('vocabulary_flashcards'), itemId: NestedIdSchema, targetIds: z.array(NestedIdSchema).min(1) }),
    z.strictObject({
      type: z.literal('vocabulary_matching'),
      itemId: NestedIdSchema,
      pairs: z
        .array(
          z.strictObject({
            targetId: NestedIdSchema,
            /** Disambiguated native label where two targets share a translation in some locale. */
            nativeLabel: nativeTextSchema(lang).nullable(),
            ...unit,
          }),
        )
        .min(2)
        .max(12),
    }),
    z.strictObject({
      type: z.literal('vocabulary_gender_select'),
      itemId: NestedIdSchema,
      /** Every target of the lesson; nouns also have a row. */
      targetIds: z.array(NestedIdSchema).min(1),
      rows: z.array(z.strictObject({ targetId: NestedIdSchema, ...unit })).min(1),
    }),
    z.strictObject({ type: z.literal('vocabulary_overview'), itemId: NestedIdSchema, targetIds: z.array(NestedIdSchema).min(1) }),
    z.strictObject({
      type: z.literal('vocabulary_typed_gap'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      /** Four distinct, non-clickable reference targets including the answer. */
      referenceTargetIds: z.array(NestedIdSchema).length(4),
      /** Article-free answers. */
      accepted: AcceptedAnswersSchema,
      ...unit,
    }),
    z.strictObject({
      type: z.literal('vocabulary_listening_choice'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      optionTargetIds: z.array(NestedIdSchema).length(4),
      ...unit,
    }),
    z.strictObject({
      type: z.literal('vocabulary_translation_exam'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      prompt: nativeTextSchema(lang),
      accepted: AcceptedAnswersSchema,
      ...unit,
    }),
    z.strictObject({
      type: z.literal('vocabulary_listening_dictation'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      accepted: AcceptedAnswersSchema,
      ...unit,
    }),
  ]);
export type VocabularyItem = z.infer<ReturnType<typeof vocabularyItemSchema>>;

export const VOCABULARY_STAGES = ['introduction', 'flashcards', 'matching', 'overview', 'practice', 'exam'] as const;

const pageSchema = (lang: string) =>
  z.strictObject({
    pageId: NestedIdSchema,
    estimatedDurationS: DurationSecondsSchema,
    /** Exam pages only; equals the brief's page limit. */
    timeLimitS: TimeLimitSecondsSchema.nullable(),
    instructions: LocalizedTextSchema,
    items: z.array(vocabularyItemSchema(lang)).min(1).max(12),
  });

export const vocabularyContentSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('vocabulary'),
    theme: ThemeSchema,
    steps: z
      .array(
        z.strictObject({
          id: NestedIdSchema,
          stage: z.enum(VOCABULARY_STAGES),
          role: z.enum(['introduction', 'exercise', 'overview', 'exam']),
          label: LocalizedLabelSchema,
          pages: z.array(pageSchema(lang)).min(1).max(60),
        }),
      )
      .length(VOCABULARY_STAGES.length),
  });
export type VocabularyContent = z.infer<ReturnType<typeof vocabularyContentSchema>>;
