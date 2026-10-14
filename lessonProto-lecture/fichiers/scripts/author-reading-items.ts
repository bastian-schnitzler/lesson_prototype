/**
 * Item helpers and the lesson definition format for hand-authored reading lessons; see
 * scripts/author-reading.ts, which builds the brief and the lesson content from a definition.
 */
import type { LocalizedText } from '../src/schemas/artifactCommon.ts';
import type { Locale } from '../src/schemas/common.ts';
import type { ReadingGenre, ReadingItem, ReadingStage } from '../src/schemas/reading.ts';

export const L = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de });

/** Deterministic shuffle, so rebuilding a lesson yields identical files; never the given order or its reverse. */
export function shuffle<T>(list: T[], key: string): T[] {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  const same = (a: T[], b: T[]) => a.every((x, i) => x === b[i]);
  if (out.length > 2 && (same(out, list) || same(out, [...list].reverse()))) out.push(out.shift()!);
  else if (out.length === 2 && same(out, list)) out.reverse();
  return out;
}

/* -------------------------------------------------------------- documents */

/** A segment: its text, or [text, value] for a right-aligned value (price, quantity). */
export type SegmentDef = string | [text: string, value: string];
export interface PartDef { id: string; heading?: string; segments: SegmentDef[] }
/**
 * A document. Segment IDs are numbered through the document: m-s1, m-s2… in the main document and
 * x-s1… in the exam document; questions and highlights refer to them.
 */
export interface DocumentDef {
  /** What the document says (brief `documents.*.contents`). */
  contents: LocalizedText;
  title: string | null;
  meta: string[];
  parts: PartDef[];
  /** Key words in the main document: [keywordId, segmentId, text as it appears (default: the term)]. */
  highlights?: [string, string, string?][];
}

/* -------------------------------------------------------------- questions */

type Question = Extract<ReadingItem, { type: 'reading_choice' | 'reading_true_false' | 'reading_short_answer' }>;
/** A question with the localized focus the brief plans for it (detail questions). */
export type QuestionDef = Question & { focus?: LocalizedText };

/** Multiple choice: the right option first, then two or three wrong ones (shuffled in the file). */
export const choice = (id: string, question: string, right: string, wrong: string[], evidence: string[], explanation: LocalizedText, focus?: LocalizedText): QuestionDef => {
  const texts = shuffle([right, ...wrong], `${id}|${question}`);
  return { type: 'reading_choice', itemId: id, question, options: texts.map((text, n) => ({ optionId: `o${n + 1}`, text })), answerOptionId: `o${texts.indexOf(right) + 1}`, evidenceSegmentIds: evidence, answerExplanation: explanation, focus };
};

/** True / false (/ not stated from B1, set by the build): a "not stated" answer has no evidence. */
export const tf = (id: string, statement: string, answer: 'true' | 'false' | 'not_stated', evidence: string[], explanation: LocalizedText, focus?: LocalizedText): QuestionDef => ({
  type: 'reading_true_false', itemId: id, statement, allowNotStated: false, answer, evidenceSegmentIds: evidence, answerExplanation: explanation, focus,
});

/** Short typed answer; the first accepted answer is shown as the correct one. */
export const short = (id: string, question: string, answers: string[], evidence: string[], explanation: LocalizedText, focus?: LocalizedText, accentSensitive: string[] = []): QuestionDef => ({
  type: 'reading_short_answer', itemId: id, question, accepted: { answers, accentSensitive }, evidenceSegmentIds: evidence, answerExplanation: explanation, focus,
});

/* ---------------------------------------------------------------- structure */

/** Heading matching: [partId, heading, explanation] for every part of the main document (which has no headings). */
export const headings = (id: string, pairs: [string, string, LocalizedText][]): ReadingItem => {
  const list = pairs.map(([, text], n) => ({ headingId: `h${n + 1}`, text }));
  return { type: 'reading_part_heading_matching', itemId: id, headings: shuffle(list, id), pairs: pairs.map(([partId], n) => ({ partId, headingId: `h${n + 1}`, answerExplanation: pairs[n][2] })) };
};

/** Ordering: pieces in the right order; `parts` pieces stand for the parts of the main document. */
export const order = (id: string, mode: 'parts' | 'information', pieces: (string | [partId: string, text: string])[], explanation: LocalizedText, alternative?: number[]): ReadingItem => {
  const list = pieces.map((p, n) => ({ pieceId: `p${n + 1}`, text: typeof p === 'string' ? p : p[1], partId: typeof p === 'string' ? null : p[0] }));
  const ids = list.map((p) => p.pieceId);
  return { type: 'reading_order', itemId: id, mode, pieces: shuffle(list, id), acceptedOrders: alternative ? [ids, alternative.map((n) => ids[n])] : [ids], answerExplanation: explanation };
};

/* --------------------------------------------------------------- definition */

export interface KeywordDef {
  id: string;
  term: string;
  /** Meanings per mother tongue (every locale except the course language); the first is the matching label. */
  translations: Partial<Record<Locale, string[]>>;
  explanation: LocalizedText;
  /** Correction text of the key word in the matching exercise. */
  matching: LocalizedText;
}

/** Page estimates in seconds; omitted ones follow the level table in author-reading.ts. */
export interface DurationDef {
  keywords?: [list: number, matching: number];
  skim?: number;
  detail?: number;
  structure?: number;
  /** Per exam page: [estimate, time limit]. */
  exam?: [number, number][];
}

export interface ReadingDefinition {
  id: string;
  /** Defaults to the outline's working title. */
  title?: string;
  genre: ReadingGenre;
  objective: LocalizedText;
  situation: LocalizedText;
  readerTask: LocalizedText;
  coverageNotes: LocalizedText;
  prerequisites: LocalizedText[];
  keywords: KeywordDef[];
  main: DocumentDef;
  exam: DocumentDef;
  skim: { focus: 'genre' | 'author' | 'purpose'; question: string; right: string; wrong: string[]; explanation: LocalizedText };
  /** 3–4 questions on the open main document, each with its focus. */
  detail: QuestionDef[];
  structure: { instructions?: LocalizedText; item: ReadingItem };
  /** One or two pages with five questions in total on the exam document. */
  examPages: { pageId: string; questions: QuestionDef[] }[];
  durations?: DurationDef;
  /** Stage instructions replacing the shared ones (rarely needed). */
  instructions?: Partial<Record<ReadingStage, LocalizedText>>;
}
