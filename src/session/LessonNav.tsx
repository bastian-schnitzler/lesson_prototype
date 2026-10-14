import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import { reviewColor } from '../artifacts/briefParts.tsx';
import { inExam, lessonOutline, numberedPoints, pointState, type NumberedPoint } from '../domain/session/outline.ts';
import type { LessonPlan, PlanPage } from '../domain/session/plan.ts';
import { lessonResults, type SessionRecord } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';
import type { SessionInput } from './useSession.ts';

/**
 * Lesson navigation (P6-01, SPEC section 5): a sidebar on wide screens; on phones a row of point
 * markers in the session header (PointStrip). While learning it is a vertical timeline of the
 * learning points (design V2); during the exam it lists the exam pages without links; on the results
 * page it selects the part whose answers are shown.
 */

type Dispatch = (action: SessionInput) => void;
type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

/** Exam page kind, as on the exam info page (P2-03). */
export function examPageKind(p: PlanPage): MessageKey {
  const types = new Set(p.units.map((u) => u.itemType));
  if (p.items.some((item) => item.type === 'reading_document')) return 'examIntro.reading';
  if (types.size === 1 && types.has('vocabulary_translation_exam')) return 'examIntro.translation';
  if (types.size === 1 && types.has('vocabulary_listening_dictation')) return 'examIntro.dictation';
  if (types.size === 1 && types.has('function_translation_exam')) return 'examIntro.translation';
  if (types.size === 1 && types.has('function_word_order')) return 'examIntro.replies';
  if (types.size === 1 && types.has('function_dialogue_gap_typing')) return 'examIntro.dialogue';
  return 'examIntro.mixed';
}

export const durationText = (s: number, t: Translate) => (s % 60 ? t('unit.minutesSeconds', { m: Math.floor(s / 60), s: s % 60 }) : t('unit.minutes', { n: s / 60 }));

/**
 * Parts of the final exam shown separately in the results (P2-04 review, P6-01): vocabulary translation
 * and dictation; function word translation, replies and dialogue. A single part when the exam has one kind.
 */
export function examParts(pages: PlanPage[], t: Translate): { key: string; label: string; pages: PlanPage[] }[] | undefined {
  const isDictation = (p: PlanPage) => p.units.length > 0 && p.units.every((u) => u.itemType === 'vocabulary_listening_dictation');
  const isWordTranslation = (p: PlanPage) => p.units.length > 0 && p.units.every((u) => u.itemType === 'function_translation_exam');
  const isExamDialogue = (p: PlanPage) => p.units.length > 0 && p.units.every((u) => u.itemType === 'function_dialogue_gap_typing');
  if (pages.some(isDictation) && pages.some((p) => !isDictation(p))) {
    return [{ key: 'translation', label: t('result.translation'), pages: pages.filter((p) => !isDictation(p)) }, { key: 'dictation', label: t('result.dictation'), pages: pages.filter(isDictation) }];
  }
  if (pages.some(isExamDialogue) && pages.some((p) => !isExamDialogue(p))) {
    return [
      ...(pages.some(isWordTranslation) ? [{ key: 'translation', label: t('result.translation'), pages: pages.filter(isWordTranslation) }] : []),
      { key: 'replies', label: t('result.replies'), pages: pages.filter((p) => !isExamDialogue(p) && !isWordTranslation(p)) },
      { key: 'dialogue', label: t('result.dialogue'), pages: pages.filter(isExamDialogue) },
    ];
  }
  return undefined;
}

const CheckIcon = ({ label }: { label?: string }) => (
  <svg role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
);
const FlagIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14V2.5M4 2.5h8l-2 3 2 3H4" /></svg>
);

/* ------------------------------------------------------------ timeline */

/** Display texts of the outline and its points' states, shared by the sidebar and the phone strip. */
function useOutlineText(plan: LessonPlan, record: SessionRecord) {
  const { t, locale } = useI18n();
  const isHere = (pages: number[]) => record.phase !== 'results' && pages.includes(record.pageIndex);
  const stateText = (point: NumberedPoint) => {
    if (point.kind === 'exam') return t('nav.tasks', { count: point.pages.reduce((n, i) => n + plan.pages[i].units.length, 0) });
    const state = pointState(point, record);
    return state === 'current' ? t('nav.youAreHere') : state === 'done' ? t('nav.done') : t('nav.upcoming');
  };
  return { t, locale, isHere, stateText };
}

/** The circle of a point: its number in its section's colour, filled once done; the exam has a flag. */
const Marker = ({ point }: { point: NumberedPoint }) => <>{point.number ?? <FlagIcon />}</>;

