import { z } from 'zod';

import { LanguageSchema, LevelSchema, LOCALES, LocaleSchema, type Locale } from './common.ts';
import { LessonIdSchema } from './outline.ts';

/**
 * Building blocks shared by briefs (Draft) and renderable lesson content.
 * Schemas here are structural, so they convert to JSON Schema for Gemini
 * structured output; cross-reference and pedagogical rules live in
 * src/validation/.
 */

/**
 * Version 2 is the multilingual contract: en/fr/de support text and native
 * translations for every mother tongue except the learning language. Older,
 * single-language artifacts are stale and must be regenerated.
 */
export const ARTIFACT_SCHEMA_VERSION = 2;

/** Field-specific bounds for generated text. */
export const TEXT_LIMITS = { label: 120, short: 300, long: 1200, learning: 300 } as const;

const boundedText = (max: number) => z.string().trim().min(1).max(max);

/** Learner-support text in one locale. */
export const SupportTextSchema = boundedText(TEXT_LIMITS.short);

/** Text in the learning language: terms, examples, sentences, answers. */
export const LearningTextSchema = boundedText(TEXT_LIMITS.learning);

/** en/fr/de map for objectives, instructions, explanations and other support text. */
export const localizedText = (max: number = TEXT_LIMITS.short) =>
  z.strictObject({ en: boundedText(max), fr: boundedText(max), de: boundedText(max) });
export const LocalizedTextSchema = localizedText();
export const LocalizedLabelSchema = localizedText(TEXT_LIMITS.label);
export const LocalizedLongTextSchema = localizedText(TEXT_LIMITS.long);
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const TranslationVariantsSchema = z.array(SupportTextSchema).min(1).max(6);

/** Mother tongues offered for a course: every locale except its learning language (D38). */
export function nativeLocales(lang: string): Locale[] {
  return LOCALES.filter((l) => l !== lang);
}

function nativeMap<T extends z.ZodType>(lang: string, value: T) {
  return z.strictObject(Object.fromEntries(nativeLocales(lang).map((l) => [l, value])) as Record<Locale, T>);
}

/** Translation variants (first = display form) for each available mother tongue. */
export const nativeTranslationsSchema = (lang: string) => nativeMap(lang, TranslationVariantsSchema);
export type NativeTranslations = Partial<Record<Locale, string[]>>;

/** One native-language text (a prompt or a translated example) per available mother tongue. */
export const nativeTextSchema = (lang: string) => nativeMap(lang, SupportTextSchema);
export type NativeText = Partial<Record<Locale, string>>;

/** Stable nested ID: target, rule, block, step, page, item, token. */
export const NestedIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,47}$/, 'expected a lowercase id of letters, digits and hyphens');

export const DurationSecondsSchema = z.number().int().min(5).max(3600);
export const TimeLimitSecondsSchema = z.number().int().min(5).max(900);

/**
 * Accepted answers for one free-text unit. Accent or case errors earn half a point, also where the
 * accent makes another word (la/là): an accent is a spelling mistake (D40).
 */
export const AcceptedAnswersSchema = z.strictObject({
  answers: z.array(LearningTextSchema).min(1).max(8),
});
export type AcceptedAnswers = z.infer<typeof AcceptedAnswersSchema>;

export const ProvenanceSchema = z.strictObject({
  generator: boundedText(80),
  model: boundedText(80),
  promptVersion: boundedText(40),
  generatedAt: z.iso.datetime(),
  /** Canonical hashes of the inputs: the outline entry, and for content the brief. */
  inputHashes: z.strictObject({ outline: z.string().min(16), brief: z.string().min(16).optional() }),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Fields every brief and lesson file carries; they must equal the outline/course metadata. */
export const envelopeShape = {
  schemaVersion: z.literal(ARTIFACT_SCHEMA_VERSION),
  id: LessonIdSchema,
  lang: LanguageSchema,
  level: LevelSchema,
  /** The supported locale contract; no single nativeLanguage field exists. */
  locales: z.tuple([z.literal('en'), z.literal('fr'), z.literal('de')]),
  title: LearningTextSchema,
  objective: LocalizedTextSchema,
  estimatedMinutes: z.number().int().min(1).max(120),
  provenance: ProvenanceSchema,
};

/** Fixed scoring policy (D6, D17); stored so a reviewer sees it with the plan. */
export const ScoringPolicySchema = z.strictObject({
  practiceWeight: z.literal(35),
  examWeight: z.literal(65),
  orthographyCredit: z.literal(0.5),
});

export { LocaleSchema };
