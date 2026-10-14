import type { Locale } from '../../schemas/common.ts';
import { TRUE_FALSE_LABELS, type ReadingBrief, type ReadingContent, type ReadingDocument, type ReadingGenre, type ReadingItem, type ReadingKeyword } from '../../schemas/reading.ts';
import type { Option, PlanUnit } from './plan.ts';

/**
 * Reading part of the lesson plan (docs/reading-lessons.md): the documents and key words the
 * renderers show, and the scored units of each reading item. Documents and the key word list are
 * presentation only; every question, matching row and order task is one unit.
 */
export interface ReadingPlanData {
  genre: ReadingGenre;
  documents: Map<string, ReadingDocument>;
  keywords: Map<string, ReadingKeyword>;
  /** Every segment of both documents by ID, for evidence marks and quotes. */
  segments: Map<string, { documentId: string; text: string }>;
  /** Label of each part in structure tasks: its number and first words. */
  partLabels: Map<string, string>;
}

const EXCERPT_WORDS = 8;

function excerpt(text: string): string {
  const words = text.split(/\s+/);
  return words.length > EXCERPT_WORDS ? `${words.slice(0, EXCERPT_WORDS).join(' ')} …` : text;
}

export function readingPlanData(content: ReadingContent, brief: ReadingBrief): ReadingPlanData {
  return {
    genre: content.genre,
    documents: new Map(content.documents.map((d) => [d.documentId, d])),
    keywords: new Map(brief.keywords.map((k) => [k.id, k])),
    segments: new Map(content.documents.flatMap((d) => d.parts.flatMap((p) => p.segments.map((s) => [s.segmentId, { documentId: d.documentId, text: s.text }] as const)))),
    partLabels: new Map(content.documents.flatMap((d) => d.parts.map((p, n) => [p.partId, `${n + 1}. ${excerpt(p.segments[0].text)}`] as const))),
  };
}

export function readingUnits(pageId: string, item: ReadingItem, data: ReadingPlanData, lang: string, motherTongue: Locale): PlanUnit[] {
  const id = (suffix = '') => `${pageId}/${item.itemId}${suffix}`;
  const base = { itemId: item.itemId, itemType: item.type };
  /** First meaning of a key word in the mother tongue: the matching label. */
  const meaning = (keywordId: string) => {
    const translations = data.keywords.get(keywordId)?.translations;
    return (translations?.[motherTongue] ?? Object.values(translations ?? {})[0])?.[0] ?? keywordId;
  };
  const evidence = (segmentIds: string[]) => (segmentIds.length ? { evidence: { segmentIds, quotes: segmentIds.map((s) => data.segments.get(s)?.text ?? s) } } : {});
  const learning = (options: { optionId: string; text: string }[]): Option[] => options.map((o) => ({ id: o.optionId, text: o.text, lang: 'learning' }));

  switch (item.type) {
    case 'reading_keyword_matching': {
      const options = item.pairs.map((p) => ({ id: p.keywordId, text: meaning(p.keywordId), lang: 'native' as const }));
      return item.pairs.map((p) => ({
        ...base, kind: 'choice', id: id(`/${p.keywordId}`), prompt: { learning: data.keywords.get(p.keywordId)?.term ?? p.keywordId },
        options, correct: [p.keywordId], explanation: p.answerExplanation, answer: options.find((o) => o.id === p.keywordId)!.text, answerLang: 'native',
      }));
    }
    case 'reading_skim_choice':
    case 'reading_choice':
      return [{
        ...base, kind: 'choice', id: id(), prompt: { learning: item.question }, options: learning(item.options), correct: [item.answerOptionId],
        explanation: item.answerExplanation, answer: item.options.find((o) => o.optionId === item.answerOptionId)?.text ?? '', answerLang: 'learning',
        ...(item.type === 'reading_choice' ? evidence(item.evidenceSegmentIds) : {}),
      }];
    case 'reading_true_false': {
      const labels = TRUE_FALSE_LABELS[lang] ?? TRUE_FALSE_LABELS.en;
      const ids = item.allowNotStated ? (['true', 'false', 'not_stated'] as const) : (['true', 'false'] as const);
      return [{
        ...base, kind: 'choice', id: id(), prompt: { learning: item.statement }, options: ids.map((o) => ({ id: o, text: labels[o], lang: 'learning' })), correct: [item.answer],
        explanation: item.answerExplanation, answer: labels[item.answer], answerLang: 'learning', ...evidence(item.evidenceSegmentIds),
      }];
    }
    case 'reading_short_answer':
      return [{
        ...base, kind: 'text', id: id(), prompt: { learning: item.question }, accepted: item.accepted,
        explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning', ...evidence(item.evidenceSegmentIds),
      }];
    case 'reading_part_heading_matching': {
      const options = learning(item.headings.map((h) => ({ optionId: h.headingId, text: h.text })));
      return item.pairs.map((p) => ({
        ...base, kind: 'choice', id: id(`/${p.partId}`), prompt: { learning: data.partLabels.get(p.partId) ?? p.partId },
        options, correct: [p.headingId], explanation: p.answerExplanation, answer: options.find((o) => o.id === p.headingId)?.text ?? '', answerLang: 'learning',
      }));
    }
    case 'reading_order': {
      const tokens = item.pieces.map((p) => ({ id: p.pieceId, text: p.text, lang: 'learning' as const }));
      return [{
        ...base, kind: 'order', id: id(), prompt: {}, tokens, acceptedOrders: item.acceptedOrders, explanation: item.answerExplanation,
        answer: item.acceptedOrders[0].map((t) => tokens.find((x) => x.id === t)?.text ?? '').join(' → '), answerLang: 'learning',
      }];
    }
    case 'reading_keywords':
    case 'reading_document':
      return [];
  }
}
