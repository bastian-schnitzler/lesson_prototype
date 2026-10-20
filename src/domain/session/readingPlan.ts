import type { Locale } from '../../schemas/common.ts';
import { TRUE_FALSE_LABELS, type ReadingBrief, type ReadingContent, type ReadingDocument, type ReadingGenre, type ReadingItem, type ReadingKeyword } from '../../schemas/reading.ts';
import type { Option, PlanUnit } from './plan.ts';

/**
 * Reading part of the lesson plan (SPEC section 9): the documents and key words the renderers show,
 * and the scored units of each reading item. Documents and flashcards are presentation only; every
 * matching row, question and ordering task is one unit.
 */
export interface ReadingPlanData {
  genre: ReadingGenre;
  situation: ReadingBrief['situation'];
  documents: Map<string, ReadingDocument>;
  keywords: Map<string, ReadingKeyword>;
}

export function readingPlanData(content: ReadingContent, brief: ReadingBrief): ReadingPlanData {
  return {
    genre: content.genre,
    situation: brief.situation,
    documents: new Map(content.documents.map((d) => [d.documentId, d])),
    keywords: new Map(brief.keywords.map((k) => [k.id, k])),
  };
}

/** Pieces of an ordering task are whole sentences: their order reads first → last. */
export const ORDER_SEPARATOR = ' → ';

export function readingUnits(pageId: string, item: ReadingItem, data: ReadingPlanData, lang: string, motherTongue: Locale): PlanUnit[] {
  const id = (suffix = '') => `${pageId}/${item.itemId}${suffix}`;
  const base = { itemId: item.itemId, itemType: item.type };
  const learning = (options: { optionId: string; text: string }[]): Option[] => options.map((o) => ({ id: o.optionId, text: o.text, lang: 'learning' }));

  switch (item.type) {
    case 'reading_keyword_matching': {
      // As vocabulary matching: the first meaning in the mother tongue on the left, the key word on the right.
      const meaning = (keywordId: string) => data.keywords.get(keywordId)?.translations[motherTongue]?.[0] ?? keywordId;
      const options = item.keywordIds.map((k) => ({ id: k, text: meaning(k), lang: 'native' as const }));
      return item.keywordIds.map((k) => ({
        ...base, kind: 'choice', id: id(`/${k}`), prompt: { learning: data.keywords.get(k)?.term ?? k },
        options, correct: [k], explanation: data.keywords.get(k)!.explanation, answer: meaning(k), answerLang: 'native',
      }));
    }
    case 'reading_skim_choice':
    case 'reading_choice':
      return [{
        ...base, kind: 'choice', id: id(), prompt: { learning: item.question }, options: learning(item.options), correct: [item.answerOptionId],
        explanation: item.answerExplanation, answer: item.options.find((o) => o.optionId === item.answerOptionId)?.text ?? '', answerLang: 'learning',
      }];
    case 'reading_true_false': {
      const labels = TRUE_FALSE_LABELS[lang] ?? TRUE_FALSE_LABELS.en;
      return [{
        ...base, kind: 'choice', id: id(), prompt: { learning: item.statement }, options: (['true', 'false'] as const).map((o) => ({ id: o, text: labels[o], lang: 'learning' })),
        correct: [item.answer], explanation: item.answerExplanation, answer: labels[item.answer], answerLang: 'learning',
      }];
    }
    case 'reading_order': {
      const tokens = item.pieces.map((p) => ({ id: p.pieceId, text: p.text, lang: 'learning' as const }));
      return [{
        ...base, kind: 'order', id: id(), prompt: {}, tokens, acceptedOrders: item.acceptedOrders, explanation: item.answerExplanation,
        answer: item.acceptedOrders[0].map((t) => tokens.find((x) => x.id === t)?.text ?? '').join(ORDER_SEPARATOR), answerLang: 'learning',
      }];
    }
    case 'reading_flashcards':
    case 'reading_document':
      return [];
  }
}
