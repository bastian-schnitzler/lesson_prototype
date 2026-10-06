import type { AcceptedAnswers } from '../schemas/artifactCommon.ts';

/**
 * Free-text answer classification (SPEC section 5, D7, D17, D40). Practice and
 * exams share it; exam classifications stay hidden until the final results.
 */
export type AnswerOutcome = 'fully_correct' | 'orthography_only' | 'incorrect' | 'unanswered';

export const OUTCOME_CREDIT: Record<AnswerOutcome, number> = {
  fully_correct: 1,
  orthography_only: 0.5,
  incorrect: 0,
  unanswered: 0,
};

export interface Classification {
  outcome: AnswerOutcome;
  credit: number;
  /** The submitted text, unchanged. */
  response: string;
  /** The accepted answer the response matched or came closest to; the first answer otherwise. */
  expected: string;
}

/**
 * NFC; trims and collapses whitespace, including no-break and narrow no-break
 * spaces; unifies typographic apostrophes. Keeps case and accents.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’ʼ′`´]/g, "'")
    .replace(/[\s   ]+/g, ' ')
    .trim();
}

function stripMarks(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

/** Case and accents removed. */
function foldAccents(s: string): string {
  return stripMarks(s.toLowerCase());
}

/** Also spells ligatures and umlauts as digraphs: sœur ~ soeur, Mädchen ~ Maedchen. */
function foldDigraphs(s: string): string {
  return stripMarks(
    s
      .toLowerCase()
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue'),
  );
}

const WORD_EDGE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/**
 * True when the response differs from `answer` in the accent of a word whose
 * accent marks a different word (à vs a). Assumes both fold to the same text.
 */
function breaksAccentSensitiveWord(response: string, answer: string, sensitive: ReadonlySet<string>): boolean {
  if (sensitive.size === 0) return false;
  const a = answer.split(' ');
  const r = response.split(' ');
  if (a.length !== r.length) return false;
  return a.some((word, i) => {
    const bare = word.replace(WORD_EDGE, '').toLowerCase();
    return sensitive.has(bare) && r[i].replace(WORD_EDGE, '').toLowerCase() !== bare;
  });
}

export function classifyAnswer(response: string, accepted: AcceptedAnswers): Classification {
  const r = normalizeAnswer(response);
  const answers = accepted.answers.map(normalizeAnswer);
  const base = { response, expected: accepted.answers[0] };
  if (r === '') return { ...base, outcome: 'unanswered', credit: 0 };

  const exact = answers.findIndex((a) => a === r);
  if (exact >= 0) return { ...base, outcome: 'fully_correct', credit: 1, expected: accepted.answers[exact] };

  const sensitive = new Set(accepted.accentSensitive.map((w) => normalizeAnswer(w).toLowerCase()));
  const close = answers.findIndex((a) => foldAccents(a) === foldAccents(r) || foldDigraphs(a) === foldDigraphs(r));
  if (close >= 0) {
    const expected = accepted.answers[close];
    if (breaksAccentSensitiveWord(r, answers[close], sensitive)) return { ...base, outcome: 'incorrect', credit: 0, expected };
    return { ...base, outcome: 'orthography_only', credit: 0.5, expected };
  }
  return { ...base, outcome: 'incorrect', credit: 0 };
}
