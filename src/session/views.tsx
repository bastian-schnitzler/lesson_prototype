import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { useI18n, useLastTry, usePreferences } from '../app/context.tsx';
import { formatScore, roundHalfUp1 } from '../domain/format.ts';
import { answerMarks } from '../domain/answers.ts';
import { seededOrder, type LessonPlan, type PlanPage, type PlanUnit } from '../domain/session/plan.ts';
import { headerScore, isAnswered, isListeningPage, isMatchingItem, nextDialogueLine, presentationComplete, scoreUnit, skipsFeedbackWhenCorrect, lessonResults, pagesTally, progress, type LockedUnit, type SessionRecord } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';
import type { Locale } from '../schemas/common.ts';
import { rendererRegistry, UnitFeedback } from './renderers.tsx';
import { answerText } from './controls.tsx';
import { MATCH_SLIDE_MS } from './vocabularyRenderers.tsx';
import { missingArticle } from '../domain/articleHint.ts';
import type { SessionInput } from './useSession.ts';
import { reviewColor } from '../artifacts/briefParts.tsx';
import { useVoiceStatus, type VoiceStatus } from './speech.ts';
import { gapSentence, pronounWithForm, useAutoplay } from './autoplay.ts';
import { VoiceHelp } from './VoiceHelp.tsx';
import { NewVerbs } from './grammarRenderers.tsx';
import { durationText, examPageKind, examParts, NavLayout, PointStrip, resultTone } from './LessonNav.tsx';
import { lessonOutline, numberedPoints } from '../domain/session/outline.ts';

export { resultTone };

/* ------------------------------------------------------------ start page */

/** Function start page (SPEC section 8): the situation and the number of expressions and words. */
function FunctionsStart({ plan }: { plan: LessonPlan }) {
  const { t, locale } = useI18n();
  const f = plan.functions!;
  return (
    <>
      <p className="muted">{f.situation[locale]}</p>
      <p className="muted">{t('session.expressionCount', { count: f.expressions.length })} · {t('session.vocabularyCount', { count: f.words.length })}</p>
    </>
  );
}

/**
 * The lesson outline of the start page (P6-01 review), congruent with the sidebar: sections lettered
 * A, B, C… in their colours (word groups, grammar blocks, function stages, the exercises, the exam),
 * each with its learning points indented below and numbered as in the sidebar.
 */
