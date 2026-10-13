/**
 * Item helpers and the lesson definition format for hand-authored grammar lessons (P3-07); see
 * scripts/author-grammar.ts, which builds the brief and the lesson content from a definition.
 */
import type { AcceptedAnswers, LocalizedText } from '../src/schemas/artifactCommon.ts';
import { PERSONS, type GrammarBrief, type GrammarExerciseType, type GrammarItem } from '../src/schemas/grammar.ts';

export const L = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de });
type Native = { en: string; de: string };
export type Item = Exclude<GrammarItem, { type: 'grammar_explanation' | 'production_feedback_placeholder' }>;
export type Draft = Item extends infer T ? (T extends unknown ? Omit<T, 'itemId'> : never) : never;

/* ------------------------------------------------------------- item helpers */

/** Accepted answers: every fully correct form, the first one shown as the correct answer. */
const accepted = (answers: string | string[]): AcceptedAnswers => ({ answers: [answers].flat() });

/** Deterministic shuffle, so rebuilding a lesson yields identical files. */
function shuffle<T>(list: T[], key: string): T[] {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  // A shuffle that keeps the order, or simply reverses it, gives the answer away.
  const same = (a: T[], b: T[]) => a.every((x, i) => x === b[i]);
  if (out.length > 2 && (same(out, list) || same(out, [...list].reverse()))) out.push(out.shift()!);
  else if (out.length === 2 && same(out, list)) out.reverse();
  return out;
}

/** Multiple-choice gap: the answer and three distractors. */
export const gc = (ruleIds: string[], before: string, answer: string, wrong: [string, string, string], after: string, explanation: LocalizedText, hint: LocalizedText | null = null): Draft => {
  const texts = shuffle([answer, ...wrong], `${before}|${answer}|${after}`);
  return { type: 'grammar_gap_choice', ruleIds, before, after, choices: texts.map((text, n) => ({ choiceId: `c-${n + 1}`, text })), answerChoiceId: `c-${texts.indexOf(answer) + 1}`, hint, answerExplanation: explanation };
};

/** Typed gap; `answers` lists every accepted form, the first one is shown as the correct answer. */
export const gt = (ruleIds: string[], before: string, answers: string | string[], after: string, explanation: LocalizedText, hint: LocalizedText | null = null): Draft => ({
  type: 'grammar_gap_typing', ruleIds, before, after, accepted: accepted(answers), hint, answerExplanation: explanation,
});

/** Word order: the words in the correct order (no final full stop); `alternatives` are other valid orders of the same words. */
export const wo = (ruleIds: string[], words: string[], explanation: LocalizedText, alternatives: string[][] = []): Draft => {
  const tokens = words.map((text, n) => ({ tokenId: `t-${n + 1}`, text }));
  const ids = (order: string[]) => {
    const free = [...tokens];
    return order.map((text) => {
      const i = free.findIndex((t) => t.text === text);
      if (i < 0) throw new Error(`alternative uses "${text}" too often or not at all: ${order.join(' ')}`);
      return free.splice(i, 1)[0].tokenId;
    });
  };
  return { type: 'grammar_word_order', ruleIds, tokens: shuffle(tokens, words.join(' ')), acceptedOrders: [words, ...alternatives].map(ids), answerExplanation: explanation };
};

/** Error spotter: the correct sentence, the index of the word replaced by `wrong`, and the correction mode. */
export const sp = (ruleIds: string[], words: string[], index: number, wrong: string, explanation: LocalizedText, choices: string[] = []): Draft => ({
  type: 'grammar_error_spotter', ruleIds,
  tokens: words.map((text, n) => ({ tokenId: `t-${n + 1}`, text: n === index ? wrong : text })),
  faultyTokenId: `t-${index + 1}`,
  correction: { mode: choices.length ? 'select' : 'type', accepted: accepted(words[index]), choices },
  answerExplanation: explanation,
});

/** Pronoun/form matching: rows of [pronoun, form, explanation]; `extra` adds distractor tokens. */
export const pm = (ruleIds: string[], rows: [string, string, LocalizedText][], extra: string[] = []): Draft => {
  if (rows.length < 2) throw new Error('a pronoun match needs at least two rows');
  const texts = [...rows.map((r) => r[1]), ...extra];
  return {
    type: 'grammar_pronoun_form_match', ruleIds,
    tokens: shuffle(texts.map((text, n) => ({ tokenId: `t-${n + 1}`, text })), texts.join('|')),
    rows: rows.map(([pronoun, form, answerExplanation], n) => ({ rowId: `r-${n + 1}`, pronoun, validForms: [form], answerExplanation })),
  };
};

/** Pronoun/form typing: rows of [pronoun, accepted form(s), explanation]. */
export const pt = (ruleIds: string[], rows: [string, string | string[], LocalizedText][]): Draft => ({
  type: 'grammar_pronoun_form_typing', ruleIds,
  rows: rows.map(([pronoun, answers, answerExplanation], n) => ({ rowId: `r-${n + 1}`, pronoun, accepted: accepted(answers), answerExplanation })),
});

/** Person matching (D48): six rows, or three rows of one number ('sg' | 'pl'). */
export const person = (ruleIds: string[], mode: 'translation' | 'forms', rows: [string | Native, string, LocalizedText][], number: 'sg' | 'pl' | 'all' = 'all'): Draft => {
  const persons = number === 'pl' ? PERSONS.slice(3) : number === 'sg' ? PERSONS.slice(0, 3) : PERSONS;
  if (rows.length !== persons.length) throw new Error(`person matching ${number} needs ${persons.length} rows`);
  return {
    type: 'grammar_person_matching', ruleIds, mode,
    rows: rows.map(([left, answer, answerExplanation], n) => ({
      person: persons[n], pronoun: mode === 'forms' ? (left as string) : null, native: mode === 'translation' ? (left as Native as LocalizedText) : null, answer, answerExplanation, // native maps omit the course language
    })),
  };
};

/* --------------------------------------------------------------- definition */

export interface LessonDefinition {
  id: string;
  /** Replaces the rules of the existing brief when given. */
  rules?: { id: string; summary: LocalizedText }[];
  scopeBoundaries?: LocalizedText;
  newVerbs: { infinitive: string; translations: Native }[];
  blocks: {
    id: string;
    /** Brief and explanation fields; omitted ones are kept from the existing files. */
    title?: LocalizedText;
    ruleIds?: string[];
    explanationPlan?: LocalizedText;
    examples?: GrammarBrief['blocks'][number]['examples'];
    pitfalls?: LocalizedText[];
    explanation?: Pick<Extract<GrammarItem, { type: 'grammar_explanation' }>, 'heading' | 'text' | 'formTable' | 'examples'>;
    exercises: { id: string; type: GrammarExerciseType; items: Draft[] }[];
  }[];
  exam: { pageId: string; type: 'grammar_gap_typing' | 'grammar_pronoun_form_typing' | 'grammar_word_order'; items: Draft[] }[];
}
