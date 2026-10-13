import type { LocalizedText } from '../src/schemas/artifactCommon.ts';
import type { WORD_CLASSES } from '../src/schemas/vocabulary.ts';

/** Definition format of hand-written function lessons (P4-03), built by scripts/author-functions.ts. */
export const L = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de });

/** A French sentence with its English and German translations. */
type Example = [fr: string, en: string, de: string];

/**
 * Notation: tokens are separated by " | " ("Je | voudrais | un café"); a gap is written in square
 * brackets inside a line ("Bonsoir. [Je voudrais] un thé."), alternatives separated by " / ".
 */
export interface FunctionsDefinition {
  id: string;
  title: string;
  objective: LocalizedText;
  situation: LocalizedText;
  coverageNotes: LocalizedText;
  prerequisites?: LocalizedText[];
  roles: [Role, Role];
  expressions: { id: string; text: string; openEnd?: boolean; en: string | string[]; de: string | string[]; explanation: LocalizedText; example: Example }[];
  words: { id: string; term: string; form: string; en: string | string[]; de: string | string[]; wordClass?: (typeof WORD_CLASSES)[number]; genders?: ('masculine' | 'feminine')[]; explanation: LocalizedText; example: Example }[];
  /** Model dialogue: role, French line, English, German, note. */
  dialogue: [role: string, fr: string, en: string, de: string, note: LocalizedText][];
  /**
   * Practice word order, one per expression: expression ID, tokens, explanation. Tokens must admit exactly
   * one order (P4-05 review): keep final punctuation on the last chunk, avoid swappable parts such as
   * "sur place | ou | à emporter" and two independent sentences that could change places.
   */
  wordOrder: [expression: string, tokens: string, explanation: LocalizedText][];
  /** Dialogue gaps, one per expression: role A's line, then role B's line with "___". */
  gaps: { e: string; context: [role: string, text: string]; role: string; line: string; choices: [string, string, string]; explanation: LocalizedText }[];
  /** Exam part 1: replies to role A built from tokens, with distractors. */
  replies: { e: string; context: [role: string, text: string]; role: string; reply: string; distractors: string[]; explanation: LocalizedText }[];
  /**
   * Exam part 2: role, line with at most one [gap], the whole line in English and German (shown to the
   * learner, P4-05 review), explanation of the gap (null without gap).
   */
  examDialogue: [role: string, line: string, en: string, de: string, explanation: LocalizedText | null][];
}
export type Role = { id: string; label: string; en: string; de: string };