function LessonFlow({ plan }: { plan: LessonPlan }) {
  const { t, locale } = useI18n();
  const sections = lessonOutline(plan);
  const points = numberedPoints(sections);
  const seconds = (pages: number[]) => pages.reduce((n, i) => n + plan.pages[i].estimatedDurationS, 0);
  const title = (section: (typeof sections)[number]) => (section.titleKey ? t(section.titleKey) : section.title?.[locale] ?? '');
  return (
    <>
      <h2 className="small-heading">{t('session.lessonFlow')}</h2>
      <ol className="flow-sections">
        {sections.map((section, n) => {
          const group = plan.groups.find((g) => g.label === section.title);
          const exam = section.kind === 'exam' ? section.pages.map((i) => plan.pages[i]).filter((p) => p.role === 'exam') : [];
          return (
            <li key={section.key} className="flow-section" style={reviewColor(section.colour)}>
              <div className="flow-head">
                <span className="flow-letter" aria-hidden="true">{String.fromCharCode(65 + n)}</span>
                <span className="flow-title">
                  {title(section)}
                  {section.kind === 'exam' && <small className="flow-detail">{t('activity.exam', { count: exam.reduce((k, p) => k + p.units.length, 0), pages: exam.length })}</small>}
                  {group && <small className="flow-detail">{t('session.vocabularyCount', { count: group.targetIds.length })}</small>}
                </span>
                {/* Whole minutes with the stopwatch of the exam time limits (P6-02). */}
                <Clock className="flow-minutes">{t('session.flowMinutes', { minutes: Math.max(1, Math.round(seconds(section.pages) / 60)) })}</Clock>
              </div>
              {section.points.length > 0 && (
                <ol className="flow-points">
                  {points.filter((p) => p.sectionIndex === n).map((p) => (
                    <li key={p.key}>
                      <span className="flow-number" aria-hidden="true">{p.number}</span>
                      {/* An explanation named like its block is simply "Explanation". */}
                      <span>{p.kind === 'theory' && p.title[locale] === title(section) ? t('nav.explanation') : p.title[locale]}</span>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
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
      {plan.functions && <FunctionsStart plan={plan} />}
      {plan.kind === 'grammar' && <NewVerbs plan={plan} motherTongue={motherTongue} />}
      <LessonFlow plan={plan} />
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

/**
 * A dictation page shows its words in a random order fixed by the session seed, so the learner cannot
 * tell from the lesson order which word is being read out; resume shows the same order.
 */
export function displayOrder(page: PlanPage, seed: number): PlanPage {
  if (!page.items.length || !page.items.every((it) => it.type === 'vocabulary_listening_dictation')) return page;
  const items = seededOrder(page.items, seed, page.pageId);
  return { ...page, items, units: items.flatMap((it) => page.units.filter((u) => u.itemId === it.itemId)) };
}

/** Audio played when a page opens in autoplay mode (P4-05 review): the prompt that has to be heard. */
export function entryAudio(page: PlanPage): string | undefined {
  const item = page.items[0];
  if (!item) return undefined;
  // Dialogue gaps and listening choices play role A's line (P4-05 review).
  if (item.type === 'function_dialogue_gap_choice' || item.type === 'function_listening_choice') return item.context.text;
  if (item.type === 'vocabulary_listening_choice' || item.type === 'vocabulary_listening_dictation') return page.units[0]?.speak;
  return undefined;
}

/**
 * The correct answers of a practice page, spoken in autoplay mode as the page is checked, together with
 * the green or red marking (P4-05 review): gaps and error spotters as whole sentences, word order as
 * the sentence, pronoun rows as pronoun + form. Matching boards and gender pages, which have their own
 * sounds, and listening choices, whose word was just heard (P6-02), are left out.
 */
export function correctSentences(page: PlanPage): string | undefined {
  const sentences = page.units.flatMap((u) => {
    // Dialogue gaps play only role A's line, on entry (P4-05 review).
    if (u.answerLang !== 'learning' || isMatchingItem(u.itemType) || u.itemType === 'function_dialogue_gap_choice') return [];
    if (u.kind === 'spot' || u.kind === 'order') return [u.answer];
    if (u.prompt.before !== undefined || u.prompt.after !== undefined) return [gapSentence(u.prompt.before, u.answer, u.prompt.after)];
    if (u.itemType === 'grammar_pronoun_form_typing' || u.itemType === 'grammar_pronoun_form_match') return [`${pronounWithForm(u.prompt.learning ?? '', u.answer)}.`];
    return [];
  });
  return sentences.length ? sentences.join(' ') : undefined;
}

/**
 * Practice pages with one multiple-choice answer (P4-05 review): multiple-choice and dialogue gaps, and
 * vocabulary listening choices, whose options are written (P6-02). Listening replies, matching boards and
 * gender pages keep their Check button.
 */
export function isAutoSubmitPage(page: PlanPage): boolean {
  const unit = page.units[0];
  return page.role === 'practice' && page.units.length === 1 && unit.kind === 'choice' && !isMatchingItem(unit.itemType)
    && unit.itemType !== 'vocabulary_gender_select' && unit.itemType !== 'function_gender_select' && page.items.length === 1
    // Listening replies are only heard, so the learner listens to all of them before Check.
    && unit.itemType !== 'function_listening_choice';
}

export function SessionHeader({ plan, record }: { plan: LessonPlan; record: SessionRecord }) {
  const { t, locale } = useI18n();
  const pct = progress(plan, record);
  const score = headerScore(plan, record);
  // No score on introduction, theory and other pages without answers (P06-00): 0 / 100 means nothing there.
  const showScore = plan.pages[record.pageIndex]?.role !== 'presentation';
  return (
    <div className="session-header">
      <p className="session-title" lang={plan.lang}>{plan.title}</p>
      <div className="session-meters">
        <div className="progress" role="progressbar" aria-label={t('session.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
          <span style={{ width: `${pct}%` }} />
        </div>
        {/* Phones: the learning points as markers take the place of the progress bar (P6-01 review). */}
        <PointStrip plan={plan} record={record} />
        <span className="muted">{formatScore(pct, locale).replace(/[.,]0%$/, '%')}</span>
        {showScore && <span className="session-score" aria-label={t('session.scoreLabel')}>{t('session.score', { score: roundHalfUp1(score).toLocaleString(locale), total: 100 })}</span>}
      </div>
    </div>
  );
}

/** The countdown of an exam page (P6-02, feedback #6): a box beside the heading with a bar of the time left. */
function Countdown({ remainingMs, limitS }: { remainingMs: number; limitS?: number }) {
  const { t } = useI18n();
  const total = Math.ceil(remainingMs / 1000);
  const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  const share = limitS ? Math.max(0, Math.min(1, remainingMs / (limitS * 1000))) : undefined;
  return (
    <div className={`countdown${total <= 10 ? ' countdown-low' : ''}`}>
      <span className="countdown-label" aria-hidden="true">{t('session.timeLeftLabel')}</span>
      <span className="countdown-time" role="timer" aria-label={t('session.timeLeft', { time: text })}>{text}</span>
      {share !== undefined && <span className="countdown-bar" aria-hidden="true"><span style={{ width: `${share * 100}%` }} /></span>}
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
  const page = displayOrder(plan.pages[record.pageIndex], record.seed);
  const listening = isListeningPage(page);
  const needsVoice = listening && record.phase === 'answering';
  useEffect(() => {
    if (needsVoice && page.role === 'exam' && voiceStatus === 'available') dispatch({ type: 'voice_ready' });
  }, [needsVoice, page.pageId, page.role, voiceStatus, dispatch]);
  const mode = page.role === 'exam' ? 'exam' : record.phase === 'feedback' ? 'feedback' : 'answering';
  const ready = page.role === 'presentation' ? presentationComplete(page, record) : page.role !== 'practice' || record.phase === 'feedback' || page.units.every((u) => isAnswered(u, record.drafts[u.id]));
  // Dialogues unroll line by line: the model dialogue and the exam dialogue (until the page is submitted).
  const nextLine = page.role === 'presentation' || (page.role === 'exam' && record.phase === 'answering') ? nextDialogueLine(page, record) : undefined;
  const heading = useRef<HTMLHeadingElement>(null);
  // Autoplay (P4-05 review): entering a dictation, a listening choice or a dialogue gap plays its prompt;
  // it waits for speech still in progress, e.g. the previous page's correct sentence.
  const spokenPage = useRef(-1);
  useEffect(() => {
    if (spokenPage.current === record.pageIndex) return; // once per page (effects may run twice in development)
    spokenPage.current = record.pageIndex;
    if (record.phase === 'answering' && !(listening && voiceStatus !== 'available')) say(entryAudio(page), { queue: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.pageIndex]);
  // Typing pages, practice and exam, put the cursor straight into the first answer field; other pages
  // focus the heading. A listening page shows its fields only once the voice check is done (P6-02).
  useEffect(() => {
    const field = document.querySelector<HTMLInputElement>('.task-card input.text-input:not([readonly]):not([disabled])');
    (field ?? heading.current)?.focus();
  }, [record.pageIndex, voiceStatus]);
  // A fully correct single-answer page plays a short success animation, then skips its feedback (P2-02, P2-04).
  const [celebrating, setCelebrating] = useState(false);
  // Exam units missing their article get an info box after Continue; the next Continue submits anyway.
  const [articleWarnings, setArticleWarnings] = useState<string[]>([]);
  useEffect(() => setArticleWarnings([]), [record.pageIndex]);
  // Single-answer practice pages mark the answer in place (red/green) instead of a feedback card (P2-04 review).
  const inline = page.role === 'practice' && skipsFeedbackWhenCorrect(page);
  // Typed pronoun rows explain themselves in their row; other half-point answers below the button.
  const almost = inline && record.phase === 'feedback' ? page.units.filter((u) => record.locked[u.id]?.outcome === 'orthography_only' && u.itemType !== 'grammar_pronoun_form_typing') : [];
  const say = useAutoplay(plan.lang);
  const onContinue = () => {
    // Autoplay (P4-05 review): submitting a gap or error-spotting page speaks the correct sentence.
    if (page.role === 'practice' && record.phase === 'answering') say(correctSentences(page));
    if (page.role === 'exam') {
      // Translation only: a dictation has no article hint (P2-04 review).
      const missing = page.units.filter((u) => (u.itemType === 'vocabulary_translation_exam' || u.itemType === 'function_translation_exam')
        && missingArticle((record.drafts[u.id] as string | undefined) ?? '', u.answer, plan.lang)).map((u) => u.id);
      if (missing.length && !articleWarnings.length) return setArticleWarnings(missing);
      setArticleWarnings([]);
    }
    const perfect = record.phase === 'answering' && skipsFeedbackWhenCorrect(page)
      && page.units.every((u) => scoreUnit(u, record.drafts[u.id]).outcome === 'fully_correct');
    if (!perfect) return dispatch({ type: 'continue' });
    setCelebrating(true);
    // Matching first slides every word level with its meaning, then flashes (0.9 s) like other pages.
    const pause = page.items.some((it) => isMatchingItem(it.type)) ? MATCH_SLIDE_MS + 1000 : 900;
    window.setTimeout(() => { setCelebrating(false); dispatch({ type: 'continue' }); }, pause);
  };
  // Multiple choice (P4-05 review): choosing an option submits the page at once; a right answer plays the
  // success animation and moves on, a wrong one is marked in place and waits for Continue.
  const autoSubmit = page.role === 'practice' && record.phase === 'answering' && isAutoSubmitPage(page);
  const choice = autoSubmit ? record.drafts[page.units[0].id] : undefined;
  useEffect(() => {
    if (autoSubmit && choice && !celebrating) onContinue();
    // onContinue reads the current record; it runs once per chosen answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, choice]);

  return (
    <NavLayout plan={plan} record={record} dispatch={dispatch}>
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
        <div className="task-top">
          <div>
            <p className="label-muted">{page.stepLabel[locale]}{page.role === 'exam' && page.stepLabel[locale] !== t('session.examPage') ? ` · ${t('session.examPage')}` : ''}</p>
            <h1 id="task-heading" ref={heading} tabIndex={-1} className="task-heading">{page.special === 'examIntro' ? t('examIntro.title') : instructionsFor(page, locale, t)}</h1>
          </div>
          {page.role === 'exam' && remainingMs !== undefined && <Countdown remainingMs={remainingMs} limitS={page.timeLimitS ?? undefined} />}
        </div>
        {page.special === 'examIntro' && <ExamIntro plan={plan} page={page} />}
        {page.items.map((item, n) => {
          const Renderer = rendererRegistry[item.type];
          const rendered = (
            <Renderer
              key={item.itemId}
              item={item}
              units={page.units.filter((u) => u.itemId === item.itemId)}
              plan={plan}
              mode={mode}
              drafts={record.drafts}
              locked={record.locked}
              // While the success animation plays the answer is fixed.
              onChange={(unitId, response) => { if (!celebrating) dispatch({ type: 'draft', unitId, response }); }}
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
          // Exam pages with several typed answers show each task as a numbered card (P6-02, feedback #26).
          return examCards(page) ? (
            <div key={item.itemId} className="exam-card">
              <span className="exam-card-number" aria-hidden="true">{n + 1}.</span>
              {rendered}
            </div>
          ) : rendered;
        })}
        <div className="task-footer">
          {page.role === 'presentation' && !ready && !nextLine && <p className="muted">{t('session.revealAll')}</p>}
          <span className="continue-wrap">
            {nextLine ? (
              // A function dialogue unrolls line by line; after the last line the button continues (SPEC section 8).
              <button type="button" className="button button-primary" onClick={() => dispatch({ type: 'reveal', ...nextLine })}>{t('session.nextLine')}</button>
            ) : (
            !(autoSubmit || (celebrating && isAutoSubmitPage(page))) && <button type="button" className="button button-primary" disabled={!ready} aria-disabled={celebrating || undefined} onClick={() => !celebrating && onContinue()}>
              {/* Practice pages are checked first ("Check"); afterwards the same button continues. */}
              {t(page.role === 'practice' && record.phase === 'answering' ? 'session.check' : 'session.continue')}
            </button>
            )}
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
    </NavLayout>
  );
}

/**
 * Exam pages with more than one typed answer (vocabulary translation and dictation, grammar typed gaps)
 * show one numbered card per task (P6-02, feedback #26); the function exam dialogue keeps its own layout.
 */
export function examCards(page: PlanPage): boolean {
  return page.role === 'exam' && page.items.length > 1 && page.units.filter((u) => u.kind === 'text').length > 1
    && !page.items.some((it) => it.type === 'function_dialogue_gap_typing');
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
  const tasks = examPages.reduce((n, p) => n + p.units.length, 0);
  return (
    <div className="exam-intro">
      <p className="lead">{plan.targets.size > 0 ? t('examIntro.words', { count: words.size, tasks }) : t('examIntro.tasks', { tasks })}</p>
      <ol className="group-list">
        {examPages.map((p, n) => (
          <li key={p.pageId} style={reviewColor(n)}>
            <span>{t(examPageKind(p))} · {t('examIntro.items', { count: p.units.length })}</span>
            <TimeLimit seconds={p.timeLimitS ?? 0} />
          </li>
        ))}
      </ol>
      <p className="muted">{t('examIntro.rules')}</p>
    </div>
  );
}

/** A duration in a stopwatch chip (P6-02): exam time limits and the minutes of the lesson outline. */
function Clock({ className = '', label, children }: { className?: string; label?: string; children: ReactNode }) {
  return (
    <span className={`time-limit ${className}`.trim()} aria-label={label}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="14" r="7.5" /><path d="M12 14V10.5M10 2.5h4M18.2 7.3l1.3-1.3" />
      </svg>
      <span aria-hidden={label ? true : undefined}>{children}</span>
    </span>
  );
}

/** The time limit of an exam page as a stopwatch chip, "⏱ 01:20" (P6-02, feedback #13). */
function TimeLimit({ seconds }: { seconds: number }) {
  const { t } = useI18n();
  return (
    <Clock label={t('examIntro.limit', { time: durationText(seconds, t) })}>
      {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
    </Clock>
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
  if (unit.itemType === 'vocabulary_gender_select' || unit.itemType === 'function_gender_select') return [`${prompt}:`];
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
  // A "des" + plural answer shows the chosen gender after the word (P4-05 review).
  const given = answerText(unit, locked.response, t) + (locked.gender ? ` (${t(`gender.${locked.gender}` as MessageKey)})` : '');
  const correct = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  const ok = locked.outcome === 'fully_correct';
  // Gender rows (P2-04 review): "word: chosen gender", and for a mistake the struck gender → the correct one.
  if (unit.itemType === 'vocabulary_gender_select' || unit.itemType === 'function_gender_select') {
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
            {!ok && <span className="match-wrong"><span className="visually-hidden">{t('result.yourAnswer')}: </span><GivenAnswer unit={unit} given={given} lang={lang} /></span>}
          </span>
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

/**
 * The learner's wrong answer in a result row (P4-05 review): struck through in red, or, when only the
 * accents/capitals or only the article differ, with just those letters or the article in red.
 */
function GivenAnswer({ unit, given, lang }: { unit: PlanUnit; given: string; lang: string }) {
  const { t } = useI18n();
  if (!given) return <s>{t('result.noAnswer')}</s>;
  const marks = unit.kind === 'text' ? answerMarks(given, unit.accepted.answers) : [{ text: given, wrong: true }];
  if (marks.length === 1 && marks[0].wrong) return <s lang={lang}>{given}</s>;
  return (
    <span lang={lang} className="marked-answer">
      {marks.map((m, n) => <span key={n} className={m.wrong ? 'mark-wrong' : 'mark-ok'}>{m.text}</span>)}
    </span>
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

export function ResultsView({ plan, record, dispatch, footer }: { plan: LessonPlan; record: SessionRecord; dispatch: (action: SessionInput) => void; footer?: React.ReactNode }) {
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
  const selectedStep = plan.steps.find((s) => s.stepId === record.selection && s.role !== 'exam');
  const examPages = plan.pages.filter((p) => !(record.skippedNoVoice ?? []).includes(p.pageId) && p.role === 'exam');
  // The exam shows one part at a time (P6-01): 'exam' selects its first part.
  const parts = selectedStep ? undefined : examParts(examPages, t);
  const part = parts && (parts.find((x) => `exam:${x.key}` === record.selection) ?? parts[0]);
  const pages = selectedStep ? plan.pages.filter((p) => !(record.skippedNoVoice ?? []).includes(p.pageId) && p.stepId === selectedStep.stepId) : part?.pages ?? examPages;
  const units = pages.flatMap((p) => p.units);
  // The card shows the selected part first: its name as heading and its score, then the lesson total.
  const selectedTally = selectedStep ? results.steps.find((s) => s.stepId === selectedStep.stepId)?.tally : results.exam;
  // The card takes the colour of the selected sidebar entry: an exam part, the whole exam or an exercise.
  const selectedPartTally = !selectedStep && part && record.selection === `exam:${part.key}` ? pagesTally(part.pages, record) : undefined;
  const cardTone = selectedStep?.role === 'presentation' ? '' : resultTone(selectedPartTally ?? selectedTally ?? { earned: 0, possible: 0 });
  const sectionScore = selectedStep?.role === 'presentation' || !selectedTally?.possible
    ? t('result.completedShort')
    : `${pts(selectedTally.earned)} / ${selectedTally.possible}`;
  return (
    <NavLayout plan={plan} record={record} dispatch={dispatch}>
    <section aria-labelledby="results-title">
      <div className={`summary-card${cardTone}`}>
        <p className="label-muted">{t('index.courseLabel', { language: languageName(plan.lang), level: record.level })}</p>
        <h1 id="results-title">{selectedStep ? selectedStep.label[locale] : t('session.examPage')}</h1>
        <p className="total-score">{sectionScore}</p>
        <p className="results-lesson" lang={plan.lang}>{plan.title}</p>
      </div>
      <h2 className="small-heading">{selectedStep ? selectedStep.label[locale] : part ? `${t('result.examAnswers')} · ${part.label}` : t('result.examAnswers')}</h2>
      {units.some((u) => record.locked[u.id]) ? (() => {
        const reviewed = units.filter((u) => record.locked[u.id]);
        const correct = (list: PlanUnit[]) => list.filter((u) => record.locked[u.id].outcome === 'fully_correct').length;
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
        return (
          <>
            <p className="match-summary"><strong>{t('result.summary', { correct: correct(reviewed), total: reviewed.length })}</strong></p>
            {renderSections(pages)}
          </>
        );
      })() : (
        <p className="muted">{t('result.completionOnly')}</p>
      )}
    </section>
    {footer}
    </NavLayout>
  );
}

export { UnitFeedback };
