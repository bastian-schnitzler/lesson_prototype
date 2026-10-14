import type { LessonPlan } from '../domain/session/plan.ts';
import type { ReadingItem } from '../schemas/reading.ts';
import { Learn, useBriefText } from './briefParts.tsx';

/** Reading lines of an item in the Content review: where a document is placed, the key words, the proof of an answer. */
export function ReadingItemReview({ item, plan }: { item: ReadingItem; plan: LessonPlan }) {
  const text = useBriefText(plan.lang);
  const { t, duration } = text;
  switch (item.type) {
    case 'reading_document':
      return (
        <p>
          {t(item.documentId === 'main' ? 'reading.documentMain' : 'reading.documentExam')} · {t(`reading.view.${item.view}`)}
          {item.skimSeconds !== null && <> · {t('reading.skimFor', { time: duration(item.skimSeconds) })}</>}
        </p>
      );
    case 'reading_keywords':
      return (
        <ul>
          {item.keywordIds.map((id) => {
            const keyword = plan.reading?.keywords.get(id);
            return keyword && <li key={id}><Learn lang={plan.lang}>{keyword.term}</Learn> — <span lang={text.nativeLocale}>{text.native(keyword.translations)?.join(' / ')}</span> · {text.ui(keyword.explanation)}</li>;
          })}
        </ul>
      );
    case 'reading_choice':
    case 'reading_true_false':
    case 'reading_short_answer':
      return item.evidenceSegmentIds.length ? (
        <p>{t('reading.evidence')}: {item.evidenceSegmentIds.map((id) => <q key={id} lang={plan.lang}>{plan.reading?.segments.get(id)?.text ?? id}</q>)}</p>
      ) : <p>{t('reading.noEvidence')}</p>;
    default:
      return null;
  }
}
