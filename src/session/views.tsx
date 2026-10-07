import { useEffect, useRef, useState } from 'react';

import { useI18n, useLastTry } from '../app/context.tsx';
import { formatScore, roundHalfUp1 } from '../domain/format.ts';
import type { LessonPlan, PlanUnit } from '../domain/session/plan.ts';
import { headerScore, isAnswered, isListeningPage, presentationComplete, scoreUnit, skipsFeedbackWhenCorrect, lessonResults, POLICY, progress, type LockedUnit, type SessionRecord } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';
import { rendererRegistry, UnitFeedback } from './renderers.tsx';
import { answerText } from './controls.tsx';
import type { SessionInput } from './useSession.ts';
import { reviewColor } from '../artifacts/briefParts.tsx';
import type { VoiceStatus } from './speech.ts';
import { VoiceHelp } from './VoiceHelp.tsx';

/* ------------------------------------------------------------ start page */

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
      {notice && <p className="note" role="note">{notice}</p>}
      {resumable ? (
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
  const score = headerScore(plan, record);
  return (
    <div className="session-header">
      <p className="session-title" lang={plan.lang}>{plan.title}</p>
      <div className="session-meters">
        <div className="progress" role="progressbar" aria-label={t('session.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <span className="muted">{formatScore(pct, locale).replace(/[.,]0%$/, '%')}</span>
        <span className="session-score" aria-label={t('session.scoreLabel')}>{t('session.score', { score: roundHalfUp1(score).toLocaleString(locale), total: 100 })}</span>
      </div>
    </div>
  );
}

function Countdown({ remainingMs }: { remainingMs: number }) {
  const { t } = useI18n();
  const total = Math.ceil(remainingMs / 1000);
  const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  return (
    <p className={`countdown${total <= 10 ? ' countdown-low' : ''}`} role="timer" aria-label={t('session.timeLeft', { time: text })}>
      {text}
    </p>
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
  const page = plan.pages[record.pageIndex];
  const listening = isListeningPage(page);
  const needsVoice = listening && record.phase === 'answering';
  useEffect(() => {
    if (needsVoice && page.role === 'exam' && voiceStatus === 'available') dispatch({ type: 'voice_ready' });
  }, [needsVoice, page.pageId, page.role, voiceStatus, dispatch]);
  const mode = page.role === 'exam' ? 'exam' : record.phase === 'feedback' ? 'feedback' : 'answering';
  const ready = page.role === 'presentation' ? presentationComplete(page, record) : page.role !== 'practice' || record.phase === 'feedback' || page.units.every((u) => isAnswered(u, record.drafts[u.id]));
  const heading = useRef<HTMLHeadingElement>(null);
  // Typing pages put the cursor straight into the first answer field; other pages focus the heading.
  useEffect(() => {
    const field = document.querySelector<HTMLInputElement>('.task-card input.text-input:not([readonly]):not([disabled])');
    (field ?? heading.current)?.focus();
  }, [record.pageIndex]);
  // A fully correct matching page plays a short success animation, then skips its feedback (P2-02).
  const [celebrating, setCelebrating] = useState(false);
  const onContinue = () => {
    const perfect = record.phase === 'answering' && skipsFeedbackWhenCorrect(page)
      && page.units.every((u) => scoreUnit(u, record.drafts[u.id]).outcome === 'fully_correct');
    if (!perfect) return dispatch({ type: 'continue' });
    setCelebrating(true);
    window.setTimeout(() => { setCelebrating(false); dispatch({ type: 'continue' }); }, 900);
  };

  return (
    <>
      <SessionHeader plan={plan} record={record} />
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
      <section className={`task-card${celebrating ? ' is-celebrating' : ''}`} aria-labelledby="task-heading">
        {celebrating && <span className="visually-hidden" role="status">{t('session.allCorrect')}</span>}
        <p className="label-muted">{page.stepLabel[locale]}{page.role === 'exam' && page.stepLabel[locale] !== t('session.examPage') ? ` · ${t('session.examPage')}` : ''}</p>
        <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">{page.instructions[locale]}</h1>
        {page.role === 'exam' && remainingMs !== undefined && <Countdown remainingMs={remainingMs} />}
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
            />
          );
        })}
        <div className="task-footer">
          {page.role === 'presentation' && !ready && <p className="muted">{t('session.revealAll')}</p>}
          <span className="continue-wrap">
            <button type="button" className="button button-primary" disabled={!ready} aria-disabled={celebrating || undefined} onClick={() => !celebrating && onContinue()}>
              {t('session.continue')}
            </button>
          </span>
        </div>
      </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------- results */

/**
 * One reviewed mistake (results page, same style as matching corrections): the task, the correct
 * answer in green with the learner's answer struck through in red directly below, an "almost" or
 * timeout note, and the explanation. Fully correct answers are not listed.
 */
function ResultMistake({ unit, locked, lang }: { unit: PlanUnit; locked: LockedUnit; lang: string }) {
  const { t, locale } = useI18n();
  const prompt = [unit.prompt.native, unit.prompt.learning, unit.prompt.before !== undefined ? `${unit.prompt.before ?? ''} ____ ${unit.prompt.after ?? ''}` : undefined].find(Boolean) ?? t('session.typeWhatYouHear');
  const given = answerText(unit, locked.response, t);
  const correct = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  return (
    <li className={`outcome-${locked.outcome}`}>
      <div className="result-fix">
        <span className="result-prompt" lang={unit.prompt.native ? undefined : lang}>{prompt}</span>
        <span className="match-arrow" aria-hidden="true">→</span>
        <strong className="match-right">
          <span className="visually-hidden">{t('result.correctAnswer')}: </span><span lang={unit.answerLang === 'learning' ? lang : undefined}>{correct}</span>
          {unit.form && <span lang={lang}> · {unit.form}</span>}
        </strong>
        <span className="match-wrong"><span className="visually-hidden">{t('result.yourAnswer')}: </span><s lang={lang}>{given || t('result.noAnswer')}</s></span>
      </div>
      {(locked.outcome === 'orthography_only' || locked.timedOut) && (
        <p className="result-notes">
          {locked.outcome === 'orthography_only' && <span className="result-note result-note-almost">{t('feedback.almost')}</span>}
          {locked.timedOut && <span className="result-note">{t('result.timedOut')}</span>}
        </p>
      )}
      <p className="muted">{unit.explanation[locale]}</p>
    </li>
  );
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

  const fmt = (n: number) => formatScore(n, locale);
  const pts = (n: number) => n.toLocaleString(locale);
  const selectedStep = record.selection === 'exam' ? undefined : plan.steps.find((s) => s.stepId === record.selection);
  const pages = plan.pages.filter((p) => !(record.skippedNoVoice ?? []).includes(p.pageId) && (selectedStep ? p.stepId === selectedStep.stepId : p.role === 'exam'));
  const units = pages.flatMap((p) => p.units);
  const examTally = results.exam;

  return (
    <section aria-labelledby="results-title">
      <div className="summary-card">
        <p className="label-muted">{t('result.lessonScore')} · {t('index.courseLabel', { language: languageName(plan.lang), level: record.level })}</p>
        <h1 id="results-title" lang={plan.lang}>{plan.title}</h1>
        <p className="total-score">{t('session.score', { score: roundHalfUp1(results.total).toLocaleString(locale), total: 100 })}</p>
        <p>
          {t('result.practice', { earned: pts(results.practice.earned), possible: results.practice.possible, score: fmt(results.practiceScore) })} ·{' '}
          {t('result.exam', { earned: pts(examTally.earned), possible: examTally.possible, score: fmt(results.examScore) })}
        </p>
        <p className="muted">{t('session.weights', { practice: POLICY.practiceWeight, exam: POLICY.examWeight })}</p>
      </div>
      <h2 className="small-heading">{t('result.chooseReview')}</h2>
      <div className="result-menu" role="group" aria-label={t('result.chooseReview')}>
        <button type="button" className="button button-outline" aria-pressed={record.selection === 'exam'} onClick={() => dispatch({ type: 'select', selection: 'exam' })}>
          {t('session.examPage')}
        </button>
        {results.steps.filter((s) => s.role !== 'exam' && (s.role === 'presentation' || s.tally.possible > 0) && plan.steps.find((p) => p.stepId === s.stepId)).map((s) => {
          const label = plan.steps.find((p) => p.stepId === s.stepId)!.label[locale];
          return (
            <button key={s.stepId} type="button" className="button button-outline" aria-pressed={record.selection === s.stepId} onClick={() => dispatch({ type: 'select', selection: s.stepId })}>
              {s.role === 'practice' ? label : t('result.completed', { label })}
            </button>
          );
        })}
      </div>
      <h2 className="small-heading">{selectedStep ? selectedStep.label[locale] : t('result.examAnswers')}</h2>
      {units.length ? (() => {
        const reviewed = units.filter((u) => record.locked[u.id]);
        const mistakes = reviewed.filter((u) => record.locked[u.id].outcome !== 'fully_correct');
        return (
          <>
            <p className="match-summary">
              <strong>{t('result.summary', { correct: reviewed.length - mistakes.length, total: reviewed.length })}</strong>
              {mistakes.length > 0 ? <> {t('session.matchReview')}</> : <> {t('result.noMistakes')}</>}
            </p>
            <ul className="match-corrections result-list">
              {mistakes.map((u) => <ResultMistake key={u.id} unit={u} locked={record.locked[u.id]} lang={plan.lang} />)}
            </ul>
          </>
        );
      })() : (
        <p className="muted">{t('result.completionOnly')}</p>
      )}
    </section>
  );
}

export { UnitFeedback };
