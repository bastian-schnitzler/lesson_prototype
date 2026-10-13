import { Fragment, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { useI18n, useLastTry, usePreferences } from '../app/context.tsx';
import { formatScore, roundHalfUp1 } from '../domain/format.ts';
import type { LessonPlan, PlanPage, PlanUnit } from '../domain/session/plan.ts';
import { canNavigate, viewedIndex, isAnswered, isListeningPage, presentationComplete, scoreUnit, skipsFeedbackWhenCorrect, lessonResults, progress, type LockedUnit, type SessionRecord } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';
import type { Locale } from '../schemas/common.ts';
import { rendererRegistry, UnitFeedback } from './renderers.tsx';
import { answerText, SpotSummary } from './controls.tsx';
import { MATCH_SLIDE_MS } from './vocabularyRenderers.tsx';
import { missingArticle } from '../domain/articleHint.ts';
import type { SessionInput } from './useSession.ts';
import { reviewColor } from '../artifacts/briefParts.tsx';
import { useVoiceStatus, type VoiceStatus } from './speech.ts';
import { VoiceHelp } from './VoiceHelp.tsx';
import { examKindKey } from '../domain/session/outline.ts';
import { LessonSidebar, ResultsSidebar, type ResultsEntry } from './Sidebar.tsx';
import { NewVerbs } from './grammarRenderers.tsx';

/* ------------------------------------------------------------ start page */

/**
 * The grammar lesson flow for the start page (P3-02 review): one part per teaching block (named by its
 * first step and listing its exercises; every block starts with an explanation, so it is not listed),
 * then the exam. The feedback screen is not listed.
 */
export function grammarFlow(plan: LessonPlan) {
  const parts: { key: string; label: PlanPage['stepLabel']; role: PlanPage['role']; types: string[]; seconds: number; pages: number; units: number }[] = [];
  for (const page of plan.pages) {
    if (page.special || page.items.some((item) => item.type === 'production_feedback_placeholder')) continue;
    const last = parts.at(-1);
    const key = page.blockId ?? page.stepId;
    const target = last?.key === key ? last : (parts.push({ key, label: page.stepLabel, role: page.role, types: [], seconds: 0, pages: 0, units: 0 }), parts.at(-1)!);
    if (page.role === 'exam') target.role = 'exam';
    for (const item of page.items) if (!target.types.includes(item.type)) target.types.push(item.type);
    target.seconds += page.estimatedDurationS;
    target.pages += 1;
    target.units += page.units.length;
  }
  return parts;
}

interface StartViewProps {
  plan: LessonPlan;
  level: string;
  resumable?: SessionRecord;
  /** Why a saved attempt cannot resume (changed content). */
  notice?: string;
  onStart: () => void;
  onResume: () => void;
}

export function StartView({ plan, level, resumable, notice, onStart, onResume }: StartViewProps) {
  const { t, locale, languageName } = useI18n();
  const { motherTongue } = usePreferences();
  // Lessons with listening tasks cannot start (or resume) without a learning-language voice (P2-04 review).
  const voiceStatus = useVoiceStatus(plan.lang);
  const needsVoice = plan.pages.some(isListeningPage);
  return (
    <section className="task-card start-card" aria-labelledby="start-title">
      <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level })}</p>
      <span className="kind-badge">{t(`kind.${plan.kind}`)}</span>
      <h1 id="start-title" lang={plan.lang}>{plan.title}</h1>
      <p className="lead">{plan.objective[locale]}</p>
      <p className="muted">
        {t('session.minutes', { minutes: plan.estimatedMinutes })}
        {plan.targets.size > 0 && <> · {t('session.vocabularyCount', { count: plan.targets.size })}</>}
      </p>
      {plan.groups.length > 0 && (
        <>
          <h2 className="small-heading">{t('session.groups')}</h2>
          <ol className="group-list">
            {plan.groups.map((g, n) => (
              <li key={g.id} style={reviewColor(n)}>
                <span>{g.label[locale]}</span>
                <small>{t('session.vocabularyCount', { count: g.targetIds.length })}</small>
              </li>
            ))}
          </ol>
        </>
      )}
      {plan.kind === 'grammar' && <NewVerbs plan={plan} motherTongue={motherTongue} />}
      {plan.kind === 'grammar' && (
        <>
          <h2 className="small-heading">{t('session.lessonFlow')}</h2>
          <ol className="group-list flow-list">
            {grammarFlow(plan).map((part, n) => (
              <li key={n} style={reviewColor(n)}>
                <span>
                  {part.label[locale]}
                  <small className="flow-detail">
                    {part.role === 'exam'
                      ? t('activity.exam', { count: part.units, pages: part.pages })
                      : part.types.filter((type) => type !== 'grammar_explanation').map((type) => t(`exercise.${type}` as MessageKey)).join(' · ')}
                  </small>
                </span>
                <small>{t('session.flowMinutes', { minutes: Math.max(1, Math.round(part.seconds / 60)) })}</small>
              </li>
            ))}
          </ol>
        </>
      )}
      {notice && <p className="note" role="note">{notice}</p>}
      {needsVoice && voiceStatus === 'checking' ? (
        <p className="muted" role="status">{t('session.voiceChecking')}</p>
      ) : needsVoice && voiceStatus === 'unavailable' ? (
        <div className="voice-help voice-required" role="alert">
          <h2 className="small-heading">{t('session.voiceHelpTitle')}</h2>
          <p>{t('session.voiceRequired')}</p>
          <VoiceHelp />
        </div>
      ) : resumable ? (
        <div className="start-actions">
          <button type="button" className="button button-primary" onClick={onResume}>{t('session.resume')}</button>
          <button type="button" className="button button-outline" onClick={onStart}>{t('session.restart')}</button>
        </div>
      ) : (
        <button type="button" className="button button-primary button-wide" onClick={onStart}>{t('session.continue')}</button>
      )}
    </section>
  );
}

