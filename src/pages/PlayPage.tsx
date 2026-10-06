import { useEffect, useMemo, useState } from 'react';

import { useI18n, usePreferences } from '../app/context.tsx';
import { href } from '../app/route.ts';
import { Header } from '../components/Header.tsx';
import { ReasonList } from '../components/ReasonList.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { courseOfLesson, readiness } from '../domain/courses.ts';
import { isMotherTongueAllowed } from '../domain/preferences.ts';
import { buildPlan, type LessonPlan } from '../domain/session/plan.ts';
import { startSession, type SessionRecord } from '../domain/session/session.ts';
import { clearSession, loadSession } from '../domain/session/storage.ts';
import { fetchArtifactText, useOutline } from '../data/load.ts';
import { LOCALES, type Locale } from '../schemas/common.ts';
import type { Manifest } from '../schemas/manifest.ts';
import { clock, useSession } from '../session/useSession.ts';
import { ResultsView, SessionView, StartView } from '../session/views.tsx';
import { useVoiceStatus } from '../session/speech.ts';
import type { Brief, LessonContent } from '../schemas/artifacts.ts';
import { validateBrief, validateContent } from '../validation/artifacts.ts';

type Loaded = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; content: LessonContent; brief: Brief };

/**
 * Session entry point: readiness, then the start/resume page, the session host and the
 * final results. It reads published files only and never triggers generation.
 */
export function PlayPage({ manifest, lessonId }: { manifest: Manifest; lessonId: string }) {
  const { t } = useI18n();
  const prefs = usePreferences();
  const course = courseOfLesson(manifest, lessonId);
  const outline = useOutline(course);
  const entry = outline.status === 'ready' ? outline.data.entries.find((e) => e.id === lessonId) : undefined;
  const artifacts = manifest.artifacts[lessonId];
  const reasons = entry ? readiness(entry.kind, artifacts) : [];
  const ready = entry !== undefined && reasons.length === 0;
  const contentHash = artifacts?.content?.sourceHash ?? '';

  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  useEffect(() => {
    if (!ready || !course || !entry || !artifacts?.draft || !artifacts.content) return;
    const ctrl = new AbortController();
    Promise.all([fetchArtifactText(artifacts.draft.url, ctrl.signal), fetchArtifactText(artifacts.content.url, ctrl.signal)]).then(([b, c]) => {
      if (b.status === 'error' || c.status === 'error') return setLoaded({ status: 'error', error: b.status === 'error' ? b.error : (c as { error: string }).error });
      try {
        const ctx = { entry, lang: course.lang, level: course.level };
        const brief = validateBrief(JSON.parse(b.text), ctx);
        const content = brief.value ? validateContent(JSON.parse(c.text), { ...ctx, brief: brief.value }) : undefined;
        if (brief.status !== 'valid' || !content || content.status !== 'valid') return setLoaded({ status: 'error', error: t('reason.invalid') });
        setLoaded({ status: 'ready', brief: brief.value!, content: content.value! });
      } catch (e) {
        setLoaded({ status: 'error', error: (e as Error).message });
      }
    }, () => undefined);
    return () => ctrl.abort();
  }, [ready, course, entry, artifacts, t]);

  const saved = useMemo(() => loadSession(lessonId), [lessonId]);
  const resumable = saved && saved.status === 'active' && saved.contentHash === contentHash ? saved : undefined;
  const changed = saved && saved.status === 'active' && saved.contentHash !== contentHash;
  const [active, setActive] = useState<SessionRecord | undefined>();

  // The attempt's mother tongue is the starting-page choice, never the course language (D38).
  const motherTongue: Locale = course && isMotherTongueAllowed(prefs.motherTongue, course.lang) ? prefs.motherTongue : LOCALES.find((l) => l !== course?.lang) ?? 'en';
  const plan: LessonPlan | undefined = useMemo(
    () => (loaded.status === 'ready' ? buildPlan(loaded.content, loaded.brief, active?.motherTongue ?? motherTongue) : undefined),
    [loaded, active?.motherTongue, motherTongue],
  );

  const start = () => {
    if (!plan || !course) return;
    clearSession(lessonId);
    setActive(startSession(plan, { sessionId: crypto.randomUUID(), contentHash, level: course.level, motherTongue, seed: Math.floor(Math.random() * 2 ** 31), now: clock.now() }));
  };

  let body;
  if (!course) body = <StatusMessage kind="error">{t('detail.notFound', { id: lessonId })}</StatusMessage>;
  else if (outline.status === 'loading') body = <StatusMessage>{t('state.loading')}</StatusMessage>;
  else if (outline.status === 'error') body = <StatusMessage kind="error" onRetry={outline.retry}>{t('state.outlineFailed', { error: outline.error })}</StatusMessage>;
  else if (!ready)
    body = (
      <StatusMessage kind="error">
        {t('play.unavailable')}
        <ReasonList reasons={reasons} />
      </StatusMessage>
    );
  else if (loaded.status === 'loading' || !plan) body = loaded.status === 'error' ? <StatusMessage kind="error">{t('detail.loadFailed', { error: loaded.error })}</StatusMessage> : <StatusMessage>{t('state.loading')}</StatusMessage>;
  else if (!active)
    body = <StartView plan={plan} level={course.level} resumable={resumable} notice={changed ? t('session.changedContent') : undefined} onStart={start} onResume={() => resumable && setActive(resumable)} />;
  else body = <ActiveSession key={active.sessionId} plan={plan} initial={active} onRestart={start} />;

  return (
    <>
      <Header
        motherTongueEditable={false}
        courseLang={course?.lang}
        motherTongueOverride={active?.motherTongue}
        title={<span className="brand">{t('app.brand')}</span>}
        actions={
          <a className="button button-outline" href={href.index()}>
            {t('action.lessonOverview')}
          </a>
        }
      />
      <main id="main" tabIndex={-1} className="page page-task">
        {body}
      </main>
    </>
  );
}

function ActiveSession({ plan, initial, onRestart }: { plan: LessonPlan; initial: SessionRecord; onRestart: () => void }) {
  const { t, locale } = useI18n();
  const voiceStatus = useVoiceStatus(plan.lang);
  const { record, dispatch, saveFailed, remainingMs } = useSession(plan, initial, locale, voiceStatus);
  return (
    <>
      {saveFailed && <StatusMessage>{t('session.saveFailed')}</StatusMessage>}
      {record.phase === 'results' ? (
        <>
          <ResultsView plan={plan} record={record} dispatch={dispatch} />
          <div className="task-footer">
            <button type="button" className="button button-outline" onClick={onRestart}>{t('session.restart')}</button>
          </div>
        </>
      ) : (
        <SessionView plan={plan} record={record} dispatch={dispatch} remainingMs={remainingMs} voiceStatus={voiceStatus} />
      )}
    </>
  );
}
