import { useEffect, useState } from 'react';

import { useI18n } from '../app/context.tsx';
import { ReadingDocument } from '../components/ReadingDocument.tsx';
import type { LessonPlan, PlanUnit } from '../domain/session/plan.ts';
import { ChoiceControl, Countdown, ListenButton, OrderControl, TextControl, UnitRow, type RendererProps } from './controls.tsx';

/**
 * Reading renderers (docs/reading-lessons.md). The document is its own item, placed first on its
 * page; questions and the structure task use the shared answer controls, and both matchings use the
 * vocabulary matching board (vocabularyRenderers.tsx).
 */

/** Key under which a skimmed document is recorded in the session's `revealed`, like a turned flashcard. */
export const SKIMMED = 'skimmed';

/** `${pageId}/${itemId}` of the page's skim-view document, if it has one. */
function skimKey(plan: LessonPlan, pageId: string): string | undefined {
  const doc = plan.pages.find((p) => p.pageId === pageId)?.items.find((it) => it.type === 'reading_document' && it.view === 'skim');
  return doc ? `${pageId}/${doc.itemId}` : undefined;
}

/** The skim question opens once the document blurred or the learner finished reading. */
export function isSkimmed(plan: LessonPlan, pageId: string, revealed: Record<string, string[]>): boolean {
  const key = skimKey(plan, pageId);
  return !key || (revealed[key] ?? []).includes(SKIMMED);
}

/** Key words: the word (with audio), its meaning in the mother tongue and a short explanation. */
export function KeywordsRenderer({ item, plan, motherTongue }: RendererProps) {
  const { t, locale } = useI18n();
  if (item.type !== 'reading_keywords') return null;
  return (
    <ul className="example-cards keyword-cards">
      {item.keywordIds.map((id) => {
        const keyword = plan.reading?.keywords.get(id);
        if (!keyword) return null;
        const meanings = keyword.translations[motherTongue] ?? Object.values(keyword.translations)[0] ?? [];
        return (
          <li key={id}>
            <span className="keyword-term">
              <strong lang={plan.lang}>{keyword.term}</strong>
              <ListenButton text={keyword.term} lang={plan.lang} variant="icon" label={t('session.listenWord', { word: keyword.term })} />
            </span>
            <span lang={motherTongue}><span className="visually-hidden">{t('reading.meaning')}: </span>{meanings.join(' / ')}</span>
            <span className="muted">{keyword.explanation[locale]}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The document of the page. In the skim view a countdown runs; the document blurs when it ends or
 * when the learner has finished reading. A reload before the blur restarts the countdown; a blurred
 * document stays blurred. After Check, the segments that prove the answers are marked.
 */
export function DocumentRenderer({ item, plan, mode, locked, pageId, revealed, onReveal }: RendererProps) {
  const { t } = useI18n();
  const skim = item.type === 'reading_document' && item.view === 'skim';
  const skimmed = skim && isSkimmed(plan, pageId, revealed);
  const itemKey = `${pageId}/${item.itemId}`;
  const seconds = item.type === 'reading_document' ? item.skimSeconds ?? 0 : 0;
  const [deadline] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!skim || skimmed) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) onReveal(itemKey, SKIMMED);
    };
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [skim, skimmed, deadline, itemKey, onReveal]);
  if (item.type !== 'reading_document') return null;
  const doc = plan.reading?.documents.get(item.documentId);
  if (!doc) return null;
  const page = plan.pages.find((p) => p.pageId === pageId);
  const evidence = mode === 'feedback' ? new Set(page?.units.filter((u) => locked[u.id]).flatMap((u) => u.evidence?.segmentIds ?? [])) : undefined;
  return (
    <div className={`reading-doc-slot${skim ? '' : ' is-side'}`}>
      {skim && !skimmed && (
        <div className="reading-skim-bar">
          <Countdown remainingMs={Math.max(0, deadline - now)} totalMs={seconds * 1000} label={t('reading.skimLabel')} announce={(time) => t('reading.skimTimeLeft', { time })} />
          <button type="button" className="button button-outline" onClick={() => onReveal(itemKey, SKIMMED)}>{t('reading.skimDone')}</button>
        </div>
      )}
      {skimmed && mode === 'answering' && <p className="reading-note" role="status">{t('reading.skimBlurred')}</p>}
      <ReadingDocument doc={doc} lang={plan.lang} highlightKeywords={item.view !== 'exam'} evidence={evidence} blurred={skimmed && mode === 'answering'} />
    </div>
  );
}

/** One question on the document: a choice, a true/false(/not stated) statement, or a short typed answer. */
function QuestionRow({ unit, props }: { unit: PlanUnit; props: RendererProps }) {
  const { t } = useI18n();
  const lang = props.plan.lang;
  const statement = unit.itemType === 'reading_true_false';
  const question = unit.prompt.learning ?? '';
  return (
    <UnitRow unit={unit} props={props}>
      <div className="field reading-question">
        <span lang={lang}>{statement && <span className="visually-hidden">{t('reading.statement')}: </span>}{question}</span>
        {unit.kind === 'text' ? (
          <TextControl unit={unit} props={props} label={question || t('reading.answer')} />
        ) : unit.kind === 'choice' ? (
          <ChoiceControl unit={unit} props={props} label={question} layout="radio" ordered={statement} />
        ) : null}
      </div>
    </UnitRow>
  );
}

/** Skim, detail and exam questions; the skim question stays closed until the document is skimmed. */
export function QuestionRenderer(props: RendererProps) {
  const { t } = useI18n();
  if (props.item.type === 'reading_skim_choice' && props.mode === 'answering' && !isSkimmed(props.plan, props.pageId, props.revealed)) {
    return <p className="muted reading-locked">{t('reading.skimLocked')}</p>;
  }
  return <div className="units reading-questions">{props.units.map((unit) => <QuestionRow key={unit.id} unit={unit} props={props} />)}</div>;
}

/** Structure: put the parts of the document, or pieces of information, in order. */
export function OrderRenderer(props: RendererProps) {
  const { t } = useI18n();
  if (props.item.type !== 'reading_order') return null;
  return (
    <div className="units reading-order">
      <p className="muted">{t(props.item.mode === 'parts' ? 'reading.orderParts' : 'reading.orderInformation')}</p>
      {props.units.map((unit) => unit.kind === 'order' && <UnitRow key={unit.id} unit={unit} props={props}><OrderControl unit={unit} props={props} /></UnitRow>)}
    </div>
  );
}
