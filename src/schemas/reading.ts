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
  nativeTranslationsSchema,
  TimeLimitSecondsSchema,
} from './artifactCommon.ts';
import { ThemeSchema, type Level } from './common.ts';

/**
 * Reading lessons ("Hybrid 1": prepare, then read; docs/reading-lessons.md). The brief plans the
 * lesson; the content file holds both documents once, at lesson level, and the five fixed stages.
 * Documents, questions, options and answers stay in the learning language: translating them would
 * give the answers away. Cross-reference rules live in src/validation/reading.ts.
 */

/** Document genres. Some have their own skin in the player; the others use the generic page. */
export const READING_GENRES = [
  'text_message',
  'sign',
  'menu',
  'classified_ad',
  'postcard',
  'profile',
  'programme',
  'article',
  'letter',
  'forum_post',
  'dictionary_entry',
  'contract',
  'recipe',
  'speech',
  'poem',
  'other',
] as const;
export const ReadingGenreSchema = z.enum(READING_GENRES);
export type ReadingGenre = z.infer<typeof ReadingGenreSchema>;

/** Words in the main document per level (see countWords). Starting values, open to tuning. */
export const READING_WORDS: Record<Level, readonly [number, number]> = {
  A1: [40, 80],
  A2: [80, 150],
  B1: [150, 250],
  B2: [250, 400],
  C1: [400, 550],
  C2: [500, 700],
};

/** The exam document is about half as long as the main one. */
export function examWordRange(level: Level): readonly [number, number] {
  const [min, max] = READING_WORDS[level];
  return [Math.round(min / 2), Math.round(max / 2)];
}

/** Seconds the document stays readable in the skim stage before it blurs. */
export const READING_SKIM_SECONDS: Record<Level, number> = { A1: 45, A2: 60, B1: 75, B2: 90, C1: 120, C2: 150 };

/** Levels where true/false questions offer "not stated". */
export const NOT_STATED_LEVELS: readonly Level[] = ['B1', 'B2', 'C1', 'C2'];

/** Structural requirements for reading briefs and lessons. */
export const READING_LIMITS = {
  keywords: [4, 6],
  skimQuestions: 1,
  detailQuestions: [3, 4],
  structureTasks: 1,
  examQuestions: 5,
  examPages: [1, 2],
  options: [3, 4],
  parts: [1, 12],
  orderPieces: [3, 6],
  evidence: 4,
} as const;

/** Fixed stages, in this order. */
export const READING_STAGES = ['keywords', 'skim', 'detail', 'structure', 'exam'] as const;
export type ReadingStage = (typeof READING_STAGES)[number];

/** What the single skim question asks about the document as a whole. */
export const SKIM_FOCUS = ['genre', 'author', 'purpose'] as const;
export const READING_QUESTION_TYPES = ['reading_choice', 'reading_true_false', 'reading_short_answer'] as const;
export type ReadingQuestionType = (typeof READING_QUESTION_TYPES)[number];
export const STRUCTURE_TASKS = ['heading_matching', 'order_parts', 'order_information'] as const;
export type StructureTask = (typeof STRUCTURE_TASKS)[number];

/** Reading weights the exam more: practice 30 %, exam 70 %; spelling-only mistakes earn half a point. */
export const ReadingScoringSchema = z.strictObject({
  practiceWeight: z.literal(30),
  examWeight: z.literal(70),
  orthographyCredit: z.literal(0.5),
});

const SkimSecondsSchema = z.number().int().min(10).max(300);

/* =================================================================== brief */

export const readingKeywordSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    /** As it is taught, in the learning language. */
    term: LearningTextSchema,
    /** Meanings per mother tongue; the first one is the label in the matching exercise. */
    translations: nativeTranslationsSchema(lang),
    explanation: LocalizedTextSchema,
  });
export type ReadingKeyword = z.infer<ReturnType<typeof readingKeywordSchema>>;

const DocumentPlanSchema = z.strictObject({
  targetWords: z.number().int().min(10).max(1000),
  partCount: z.number().int().min(READING_LIMITS.parts[0]).max(READING_LIMITS.parts[1]),
  /** What the document says, so the content step writes the planned text. */
  contents: LocalizedLongTextSchema,
});

