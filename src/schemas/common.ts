import { z } from 'zod';

/**
 * Shared enums. Migrated from the legacy draft modules in old_prompt/;
 * P1-03 extends this module and P1-04 removes the drafts.
 */

/** Supported mother tongues and interface languages. */
export const LOCALES = ['en', 'fr', 'de'] as const;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

/** A learning language code as used in outline files and lesson IDs. */
export const LanguageSchema = z.string().regex(/^[a-z]{2}$/, 'expected a two-letter language code');

/** CEFR levels in teaching order. */
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

export const LESSON_KINDS = ['vocabulary', 'grammar', 'functions', 'reading'] as const;
export const LessonKindSchema = z.enum(LESSON_KINDS);
export type LessonKind = z.infer<typeof LessonKindSchema>;

/** Grammar topics; every grammar lesson has exactly one. */
export const TOPICS = [
  'nouns_and_determiners',
  'pronouns',
  'verbs_morphology',
  'verb_usage',
  'syntax_and_sentence_structure',
  'subordinate_clauses',
  'prepositions_and_case',
  'adjectives',
  'adverbs',
  'agreement',
  'negation',
  'comparison_and_quantity',
  'information_structure_and_pragmatics',
] as const;
export const TopicSchema = z.enum(TOPICS);
export type Topic = z.infer<typeof TopicSchema>;

/** Threshold Level themes; every non-grammar lesson has exactly one. */
export const THEMES = [
  'personal_identification',
  'house_and_home',
  'daily_life',
  'free_time',
  'travel',
  'relations',
  'health',
  'education',
  'shopping',
  'food_and_drink',
  'services',
  'places',
  'language',
  'weather',
] as const;
export const ThemeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof ThemeSchema>;

export function compareLevels(a: Level, b: Level): number {
  return LEVELS.indexOf(a) - LEVELS.indexOf(b);
}
