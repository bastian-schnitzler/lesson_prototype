import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../app/context.tsx';
import { ReadingDocument } from '../components/ReadingDocument.tsx';
import type { LessonPlan, PlanPage, PlanUnit } from '../domain/session/plan.ts';
import { ChoiceControl, Countdown, UnitRow, type RendererProps } from './controls.tsx';

/**
 * Reading renderers (SPEC section 9). Only the document view and the skim phase are reading's own; the
 * flashcards and the key-word matching are the vocabulary ones, the ordering task is the word-order
 * control, and the questions use the shared choice control.
 */

/** Key under which a skimmed document is recorded in the session's `revealed`, like a turned flashcard. */
export const SKIMMED = 'skimmed';

/** `${pageId}/${itemId}` of the page's skim-view document, if it has one. */
function skimKey(page: Pick<PlanPage, 'pageId' | 'items'>): string | undefined {
  const doc = page.items.find((it) => it.type === 'reading_document' && it.view === 'skim');
  return doc ? `${page.pageId}/${doc.itemId}` : undefined;
}

/** A skim page whose time is up or whose reader has finished: the document is put away, the question opens. */
export function isSkimmed(page: Pick<PlanPage, 'pageId' | 'items'>, revealed: Record<string, string[]>): boolean {
  const key = skimKey(page);
  return !!key && (revealed[key] ?? []).includes(SKIMMED);
}

const pageOf = (plan: LessonPlan, pageId: string) => plan.pages.find((p) => p.pageId === pageId)!;

/**
 * The document of a page. In the skim view a countdown runs ("Time to skim"); when it ends, or when the
 * learner presses "I've finished reading", the document is put away (no blur) until the question is
 * checked, then it comes back with the correction. The countdown has no saved deadline: a reload before
 * the time is up restarts it, while a document already put away stays away (section 9).
 */
export function DocumentRenderer({ item, plan, mode, pageId, revealed, onReveal }: RendererProps) {
  const { t } = useI18n();
  const skim = item.type === 'reading_document' && item.view === 'skim';
  const skimmed = skim && isSkimmed(pageOf(plan, pageId), revealed);
  const itemKey = `${pageId}/${item.itemId}`;
  const seconds = item.type === 'reading_document' ? item.skimSeconds ?? 0 : 0;
  const [deadline] = useState(() => Date.now() + seconds * 1000);
  const [now, setNow] = useState(() => Date.now());
  const reveal = useRef(onReveal);
  reveal.current = onReveal;
  useEffect(() => {
    if (!skim || skimmed) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= deadline) reveal.current(itemKey, SKIMMED);
    }, 250);
    return () => clearInterval(timer);
  }, [skim, skimmed, deadline, itemKey]);
  if (item.type !== 'reading_document') return null;
  const doc = plan.reading?.documents.get(item.documentId);
  if (!doc || (skimmed && mode === 'answering')) return null;
  return (
    <div className={`reading-doc-slot${item.view === 'skim' ? '' : ' is-side'}`}>
      {skim && !skimmed && (
        <div className="reading-skim-bar">
          <Countdown remainingMs={Math.max(0, deadline - now)} limitS={seconds} label={t('reading.skimLabel')} />
          <button type="button" className="button button-outline" onClick={() => onReveal(itemKey, SKIMMED)}>{t('reading.skimDone')}</button>
        </div>
      )}
      <ReadingDocument doc={doc} lang={plan.lang} label={t(item.documentId === 'main' ? 'reading.document' : 'reading.examDocument')} highlight={item.view !== 'exam'} />
    </div>
  );
}

/** One question on the document: a choice or a true / false statement (Vrai / Faux keep their order). */
function QuestionRow({ unit, props, number }: { unit: PlanUnit; props: RendererProps; number?: number }) {
  const statement = unit.itemType === 'reading_true_false';
  const question = unit.prompt.learning ?? '';
  return (
    <UnitRow unit={unit} props={props}>
      <div className="field reading-question">
        <span lang={props.plan.lang}>{number !== undefined && <span className="reading-number">{number}.</span>}{question}</span>
        {unit.kind === 'choice' && <ChoiceControl unit={unit} props={props} label={question} layout="radio" ordered={statement} />}
      </div>
    </UnitRow>
  );
}

/** Skim, detail and exam questions; the skim question opens only once the document is put away. */
export function QuestionRenderer(props: RendererProps) {
  const { t } = useI18n();
  const page = pageOf(props.plan, props.pageId);
  if (props.item.type === 'reading_skim_choice' && props.mode === 'answering' && !isSkimmed(page, props.revealed)) {
    return <p className="muted reading-locked">{t('reading.skimLocked')}</p>;
  }
  // Exam questions are numbered like the exam task cards (P6-02, feedback #26).
  const number = props.mode === 'exam' ? page.units.findIndex((u) => u.itemId === props.item.itemId) + 1 : undefined;
  return <div className="units reading-questions">{props.units.map((unit) => <QuestionRow key={unit.id} unit={unit} props={props} number={number} />)}</div>;
}