function Timeline({ plan, record }: { plan: LessonPlan; record: SessionRecord }) {
  const { t, locale, isHere, stateText } = useOutlineText(plan, record);
  const points = numberedPoints(lessonOutline(plan));
  const learning = points.filter((p) => p.kind !== 'exam');
  const done = learning.filter((p) => pointState(p, record) === 'done').length;
  return (
    <>
      <p className="nav-kicker">{t('nav.lesson')}</p>
      <p className="nav-title">{t('nav.pointsDone', { done, total: learning.length })}</p>
      <ol className="timeline">
        {points.map((point) => {
          const state = pointState(point, record);
          const here = isHere(point.pages);

          return (
            <li key={point.key} className={`timeline-point is-${state}${here ? ' is-here' : ''}${point.kind === 'exam' ? ' is-exam' : ''}`} style={reviewColor(point.colour)}>
              <span className="timeline-marker" aria-hidden="true"><Marker point={point} /></span>
              <span className="timeline-link" aria-current={here ? 'step' : undefined}>
                <span className="timeline-title">{point.title[locale]}</span>
                <span className="timeline-state">{stateText(point)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/* --------------------------------------------------------- exam pages */

function ExamPages({ plan, record }: { plan: LessonPlan; record: SessionRecord }) {
  const { t, locale } = useI18n();
  const pages = plan.pages.map((p, index) => ({ p, index })).filter(({ p }) => p.role === 'exam');
  const tasks = pages.reduce((n, { p }) => n + p.units.length, 0);
  return (
    <>
      <p className="nav-kicker">{pages[0]?.p.stepLabel[locale] ?? t('session.examPage')}</p>
      <p className="nav-title">{t('nav.examSummary', { pages: pages.length, tasks })}</p>
      <ol className="exam-pages">
        {pages.map(({ p, index }, n) => {
          const state = index < record.pageIndex ? 'done' : index === record.pageIndex ? 'current' : 'upcoming';
          return (
            <li key={p.pageId} className={`exam-page is-${state}`} style={reviewColor(n)} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="exam-page-number">{n + 1}.</span>
              <span className="exam-page-text">
                <span>{t(examPageKind(p))}</span>
                <small>{t('nav.examPage', { tasks: p.units.length, time: durationText(p.timeLimitS ?? 0, t) })}{state === 'current' ? ` · ${t('nav.inProgress')}` : ''}</small>
              </span>
              {state === 'done' && <span className="exam-page-done"><CheckIcon label={t('nav.answered')} /></span>}
            </li>
          );
        })}
      </ol>
      <p className="muted nav-note">{t('examIntro.rules')}</p>
    </>
  );
}

/* ------------------------------------------------------------- results */

/**
 * Result colour of a part (all categories, P4-05 review): green when every answer is fully right, red when
 * none earned a point, red stripes when at least one answer is not fully right. Half credit counts as not right.
 */
export function resultTone(tally: { earned: number; possible: number }): string {
  if (!tally.possible) return '';
  return tally.earned === tally.possible ? ' is-all-right' : tally.earned === 0 ? ' is-all-wrong' : ' is-mixed';
}

function ResultsNav({ plan, record, dispatch }: { plan: LessonPlan; record: SessionRecord; dispatch: Dispatch }) {
  const { t, locale } = useI18n();
  const results = lessonResults(plan, record);
  const select = (selection: string) => dispatch({ type: 'select', selection });
  const examPages = plan.pages.filter((p) => p.role === 'exam' && !(record.skippedNoVoice ?? []).includes(p.pageId));
  const parts = examParts(examPages, t);
  const selectedPart = record.selection === 'exam' ? parts?.[0]?.key : record.selection.startsWith('exam:') ? record.selection.slice(5) : undefined;
  const examSelected = record.selection === 'exam' || record.selection.startsWith('exam:');
  const exerciseSteps = results.steps.filter((s) => s.role !== 'exam' && s.role !== 'presentation' && s.tally.possible > 0 && plan.steps.some((p) => p.stepId === s.stepId));
  const count = (pages: PlanPage[]) => {
    const units = pages.flatMap((p) => p.units).filter((u) => record.locked[u.id]);
    return { correct: units.filter((u) => record.locked[u.id].outcome === 'fully_correct').length, total: units.length };
  };
  return (
    <>
      <p className="nav-kicker">{t('nav.results')}</p>
      <div className="results-nav" role="group" aria-label={t('nav.results')}>
        <button type="button" className={`results-entry is-exam${resultTone(results.exam)}`} aria-pressed={examSelected} onClick={() => select('exam')}>
          <span>{t('session.examPage')}</span>
          <span className="results-entry-score">{results.exam.earned.toLocaleString(locale)} / {results.exam.possible}</span>
        </button>
        {parts && (
          <div className="results-parts">
            {parts.map((part) => (
              <button key={part.key} type="button" className="results-entry results-part" aria-pressed={examSelected && selectedPart === part.key} onClick={() => select(`exam:${part.key}`)}>
                <span>{part.label}</span>
                <span className="results-entry-score">{t('nav.partScore', count(part.pages))}</span>
              </button>
            ))}
          </div>
        )}
        {exerciseSteps.map((s) => (
          <button key={s.stepId} type="button" className={`results-entry${resultTone(s.tally)}`} aria-pressed={record.selection === s.stepId} onClick={() => select(s.stepId)}>
            <span>{plan.steps.find((p) => p.stepId === s.stepId)!.label[locale]}</span>
            <span className="results-entry-score">{s.tally.earned.toLocaleString(locale)} / {s.tally.possible}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- layout */

/** Navigation content for the record's phase. */
function NavContent({ plan, record, dispatch }: { plan: LessonPlan; record: SessionRecord; dispatch: Dispatch }) {
  if (record.phase === 'results') return <ResultsNav plan={plan} record={record} dispatch={dispatch} />;
  if (inExam(plan, record) && plan.pages[record.pageIndex].role === 'exam') return <ExamPages plan={plan} record={record} />;
  return <Timeline plan={plan} record={record} />;
}

/**
 * Phone navigation (P6-01 review): the learning points as a row of numbered round markers in the session
 * header, in place of the progress bar. Done points are filled, the current one is ringed; pressing a
 * marker shows its title in a tooltip. Navigation only shows the way: it never goes back. Esc or a
 * press elsewhere closes the tooltip.
 */
export function PointStrip({ plan, record }: { plan: LessonPlan; record: SessionRecord }) {
  const { t, locale, isHere, stateText } = useOutlineText(plan, record);
  const points = numberedPoints(lessonOutline(plan));
  const [tip, setTip] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const tipId = useId();
  useEffect(() => setTip(null), [record.pageIndex]);
  useEffect(() => {
    if (tip === null) return;
    const away = (e: PointerEvent) => { if (!strip.current?.contains(e.target as Node)) setTip(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setTip(null); };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc); };
  }, [tip]);
  const done = points.filter((p) => pointState(p, record) === 'done').length;
  const fill = points.length > 1 ? Math.min(done, points.length - 1) / (points.length - 1) : 0;
  const shown = tip === null ? undefined : points[tip];
  return (
    <div ref={strip} className="point-strip">
      <ol className="point-strip-list" aria-label={t('nav.open')} style={{ '--strip-fill': `${fill * 100}%` } as CSSProperties}>
        {points.map((point, n) => {
          const here = isHere(point.pages);
          return (
            <li key={point.key} className={`strip-point is-${pointState(point, record)}${here ? ' is-here' : ''}${point.kind === 'exam' ? ' is-exam' : ''}`} style={reviewColor(point.colour)}>
              <button type="button" className="strip-marker" aria-label={`${point.number ? `${point.number}. ` : ''}${point.title[locale]}: ${stateText(point)}`}
                aria-current={here ? 'step' : undefined} aria-expanded={tip === n} aria-controls={tip === n ? tipId : undefined} onClick={() => setTip(tip === n ? null : n)}>
                <Marker point={point} />
              </button>
            </li>
          );
        })}
      </ol>
      {shown && (
        <div id={tipId} role="status" className="strip-tip" style={reviewColor(shown.colour)}>
          <strong>{shown.number ? `${shown.number}. ` : ''}{shown.title[locale]}</strong>
          <span className="muted">{stateText(shown)}</span>
        </div>
      )}
    </div>
  );
}

/**
 * The page layout with lesson navigation: on wide screens a sidebar left of the content. On phones the
 * learning points move into the session header as a row of markers (PointStrip); the results page shows
 * its result parts above the answers.
 */
export function NavLayout({ plan, record, dispatch, children }: { plan: LessonPlan; record: SessionRecord; dispatch: Dispatch; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className={`nav-layout${record.phase === 'results' ? ' is-results' : ''}`}>
      <aside className="lesson-nav" aria-label={t('nav.open')}>
        <NavContent plan={plan} record={record} dispatch={dispatch} />
      </aside>
      <div className="nav-main">{children}</div>
    </div>
  );
}
