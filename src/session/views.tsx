import { useEffect, useRef } from 'react';

import { useI18n, useLastTry } from '../app/context.tsx';
import { formatScore, roundHalfUp1 } from '../domain/format.ts';
import type { LessonPlan, PlanUnit } from '../domain/session/plan.ts';
import { headerScore, isAnswered, isListeningPage, presentationComplete, lessonResults, POLICY, progress, type LockedUnit, type SessionRecord, type UnitResponse } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';
import { rendererRegistry, UnitFeedback } from './renderers.tsx';
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
  const scored = plan.steps.filter((s) => s.role !== 'presentation');
  return (
    <section className="task-card start-card" aria-labelledby="start-title">
      <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level })}</p>
      <h1 id="start-title" lang={plan.lang}>{plan.title}</h1>
      <p className="lead">{plan.objective[locale]}</p>
      <p className="muted">{t('session.minutes', { minutes: plan.estimatedMinutes })} · {t('session.scoredSteps', { count: scored.length })}</p>
      <h2 className="small-heading">{t('session.stages')}</h2>
      <ol className="stage-list">
        {plan.steps.map((s, n) => (
          <li key={s.stepId} style={reviewColor(n)}>
            <span>{s.label[locale]}</span>
            <small>{t(s.role === 'exam' ? 'assessment.exam' : s.role === 'practice' ? 'assessment.practice' : 'assessment.none')}</small>
          </li>
        ))}
      </ol>
      <p className="muted">{t('session.weights', { practice: POLICY.practiceWeight, exam: POLICY.examWeight })}</p>
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
  useEffect(() => heading.current?.focus(), [record.pageIndex]);

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
      <section className="task-card" aria-labelledby="task-heading">
        <p className="label-muted">{page.stepLabel[locale]}{page.role === 'exam' ? ` · ${t('session.examPage')}` : ''}</p>
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
          {page.role === 'practice' && !ready && <p className="muted">{t('session.answerAll')}</p>}
          {page.role === 'presentation' && !ready && <p className="muted">{t('session.revealAll')}</p>}
          <button type="button" className="button button-primary" disabled={!ready} onClick={() => dispatch({ type: 'continue' })}>
            {t('session.continue')}
          </button>
        </div>
      </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------- results */

function answerText(unit: PlanUnit, response: UnitResponse | null, t: (k: MessageKey) => string): string {
  if (response === null || response === undefined) return '';
  switch (unit.kind) {
    case 'text': return response as string;
    case 'choice': {
      const option = unit.options.find((o) => o.id === response);
      return option ? (option.lang === 'ui' ? t(option.text as MessageKey) : option.text) : '';
    }
    case 'order': return (response as string[]).map((id) => unit.tokens.find((tk) => tk.id === id)?.text).join(' ');
    case 'spot': {
      const r = response as { tokenId: string; text: string };
      return unit.tokens.map((tk) => (tk.id === r.tokenId ? `[${r.text}]` : tk.text)).join(' ');
    }
  }
}

function ResultRow({ unit, locked, lang }: { unit: PlanUnit; locked: LockedUnit; lang: string }) {
  const { t, locale } = useI18n();
  const prompt = [unit.prompt.native, unit.prompt.learning, unit.prompt.before !== undefined ? `${unit.prompt.before ?? ''} ____ ${unit.prompt.after ?? ''}` : undefined].find(Boolean) ?? t('session.typeWhatYouHear');
  const given = answerText(unit, locked.response, t);
  const correct = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  const ok = locked.outcome === 'fully_correct';
  return (
    <li className={`result-row outcome-${locked.outcome}`}>
      <span className="result-icon" aria-hidden="true">{ok ? '✓' : locked.outcome === 'orthography_only' ? '!' : '✕'}</span>
      <div>
        <p lang={unit.prompt.native ? undefined : lang}>{prompt}</p>
        <p>
          <span className="label-muted">{t('result.yourAnswer')}</span>{' '}
          <span className="given" lang={lang}>{given || t('result.noAnswer')}</span>
        </p>
        {!(ok && given === correct) && (
          <p>
            <span className="label-muted">{t('result.correctAnswer')}</span> <span className="answer" lang={unit.answerLang === 'learning' ? lang : undefined}>{correct}</span>
            {unit.form && <span lang={lang}> · {unit.form}</span>}
          </p>
        )}
        <p className="result-class">
          {t(`outcome.${locked.outcome}`)} · {t('result.points', { earned: locked.points, possible: 1 })}
        </p>
        {locked.timedOut && <p className="muted">{t('result.timedOut')}</p>}
        {!ok && <p className="explanation">{unit.explanation[locale]}</p>}
      </div>
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
          {t('result.examButton', { earned: pts(examTally.earned), possible: examTally.possible })}
        </button>
        {results.steps.filter((s) => s.role !== 'exam' && (s.role === 'presentation' || s.tally.possible > 0) && plan.steps.find((p) => p.stepId === s.stepId)).map((s) => {
          const label = plan.steps.find((p) => p.stepId === s.stepId)!.label[locale];
          return (
            <button key={s.stepId} type="button" className="button button-outline" aria-pressed={record.selection === s.stepId} onClick={() => dispatch({ type: 'select', selection: s.stepId })}>
              {s.role === 'practice' ? `${label} ${pts(s.tally.earned)} / ${s.tally.possible}` : t('result.completed', { label })}
            </button>
          );
        })}
      </div>
      <h2 className="small-heading">{selectedStep ? selectedStep.label[locale] : t('result.examAnswers')}</h2>
      {units.length ? (
        <ul className="result-list">
          {units.map((u) => record.locked[u.id] && <ResultRow key={u.id} unit={u} locked={record.locked[u.id]} lang={plan.lang} />)}
        </ul>
      ) : (
        <p className="muted">{t('result.completionOnly')}</p>
      )}
    </section>
  );
}

export { UnitFeedback };