export const readingBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('reading'),
    theme: ThemeSchema,
    genre: ReadingGenreSchema,
    /** Who writes to whom, where and why. */
    situation: LocalizedTextSchema,
    /** What the learner must find in the document (from the outline intent). */
    readerTask: LocalizedTextSchema,
    coverageNotes: LocalizedLongTextSchema,
    prerequisites: z.array(LocalizedTextSchema).max(4),
    keywords: z.array(readingKeywordSchema(lang)).min(READING_LIMITS.keywords[0]).max(READING_LIMITS.keywords[1]),
    documents: z.strictObject({ main: DocumentPlanSchema, exam: DocumentPlanSchema }),
    stages: z.strictObject({
      keywords: z.strictObject({ estimatedDurationS: DurationSecondsSchema }),
      skim: z.strictObject({ focus: z.enum(SKIM_FOCUS), skimSeconds: SkimSecondsSchema, estimatedDurationS: DurationSecondsSchema }),
      detail: z.strictObject({
        questions: z
          .array(z.strictObject({ id: NestedIdSchema, type: z.enum(READING_QUESTION_TYPES), focus: LocalizedTextSchema }))
          .min(READING_LIMITS.detailQuestions[0])
          .max(READING_LIMITS.detailQuestions[1]),
        estimatedDurationS: DurationSecondsSchema,
      }),
      structure: z.strictObject({ task: z.enum(STRUCTURE_TASKS), estimatedDurationS: DurationSecondsSchema }),
    }),
    exam: z.strictObject({
      pages: z
        .array(
          z.strictObject({
            pageId: NestedIdSchema,
            types: z.array(z.enum(READING_QUESTION_TYPES)).min(1).max(3),
            itemCount: z.number().int().min(1).max(READING_LIMITS.examQuestions),
            estimatedDurationS: DurationSecondsSchema,
            timeLimitS: TimeLimitSecondsSchema,
          }),
        )
        .min(READING_LIMITS.examPages[0])
        .max(READING_LIMITS.examPages[1]),
    }),
    scoring: ReadingScoringSchema,
  });
export type ReadingBrief = z.infer<ReturnType<typeof readingBriefSchema>>;

/* ================================================================= content */

const SegmentSchema = z.strictObject({
  segmentId: NestedIdSchema,
  text: LearningTextSchema,
  /** Right-aligned value next to the text, e.g. a price on a menu or a quantity in a recipe. */
  value: LearningTextSchema.nullable(),
});

export const ReadingDocumentSchema = z.strictObject({
  documentId: z.enum(['main', 'exam']),
  genre: ReadingGenreSchema,
  title: LearningTextSchema.nullable(),
  /** Small print around the document: sender, date, address, source… */
  meta: z.array(LearningTextSchema).max(4),
  parts: z
    .array(z.strictObject({ partId: NestedIdSchema, heading: LearningTextSchema.nullable(), segments: z.array(SegmentSchema).min(1).max(20) }))
    .min(READING_LIMITS.parts[0])
    .max(READING_LIMITS.parts[1]),
  /** Key words to highlight (main document only): `text` is found verbatim in the segment. */
  highlights: z.array(z.strictObject({ keywordId: NestedIdSchema, segmentId: NestedIdSchema, text: LearningTextSchema })).max(24),
});
export type ReadingDocument = z.infer<typeof ReadingDocumentSchema>;

const OptionsSchema = z
  .array(z.strictObject({ optionId: NestedIdSchema, text: LearningTextSchema }))
  .min(READING_LIMITS.options[0])
  .max(READING_LIMITS.options[1]);
/** Segments that prove the answer; marked in the document after Check and quoted in the results. */
const EvidenceSchema = z.array(NestedIdSchema).max(READING_LIMITS.evidence);