/* ---------------------------------------------------------- session host */

export function SessionHeader({ plan, record }: { plan: LessonPlan; record: SessionRecord }) {
  const { t, locale } = useI18n();
  const pct = progress(plan, record);
  // The running lesson shows progress only; scores appear on the results page (D53, P6 review).
  return (
    <div className="session-header">
      <p className="session-title" lang={plan.lang}>{plan.title}</p>
      <div className="session-meters">
        <div className="progress" role="progressbar" aria-label={t('session.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="muted">{formatScore(pct, locale).replace(/[.,]0%$/, '%')}</span>
      </div>
    </div>
  );
}

function Countdown({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const { t } = useI18n();
  const total = Math.ceil(remainingMs / 1000);
  const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  return (
    <div className="timer-box">
      <span className="timer-label" aria-hidden="true">{t('session.timeLeftLabel')}</span>
      <p className={`countdown${total <= 10 ? ' countdown-low' : ''}`} role="timer" aria-label={t('session.timeLeft', { time: text })}>{text}</p>
      {totalMs > 0 && <span className="timer-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (100 * remainingMs) / totalMs)}%` }} /></span>}
    </div>
  );
}

interface SessionViewProps {
  plan: LessonPlan;
  record: SessionRecord;
  dispatch: (action: SessionInput) => void;
  remainingMs?: number;
  voiceStatus?: VoiceStatus;
}

export function SessionView({ plan, record, dispatch, remainingMs, voiceStatus = 'available' }: SessionViewProps) {
  const { t, locale } = useI18n();
  const shown = viewedIndex(record);
  const revisiting = shown !== record.pageIndex;
  const page = plan.pages[shown];
  const listening = isListeningPage(page);
  const needsVoice = listening && record.phase === 'answering' && !revisiting;
  useEffect(() => {
    if (needsVoice && page.role === 'exam' && voiceStatus === 'available') dispatch({ type: 'voice_ready' });
  }, [needsVoice, page.pageId, page.role, voiceStatus, dispatch]);
  const mode = page.role === 'exam' ? 'exam' : record.phase === 'feedback' ? 'feedback' : 'answering';
  const ready = revisiting || (page.role === 'presentation' ? presentationComplete(page, record) : page.role !== 'practice' || record.phase === 'feedback' || page.units.every((u) => isAnswered(u, record.drafts[u.id])));
  const heading = useRef<HTMLHeadingElement>(null);
  // Typing pages put the cursor straight into the first answer field; other pages focus the heading.
  useEffect(() => {
    const field = document.querySelector<HTMLInputElement>('.task-card input.text-input:not([readonly]):not([disabled])');
    (field ?? heading.current)?.focus();
  }, [shown]);
  // A fully correct single-answer page plays a short success animation, then skips its feedback (P2-02, P2-04).
  const [celebrating, setCelebrating] = useState(false);
  // Exam units missing their article get an info box after Continue; the next Continue submits anyway.
  const [articleWarnings, setArticleWarnings] = useState<string[]>([]);
  useEffect(() => setArticleWarnings([]), [record.pageIndex]);
  // Single-answer practice pages mark the answer in place (red/green) instead of a feedback card (P2-04 review).
  const inline = page.role === 'practice' && skipsFeedbackWhenCorrect(page);
  const almost = inline && record.phase === 'feedback' ? page.units.filter((u) => u.kind !== 'spot' && record.locked[u.id]?.outcome === 'orthography_only') : [];
  const onContinue = () => {
    if (page.role === 'exam') {
      // Translation only: a dictation has no article hint (P2-04 review).
      const missing = page.units.filter((u) => u.itemType === 'vocabulary_translation_exam'
        && missingArticle((record.drafts[u.id] as string | undefined) ?? '', u.answer, plan.lang)).map((u) => u.id);
      if (missing.length && !articleWarnings.length) return setArticleWarnings(missing);
      setArticleWarnings([]);
    }
    const perfect = record.phase === 'answering' && skipsFeedbackWhenCorrect(page)
      && page.units.every((u) => scoreUnit(u, record.drafts[u.id]).outcome === 'fully_correct');
    if (!perfect) return dispatch({ type: 'continue' });
    setCelebrating(true);
    // Matching first slides every word level with its meaning, then flashes (0.9 s) like other pages.
    const pause = page.items.some((it) => it.type === 'vocabulary_matching' || it.type === 'grammar_person_matching') ? MATCH_SLIDE_MS + 1000 : 900;
    window.setTimeout(() => { setCelebrating(false); dispatch({ type: 'continue' }); }, pause);
  };

  // Theory pages are points to learn: "Theory · point 3 of 8", with a Previous button to the point before (P6-01 review).
  const theory = plan.pages.filter((p) => p.role === 'presentation' && p.special !== 'examIntro' && !(record.skippedNoVoice ?? []).includes(p.pageId));
  const point = theory.findIndex((p) => p.index === shown);
  const eyebrow = point >= 0 ? `${t('sidebar.theory')} · ${t('sidebar.pointOf', { n: point + 1, total: theory.length })}` : undefined;
  // A theory page is titled by its point (the word group or the grammar block); the instruction becomes the lead line below it.
  const firstItem = page.items[0];
  const wordGroup = firstItem && 'targetIds' in firstItem && plan.groups.length > 1 ? plan.groups.find((g) => firstItem.targetIds.every((id) => g.targetIds.includes(id))) : undefined;
  const pointTitle = point >= 0 ? (wordGroup ?? { label: page.stepLabel }).label[locale] : undefined;
  const previous = point > 0 ? theory[point - 1].index : undefined;
  // Enter in a typed answer acts like the primary button once it is enabled (P6-03); never while composing text or on other controls.
  const onEnter = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.shiftKey || e.repeat || !(target instanceof HTMLInputElement) || target.type !== 'text' || target.readOnly) return;
    e.preventDefault();
    // With several fields Enter moves on to the next one and only the last field submits the page (P6-03 review).
    const fields = [...e.currentTarget.querySelectorAll<HTMLInputElement>('input.text-input:not([readonly]):not([disabled])')];
    const at = fields.indexOf(target);
    if (at >= 0 && at < fields.length - 1) fields[at + 1].focus();
    else if (ready && !celebrating) onContinue();
  };

  return (
    <>
      <SessionHeader plan={plan} record={record} />
      <div className="session-layout">
      <LessonSidebar plan={plan} record={record} onNavigate={(pageIndex) => dispatch({ type: 'navigate', pageIndex })} />
      <div className="session-main">
      {needsVoice && voiceStatus === 'checking' ? (
        <section className="task-card" role="status"><p>{t('session.voiceChecking')}</p></section>
      ) : needsVoice && voiceStatus === 'unavailable' ? (
        <section className="task-card voice-help" aria-labelledby="voice-help-title">
          <h1 id="voice-help-title">{t('session.voiceHelpTitle')}</h1>
          <p>{t('session.voiceHelpIntro')}</p>
          <VoiceHelp />
          <p>{t('session.voiceSkipHint')}</p>
          <button type="button" className="button button-primary" onClick={() => dispatch({ type: 'skip_no_voice' })}>{t('session.voiceSkip')}</button>
        </section>
      ) : (
      <section className={`task-card${celebrating ? ' is-celebrating' : ''}`} aria-labelledby="task-heading" onKeyDown={onEnter}>
        {celebrating && <span className="visually-hidden" role="status">{t('session.allCorrect')}</span>}
        <div className="task-eyebrow">
          <p className={`label-muted${pointTitle === page.stepLabel[locale] ? ' visually-hidden' : ''}`}>{`${page.stepLabel[locale]}${page.role === 'exam' && page.stepLabel[locale] !== t('session.examPage') ? ` · ${t('session.examPage')}` : ''}`}</p>
          {eyebrow && <span className="point-badge">{eyebrow}</span>}
        </div>
        <div className="task-title-row">
        <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">{page.special === 'examIntro' ? t('examIntro.title') : pointTitle ?? instructionsFor(page, locale, t)}</h1>
        {page.role === 'exam' && remainingMs !== undefined && <Countdown remainingMs={remainingMs} totalMs={(page.timeLimitS ?? 0) * 1000} />}
        </div>
        {pointTitle && <p className="lead">{instructionsFor(page, locale, t)}</p>}
        {page.special === 'examIntro' && <ExamIntro plan={plan} page={page} />}
        {page.items.map((item) => {
          const Renderer = rendererRegistry[item.type];
          return (
            <Renderer
              key={item.itemId}
              item={item}
              units={page.units.filter((u) => u.itemId === item.itemId)}
              plan={plan}
              mode={mode}
              drafts={record.drafts}
              locked={record.locked}
              onChange={(unitId, response) => dispatch({ type: 'draft', unitId, response })}
              seed={record.seed}
              motherTongue={record.motherTongue}
              pageId={page.pageId}
              revealed={record.revealed ?? {}}
              onReveal={(itemKey, key) => dispatch({ type: 'reveal', itemKey, key })}
              celebrating={celebrating}
              articleWarnings={articleWarnings}
              inlineFeedback={inline}
            />
          );
        })}
        <div className="task-footer">
          {page.role === 'presentation' && !ready && <p className="muted">{t('session.revealAll')}</p>}
          {page.role === 'exam' && page.units.length > 0 && (
            <p className="muted exam-answered" role="status">{t('session.answered', { n: page.units.filter((u) => isAnswered(u, record.drafts[u.id])).length, total: page.units.length })}</p>
          )}
          {previous !== undefined && canNavigate(plan, record, previous) && (
            <button type="button" className="button button-outline" onClick={() => dispatch({ type: 'navigate', pageIndex: previous })}>{t('sidebar.previous')}</button>
          )}
          <span className="continue-wrap">
            <button type="button" className="button button-primary" disabled={!ready} aria-disabled={celebrating || undefined} onClick={() => !celebrating && onContinue()}>
              {/* Practice pages are checked first ("Check"); afterwards the same button continues. */}
              {t(page.role === 'practice' && record.phase === 'answering' ? 'session.check' : 'session.continue')}
            </button>
          </span>
          {/* Only a half-point answer explains itself, below the button so the button never moves. */}
          {almost.map((u) => (
            <div key={u.id} className="feedback outcome-orthography_only footer-note" role="status">
              <p className="feedback-title"><span aria-hidden="true">!</span> {t('feedback.almost')}</p>
              <p className="explanation">{u.explanation[locale]}</p>
            </div>
          ))}
        </div>
      </section>
      )}
      </div>
      </div>
    </>
  );
}

/** Typed-gap pages use the application's own instruction (P2-03); other pages show their content instruction. */
function instructionsFor(page: PlanPage, locale: Locale, t: (key: MessageKey) => string) {
  return page.items.length > 0 && page.items.every((it) => it.type === 'vocabulary_typed_gap') ? t('session.typedGapInstruction') : page.instructions[locale];
}

/**
 * Info page before the final exam (P2-03): which exercises follow, the countdown of each exam page
 * and how many words or tasks are tested. Built from the exam pages of the plan.
 */
function ExamIntro({ plan, page }: { plan: LessonPlan; page: PlanPage }) {
  const { t } = useI18n();
  const examPages = plan.pages.filter((p) => p.role === 'exam' && p.stepId === page.stepId);
  const words = new Set(examPages.flatMap((p) => p.items.flatMap((it) => ('targetId' in it ? [it.targetId] : []))));
  const totalS = examPages.reduce((n, p) => n + (p.timeLimitS ?? 0), 0);
  const time = (s: number) => (s % 60 ? t('unit.minutesSeconds', { m: Math.floor(s / 60), s: s % 60 }) : t('unit.minutes', { n: s / 60 }));
  // Two categories at most (translation, dictation): pages of one kind are one row, not one row per page.
  const kinds = examPages.reduce<{ key: MessageKey; pages: PlanPage[] }[]>((list, p) => {
    const key = examKindKey(p);
    const row = list.find((r) => r.key === key);
    if (row) row.pages.push(p); else list.push({ key, pages: [p] });
    return list;
  }, []);
  return (
    <div className="exam-intro">
      <p className="lead">{plan.targets.size > 0 ? t('examIntro.words', { count: words.size }) : t('examIntro.tasks', { tasks: 0 })}</p>
      <table className="exam-table">
        <thead><tr><th scope="col">{t('examIntro.colPart')}</th><th scope="col">{t('examIntro.colTime')}</th></tr></thead>
        <tbody>
          {kinds.map((k) => (
            <tr key={k.key}>
              <th scope="row">{t(k.key)}{k.pages.length > 1 && <small>{t('sidebar.pages', { count: k.pages.length })}</small>}</th>
              <td>{time(k.pages.reduce((n, p) => n + (p.timeLimitS ?? 0), 0))}</td>
            </tr>
          ))}
        </tbody>
        {kinds.length > 1 && <tfoot><tr><th scope="row">{t('examIntro.total')}</th><td>{time(totalS)}</td></tr></tfoot>}
      </table>
      <p className="muted">{t('examIntro.rules')}</p>
    </div>
  );
}

/* ------------------------------------------------------------- results */

/**
 * One reviewed answer (results page, R5 style): ✓/!/✕, the task → correct answer in green; for a
 * mistake the learner's answer struck through directly below the correct answer, an "almost" or
 * timeout note and the explanation.
 */
/** The task line of a result row, split at its arrows (un stylo → des ____) into aligned columns. */
export function promptParts(unit: PlanUnit, t: (key: MessageKey) => string): string[] {
  // Only listening units fall back to "Write what you hear"; word order has no task text, only the sentence.
  const prompt = [unit.prompt.native, unit.prompt.learning, unit.prompt.before !== undefined ? `${unit.prompt.before ?? ''} ____${/^[,.]/.test(unit.prompt.after ?? '') ? '' : ' '}${unit.prompt.after ?? ''}`.trim() : undefined].find(Boolean) ?? (unit.speak ? t('session.typeWhatYouHear') : undefined);
  if (!prompt) return [];
  if (unit.itemType === 'vocabulary_gender_select') return [`${prompt}:`];
  return prompt.split(/\s*→\s*/).map((part) => part.trim());
}

/**
 * The prompt columns of one result row (P3-02 review): every part is followed by an arrow, and a row
 * with fewer parts than the longest row lets its first part span the missing columns, so all arrows
 * and answers line up in columns across the list.
 */
function PromptCells({ parts, columns, lang, arrows = true }: { parts: string[]; columns: number; lang?: string; arrows?: boolean }) {
  return parts.map((part, n) => (
    <Fragment key={n}>
      <span className="result-prompt" lang={lang} style={n === 0 ? ({ '--span': 2 * (columns - parts.length) + 1 } as CSSProperties) : undefined}>{part}</span>
      <span className="match-arrow" aria-hidden="true">{arrows ? '→' : ''}</span>
    </Fragment>
  ));
}

function ResultItem({ unit, locked, lang, columns }: { unit: PlanUnit; locked: LockedUnit; lang: string; columns: number }) {
  const { t, locale } = useI18n();
  const parts = promptParts(unit, t);
  const given = answerText(unit, locked.response, t);
  const correct = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  const ok = locked.outcome === 'fully_correct';
  // Gender rows (P2-04 review): "word: chosen gender", and for a mistake the struck gender → the correct one.
  if (unit.itemType === 'vocabulary_gender_select') {
    return (
      <li className={`result-item outcome-${locked.outcome}`}>
        <span className="result-icon" aria-label={t(OUTCOME_LABEL[locked.outcome])}>{ok ? '✓' : '✕'}</span>
        <div className="result-body">
          <div className="result-fix result-gender">
            <PromptCells parts={parts} columns={columns} lang={lang} arrows={false} />
            <span className="result-answer">
              {ok ? (
                <strong className="match-right"><span className="visually-hidden">{t('result.yourAnswer')}: </span>{given}</strong>
              ) : (
                <span>
                  <s className="match-wrong"><span className="visually-hidden">{t('result.yourAnswer')}: </span>{given || t('result.noAnswer')}</s>
                  <span className="match-arrow" aria-hidden="true"> → </span>
                  <strong className="match-right"><span className="visually-hidden">{t('result.correctAnswer')}: </span>{correct}</strong>
                </span>
              )}
            </span>
          </div>
          {!ok && <p className="muted">{unit.explanation[locale]}</p>}
        </div>
      </li>
    );
  }
  return (
    <li className={`result-item outcome-${locked.outcome}`}>
      <span className="result-icon" aria-label={t(OUTCOME_LABEL[locked.outcome])}>{ok ? '✓' : locked.outcome === 'orthography_only' ? '!' : '✕'}</span>
      <div className="result-body">
        <div className="result-fix">
          <PromptCells parts={parts} columns={columns} lang={unit.prompt.native ? undefined : lang} />
          <span className="result-answer">
            <strong className="match-right">
              <span className="visually-hidden">{t('result.correctAnswer')}: </span><span lang={unit.answerLang === 'learning' ? lang : undefined}>{correct}</span>
              {unit.form && <span lang={lang}> · {unit.form}</span>}
            </strong>
            {!ok && <span className="match-wrong"><span className="visually-hidden">{t('result.yourAnswer')}: </span><s lang={lang}>{given || t('result.noAnswer')}</s></span>}
          </span>
        </div>
        {(locked.outcome === 'orthography_only' || locked.timedOut) && (
          <p className="result-notes">
            {locked.outcome === 'orthography_only' && <span className="result-note result-note-almost">{t('feedback.almost')}</span>}
            {locked.timedOut && <span className="result-note">{t('result.timedOut')}</span>}
          </p>
        )}
        {!ok && <SpotSummary unit={unit} response={locked.response} lang={lang} />}
        {!ok && <p className="muted">{unit.explanation[locale]}</p>}
      </div>
    </li>
  );
}

const OUTCOME_LABEL = { fully_correct: 'feedback.correct', orthography_only: 'outcome.orthography_only', incorrect: 'outcome.incorrect', unanswered: 'outcome.unanswered' } as const;

/** Vocabulary target of a unit (row units carry it as the last ID segment), for grouping results. */
function unitTarget(page: PlanPage, unit: PlanUnit): string | undefined {
  const item = page.items.find((it) => it.itemId === unit.itemId);
  if (item && 'targetId' in item) return item.targetId;
  const rest = unit.id.slice(`${page.pageId}/${unit.itemId}/`.length);
  return unit.id.startsWith(`${page.pageId}/${unit.itemId}/`) ? rest : undefined;
}

/**
 * Splits units into sections, each shown once in its own frame: by vocabulary group (across all
 * pages of the part, so a group's name is never repeated), otherwise by consecutive page
 * ("Part n") when a page holds several answers; consecutive single-answer pages share one section.
 */
function resultSections(plan: LessonPlan, pages: PlanPage[]) {
  const groupOf = new Map(plan.groups.flatMap((g) => g.targetIds.map((id) => [id, g] as const)));
  const sections: { key: string; groupId?: string; part: number; units: PlanUnit[] }[] = [];
  pages.forEach((page, n) => {
    for (const unit of page.units) {
      const target = unitTarget(page, unit);
      const group = target ? groupOf.get(target) : undefined;
      const key = group ? `group|${group.id}` : page.units.length > 1 ? `page|${page.pageId}` : 'single';
      // One section per group across the whole part (typed gaps and listening of a group share a frame).
      const existing = group ? sections.find((sec) => sec.key === key) : sections.at(-1)?.key === key ? sections.at(-1) : undefined;
      if (existing) existing.units.push(unit);
      else sections.push({ key, groupId: group?.id, part: n + 1, units: [unit] });
    }
  });
  return sections;
}

export function ResultsView({ plan, record, dispatch }: { plan: LessonPlan; record: SessionRecord; dispatch: (action: SessionInput) => void }) {
  const { t, locale, languageName } = useI18n();
  const results = lessonResults(plan, record);
  const { recordCompletion } = useLastTry();
  const recorded = useRef(false);
  useEffect(() => {
    // The in-memory last-try map receives the weighted total once per completed attempt.
    if (recorded.current) return;
    recorded.current = true;
    recordCompletion(plan.lessonId, results.total);
  }, [plan.lessonId, recordCompletion, results.total]);

  const pts = (n: number) => n.toLocaleString(locale);
  const isDictation = (p: PlanPage) => p.units.length > 0 && p.units.every((u) => u.itemType === 'vocabulary_listening_dictation');
  const examPart = record.selection === 'exam:dictation' ? 'dictation' : record.selection === 'exam:translation' ? 'translation' : undefined;
  const selectedStep = record.selection.startsWith('exam') ? undefined : plan.steps.find((s) => s.stepId === record.selection);
  const pages = plan.pages.filter((p) => !(record.skippedNoVoice ?? []).includes(p.pageId) && (selectedStep ? p.stepId === selectedStep.stepId : p.role === 'exam' && (!examPart || isDictation(p) === (examPart === 'dictation'))));
  const units = pages.flatMap((p) => p.units);
  // The card shows the selected part first: its name as heading and its score, then the lesson total.
  const tallyOf = (list: PlanPage[]) => ({ earned: list.flatMap((p) => p.units).reduce((n, u) => n + (record.locked[u.id]?.points ?? 0), 0), possible: list.reduce((n, p) => n + p.units.length, 0) });
  const selectedTally = selectedStep ? results.steps.find((s) => s.stepId === selectedStep.stepId)?.tally : examPart ? tallyOf(pages) : results.exam;
  const sectionScore = selectedStep?.role === 'presentation' || !selectedTally?.possible
    ? t('result.completedShort')
    : `${pts(selectedTally.earned)} / ${selectedTally.possible}`;
  // Only scored parts can be reviewed; presentation stages (introduction, flashcards) are left out.
  const exerciseSteps = results.steps.filter((s) => s.role !== 'exam' && s.role !== 'presentation' && s.tally.possible > 0 && plan.steps.some((p) => p.stepId === s.stepId));

  // The final exam comes first (split into its parts when it has translation and dictation), then the exercises in presentation order.
  const examPages = plan.pages.filter((p) => p.role === 'exam' && !(record.skippedNoVoice ?? []).includes(p.pageId));
  const score = (tally: { earned: number; possible: number }) => `${pts(tally.earned)} / ${tally.possible}`;
  const split = examPages.some(isDictation) && examPages.some((p) => !isDictation(p));
  const entries: ResultsEntry[] = [
    { key: 'exam', label: t('session.examPage'), score: score(results.exam) },
    ...(split ? [
      { key: 'exam:translation', label: t('result.translation'), score: score(tallyOf(examPages.filter((p) => !isDictation(p)))), nested: true },
      { key: 'exam:dictation', label: t('result.dictation'), score: score(tallyOf(examPages.filter(isDictation))), nested: true },
    ] : []),
    ...exerciseSteps.map((s) => ({ key: s.stepId, label: plan.steps.find((p) => p.stepId === s.stepId)!.label[locale], score: score(s.tally) })),
  ];

  return (
    <section aria-labelledby="results-title">
      <div className="summary-card">
        <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level: record.level })}</p>
        <h1 id="results-title">{selectedStep ? selectedStep.label[locale] : t('session.examPage')}</h1>
        <p className="total-score">{sectionScore}</p>
        <p className="results-lesson" lang={plan.lang}>{plan.title}</p>
        <p className="results-total">{t('result.lessonTotal', { score: roundHalfUp1(results.total).toLocaleString(locale) })}</p>
      </div>
      <div className="session-layout">
      <ResultsSidebar entries={entries} selected={record.selection} onSelect={(selection) => dispatch({ type: 'select', selection })} />
      <div className="session-main">
      {/* No sub-heading and no "x of y correct" line: the card and the sidebar already name the part and give its score (P6 review). */}
      {units.some((u) => record.locked[u.id]) ? (() => {
        const renderSections = (subset: PlanPage[]) => {
          const sections = resultSections(plan, subset).map((sec) => ({ ...sec, units: sec.units.filter((u) => record.locked[u.id]) })).filter((sec) => sec.units.length);
          const title = (sec: (typeof sections)[number]) => plan.groups.find((g) => g.id === sec.groupId)?.label[locale] ?? t('result.part', { n: sec.part });
          return sections.map((sec) => (
            <section key={sec.key} className={`result-section${sections.length > 1 ? ' is-framed' : ''}`} style={sec.groupId ? reviewColor(plan.groups.findIndex((g) => g.id === sec.groupId)) : undefined}>
              {sections.length > 1 && (sec.groupId || sec.key !== 'single') && <h3 className="result-section-title">{title(sec)}</h3>}
              {(() => {
                const columns = Math.max(...sec.units.map((u) => promptParts(u, t).length));
                return (
                  <ul className={`result-list${columns ? '' : ' no-prompt'}`} style={{ '--parts': Math.max(1, columns) } as CSSProperties}>
                    {sec.units.map((u) => <ResultItem key={u.id} unit={u} locked={record.locked[u.id]} lang={plan.lang} columns={columns} />)}
                  </ul>
                );
              })()}
            </section>
          ));
        };
        // The vocabulary exam is reviewed in two accordions: translation (open) and dictation (P2-04 review).
        const parts = !selectedStep && !examPart && pages.some(isDictation) && pages.some((p) => !isDictation(p))
          ? [{ key: 'translation', label: t('result.translation'), pages: pages.filter((p) => !isDictation(p)) }, { key: 'dictation', label: t('result.dictation'), pages: pages.filter(isDictation) }]
          : undefined;
        return (
          <>
            {parts ? parts.map((part, n) => {
              return (
                <details key={part.key} className="result-accordion" open={n === 0}>
                  <summary>
                    <span>{part.label}</span>
                  </summary>
                  {renderSections(part.pages)}
                </details>
              );
            }) : renderSections(pages)}
          </>
        );
      })() : (
        <p className="muted">{t('result.completionOnly')}</p>
      )}
      </div>
      </div>
    </section>
  );
}

export { UnitFeedback };
