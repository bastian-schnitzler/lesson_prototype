import type { z } from 'zod';

import type { LessonKind } from './common.ts';
import { grammarBriefSchema, grammarContentSchema, type GrammarBrief, type GrammarContent } from './grammar.ts';
import { readingBriefSchema, readingContentSchema, type ReadingBrief, type ReadingContent } from './reading.ts';
import { vocabularyBriefSchema, vocabularyContentSchema, type VocabularyBrief, type VocabularyContent } from './vocabulary.ts';

/** Categories with an agreed brief/content contract; functions follow in phase 4. */
export const SUPPORTED_ARTIFACT_KINDS = ['vocabulary', 'grammar', 'reading'] as const satisfies readonly LessonKind[];
export type SupportedKind = (typeof SUPPORTED_ARTIFACT_KINDS)[number];

export function isSupportedKind(kind: LessonKind): kind is SupportedKind {
  return (SUPPORTED_ARTIFACT_KINDS as readonly string[]).includes(kind);
}

export type Brief = VocabularyBrief | GrammarBrief | ReadingBrief;
export type LessonContent = VocabularyContent | GrammarContent | ReadingContent;

/** The Draft (brief) schema for a lesson kind and learning language. */
export function briefSchema(kind: SupportedKind, lang: string): z.ZodType<Brief> {
  if (kind === 'reading') return readingBriefSchema(lang);
  return kind === 'vocabulary' ? vocabularyBriefSchema(lang) : grammarBriefSchema(lang);
}

/** Vocabulary lessons consist of the brief only (P2-04); other kinds also have a lesson content file. */
export function hasContentFile(kind: LessonKind): boolean {
  return kind !== 'vocabulary';
}

/** The renderable lesson content schema; never a brief schema (SPEC section 4). */
export function contentSchema(kind: SupportedKind, lang: string): z.ZodType<LessonContent> {
  if (kind === 'reading') return readingContentSchema(lang);
  return kind === 'vocabulary' ? vocabularyContentSchema(lang) : grammarContentSchema(lang);
}