export const readingItemSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('reading_keywords'), itemId: NestedIdSchema, keywordIds: z.array(NestedIdSchema).min(1) }),
  z.strictObject({
    type: z.literal('reading_keyword_matching'),
    itemId: NestedIdSchema,
    pairs: z
      .array(z.strictObject({ keywordId: NestedIdSchema, answerExplanation: LocalizedTextSchema }))
      .min(READING_LIMITS.keywords[0])
      .max(READING_LIMITS.keywords[1]),
  }),
  z.strictObject({
    type: z.literal('reading_document'),
    itemId: NestedIdSchema,
    documentId: z.enum(['main', 'exam']),
    view: z.enum(['skim', 'open', 'exam']),
    /** Skim view only: seconds before the document blurs. */
    skimSeconds: SkimSecondsSchema.nullable(),
  }),
  z.strictObject({
    type: z.literal('reading_skim_choice'),
    itemId: NestedIdSchema,
    focus: z.enum(SKIM_FOCUS),
    question: LearningTextSchema,
    options: OptionsSchema,
    answerOptionId: NestedIdSchema,
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_choice'),
    itemId: NestedIdSchema,
    question: LearningTextSchema,
    options: OptionsSchema,
    answerOptionId: NestedIdSchema,
    evidenceSegmentIds: EvidenceSchema,
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_true_false'),
    itemId: NestedIdSchema,
    statement: LearningTextSchema,
    allowNotStated: z.boolean(),
    answer: z.enum(['true', 'false', 'not_stated']),
    evidenceSegmentIds: EvidenceSchema,
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_short_answer'),
    itemId: NestedIdSchema,
    question: LearningTextSchema,
    accepted: AcceptedAnswersSchema,
    evidenceSegmentIds: EvidenceSchema,
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_part_heading_matching'),
    itemId: NestedIdSchema,
    headings: z.array(z.strictObject({ headingId: NestedIdSchema, text: LearningTextSchema })).min(3).max(READING_LIMITS.parts[1]),
    pairs: z.array(z.strictObject({ partId: NestedIdSchema, headingId: NestedIdSchema, answerExplanation: LocalizedTextSchema })).min(3).max(READING_LIMITS.parts[1]),
  }),
  z.strictObject({
    type: z.literal('reading_order'),
    itemId: NestedIdSchema,
    mode: z.enum(['parts', 'information']),
    /** Parts mode: each piece stands for one part of the main document. */
    pieces: z
      .array(z.strictObject({ pieceId: NestedIdSchema, text: LearningTextSchema, partId: NestedIdSchema.nullable() }))
      .min(READING_LIMITS.orderPieces[0])
      .max(READING_LIMITS.orderPieces[1]),
    acceptedOrders: z.array(z.array(NestedIdSchema)).min(1).max(2),
    answerExplanation: LocalizedTextSchema,
  }),
]);
export type ReadingItem = z.infer<typeof readingItemSchema>;

const PageSchema = z.strictObject({
  pageId: NestedIdSchema,
  estimatedDurationS: DurationSecondsSchema,
  /** Exam pages only; equals the brief's page limit. */
  timeLimitS: TimeLimitSecondsSchema.nullable(),
  instructions: LocalizedTextSchema,
  items: z.array(readingItemSchema).min(1).max(8),
});

/** Takes the course language like the other kinds; reading items have no per-mother-tongue fields. */
export const readingContentSchema = (_lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('reading'),
    theme: ThemeSchema,
    genre: ReadingGenreSchema,
    documents: z.array(ReadingDocumentSchema).length(2),
    steps: z
      .array(
        z.strictObject({
          id: NestedIdSchema,
          stage: z.enum(READING_STAGES),
          role: z.enum(['exercise', 'exam']),
          label: LocalizedLabelSchema,
          pages: z.array(PageSchema).min(1).max(4),
        }),
      )
      .length(READING_STAGES.length),
  });
export type ReadingContent = z.infer<ReturnType<typeof readingContentSchema>>;

/** Words of a text: whitespace-separated tokens with at least one letter or digit ("l'heure" is one, "–" none). */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Words of everything the document shows: title, meta lines, headings, segment texts and values. */
export function documentWords(doc: ReadingDocument): number {
  const texts = [doc.title, ...doc.meta, ...doc.parts.flatMap((p) => [p.heading, ...p.segments.flatMap((s) => [s.text, s.value])])];
  return texts.reduce((n, text) => n + (text ? countWords(text) : 0), 0);
}

/** True / false / not stated in the learning language (the options are never translated). */
export const TRUE_FALSE_LABELS: Record<string, Record<'true' | 'false' | 'not_stated', string>> = {
  fr: { true: 'Vrai', false: 'Faux', not_stated: 'Pas dans le texte' },
  de: { true: 'Richtig', false: 'Falsch', not_stated: 'Steht nicht im Text' },
  en: { true: 'True', false: 'False', not_stated: 'Not stated' },
};
