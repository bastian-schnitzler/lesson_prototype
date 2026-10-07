import { useEffect, useRef, useState } from 'react';

import { useI18n, useLastTry } from '../app/context.tsx';
import { formatScore, roundHalfUp1 } from '../domain/format.ts';
import type { LessonPlan, PlanPage, PlanUnit } from '../domain/session/plan.ts';
import { headerScore, isAnswered, isListeningPage, presentationComplete, scoreUnit, skipsFeedbackWhenCorrect, lessonResults, progress, type LockedUnit, type SessionRecord } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';
import type { Locale } from '../schemas/common.ts';
import { rendererRegistry, UnitFeedback } from './renderers.tsx';
import { answerText } from './controls.tsx';
import { missingArticle } from '../domain/articleHint.ts';
import type { SessionInput } from './useSession.ts';
import { reviewColor } from '../artifacts/briefParts.tsx';
import { useVoiceStatus, type VoiceStatus } from './speech.ts';
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
  // A fully correct single-answer page plays a short success animation, then skips its feedback (P2-02, P2-04).
  const [celebrating, setCelebrating] = useState(false);
  // Exam units missing their article get an info box after Continue; the next Continue submits anyway.
  const [articleWarnings, setArticleWarnings] = useState<string[]>([]);
  useEffect(() => setArticleWarnings([]), [record.pageIndex]);
  const onContinue = () => {
    if (page.role === 'exam') {
      const missing = page.units.filter((u) => (u.itemType === 'vocabulary_translation_exam' || u.itemType === 'vocabulary_listening_dictation')
        && missingArticle((record.drafts[u.id] as string | undefined) ?? '', u.answer, plan.lang)).map((u) => u.id);
      if (missing.length && !articleWarnings.length) return setArticleWarnings(missing);
      setArticleWarnings([]);
    }
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
        <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">{page.special === 'examIntro' ? t('examIntro.title') : instructionsFor(page, locale, t)}</h1>
        {page.role === 'exam' && remainingMs !== undefined && <Countdown remainingMs={remainingMs} />}
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
            />
          );
        })}
        <div className="task-footer">
          {page.role === 'presentation' && !ready && <p className="muted">{t('session.revealAll')}</p>}
          <span className="continue-wrap">
            <button type="button" className="button button-primary" disabled={!ready} aria-disabled={celebrating || undefined} onClick={() => !celebrating && onContinue()}>
              {/* Practice pages are checked first ("Check"); afterwards the same button continues. */}
              {t(page.role === 'practice' && record.phase === 'answering' ? 'session.check' : 'session.continue')}
            </button>
          </span>
        </div>
      </section>
      )}
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
  const kind = (p: PlanPage): MessageKey => {
    const types = new Set(p.units.map((u) => u.itemType));
    if (types.size === 1 && types.has('vocabulary_translation_exam')) return 'examIntro.translation';
    if (types.size === 1 && types.has('vocabulary_listening_dictation')) return 'examIntro.dictation';
    return 'examIntro.mixed';
  };
  const words = new Set(examPages.flatMap((p) => p.items.flatMap((it) => ('targetId' in it ? [it.targetId] : []))));
  const tasks = examPages.reduce((n, p) => n + p.units.length, 0);
  const minutes = (s: number) => (s % 60 ? t('unit.minutesSeconds', { m: Math.floor(s / 60), s: s % 60 }) : t('unit.minutes', { n: s / 60 }));
  return (
    <div className="exam-intro">
      <p className="lead">{plan.targets.size > 0 ? t('examIntro.words', { count: words.size, tasks }) : t('examIntro.tasks', { tasks })}</p>
      <ol className="group-list">
        {examPages.map((p, n) => (
          <li key={p.pageId} style={reviewColor(n)}>
            <span>{t(kind(p))} · {t('examIntro.items', { count: p.units.length })}</span>
            <small>{t('examIntro.limit', { time: minutes(p.timeLimitS ?? 0) })}</small>
          </li>
        ))}
      </ol>
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
function ResultItem({ unit, locked, lang }: { unit: PlanUnit; locked: LockedUnit; lang: string }) {
  const { t, locale } = useI18n();
  const prompt = [unit.prompt.native, unit.prompt.learning, unit.prompt.before !== undefined ? `${unit.prompt.before ?? ''} ____ ${unit.prompt.after ?? ''}` : undefined].find(Boolean) ?? t('session.typeWhatYouHear');
  const given = answerText(unit, locked.response, t);
  const correct = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  const ok = locked.outcome === 'fully_correct';
  return (
    <li className={`result-item outcome-${locked.outcome}`}>
      <span className="result-icon" aria-label={t(OUTCOME_LABEL[locked.outcome])}>{ok ? '✓' : locked.outcome === 'orthography_only' ? '!' : '✕'}</span>
      <div className="result-body">
        <div className="result-fix">
          <span className="result-prompt" lang={unit.prompt.native ? undefined : lang}>{prompt}</span>
          <span className="match-arrow" aria-hidden="true">→</span>
          <strong className="match-right">
            <span className="visually-hidden">{t('result.correctAnswer')}: </span><span lang={unit.answerLang === 'learning' ? lang : undefined}>{correct}</span>
            {unit.form && <span lang={lang}> · {unit.form}</span>}
          </strong>
          {!ok && <span className="match-wrong"><span className="visually-hidden">{t('result.yourAnswer')}: </span><s lang={lang}>{given || t('result.noAnswer')}</s></span>}
        </div>
        {(locked.outcome === 'orthography_only' || locked.timedOut) && (
          <p className="result-notes">
            {locked.outcome === 'orthography_only' && <span className="result-note result-note-almost">{t('feedback.almost')}</span>}
            {locked.timedOut && <span className="result-note">{t('result.timedOut')}</span>}
          </p>
        )}
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
  const selectedStep = record.selection === 'exam' ? undefined : plan.steps.find((s) => s.stepId === record.selection);
  const pages = plan.pages.filter((p) => !(record.skippedNoVoice ?? []).includes(p.pageId) && (selectedStep ? p.stepId === selectedStep.stepId : p.role === 'exam'));
  const units = pages.flatMap((p) => p.units);
  // The card shows the selected part first: its name as heading and its score, then the lesson total.
  const selectedTally = selectedStep ? results.steps.find((s) => s.stepId === selectedStep.stepId)?.tally : results.exam;
  const sectionScore = selectedStep?.role === 'presentation' || !selectedTally?.possible
    ? t('result.completedShort')
    : `${pts(selectedTally.earned)} / ${selectedTally.possible}`;
  // Only scored parts can be reviewed; presentation stages (introduction, flashcards) are left out.
  const exerciseSteps = results.steps.filter((s) => s.role !== 'exam' && s.role !== 'presentation' && s.tally.possible > 0 && plan.steps.some((p) => p.stepId === s.stepId));

  return (
    <section aria-labelledby="results-title">
      <div className="summary-card">
        <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level: record.level })}</p>
        <h1 id="results-title">{selectedStep ? selectedStep.label[locale] : t('session.examPage')}</h1>
        <p className="total-score">{sectionScore}</p>
        <p className="results-lesson" lang={plan.lang}>{plan.title}</p>
        <p className="results-total">{t('result.lessonTotal', { score: roundHalfUp1(results.total).toLocaleString(locale) })}</p>
      </div>
      <h2 className="small-heading">{t('result.chooseReview')}</h2>
      <div className="result-menu" role="group" aria-label={t('result.chooseReview')}>
        {/* The final exam comes first and stands out; the exercises follow in the order they were presented. */}
        <button type="button" className="button button-outline button-exam" aria-pressed={record.selection === 'exam'} onClick={() => dispatch({ type: 'select', selection: 'exam' })}>
          {t('session.examPage')}
        </button>
        {exerciseSteps.map((s) => {
          const label = plan.steps.find((p) => p.stepId === s.stepId)!.label[locale];
          return (
            <button key={s.stepId} type="button" className="button button-outline" aria-pressed={record.selection === s.stepId} onClick={() => dispatch({ type: 'select', selection: s.stepId })}>
              {label}
            </button>
          );
        })}
      </div>
      <h2 className="small-heading">{selectedStep ? selectedStep.label[locale] : t('result.examAnswers')}</h2>
      {units.some((u) => record.locked[u.id]) ? (() => {
        const reviewed = units.filter((u) => record.locked[u.id]);
        const correct = reviewed.filter((u) => record.locked[u.id].outcome === 'fully_correct').length;
        const sections = resultSections(plan, pages).map((sec) => ({ ...sec, units: sec.units.filter((u) => record.locked[u.id]) })).filter((sec) => sec.units.length);
        const title = (sec: (typeof sections)[number]) => plan.groups.find((g) => g.id === sec.groupId)?.label[locale] ?? t('result.part', { n: sec.part });
        return (
          <>
            <p className="match-summary"><strong>{t('result.summary', { correct, total: reviewed.length })}</strong></p>
            {sections.map((sec) => (
              <section key={sec.key} className={`result-section${sections.length > 1 ? ' is-framed' : ''}`} style={sec.groupId ? reviewColor(plan.groups.findIndex((g) => g.id === sec.groupId)) : undefined}>
                {sections.length > 1 && (sec.groupId || sec.key !== 'single') && <h3 className="result-section-title">{title(sec)}</h3>}
                <ul className="result-list">
                  {sec.units.map((u) => <ResultItem key={u.id} unit={u} locked={record.locked[u.id]} lang={plan.lang} />)}
                </ul>
              </section>
            ))}
          </>
        );
      })() : (
        <p className="muted">{t('result.completionOnly')}</p>
      )}
    </section>
  );
}

export { UnitFeedback };
