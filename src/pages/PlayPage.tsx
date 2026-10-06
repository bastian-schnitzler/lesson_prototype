import { useI18n } from '../app/context.tsx';
import { href } from '../app/route.ts';
import { Header } from '../components/Header.tsx';
import { ReasonList } from '../components/ReasonList.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { courseOfLesson, readiness } from '../domain/courses.ts';
import { useOutline } from '../data/load.ts';
import type { Manifest } from '../schemas/manifest.ts';

/**
 * Session entry point. The start/resume page and session host arrive in P1-09;
 * until a category's renderers exist, readiness fails and this page explains
 * why. It never triggers generation.
 */
export function PlayPage({ manifest, lessonId }: { manifest: Manifest; lessonId: string }) {
  const { t } = useI18n();
  const course = courseOfLesson(manifest, lessonId);
  const outline = useOutline(course);
  const entry = outline.status === 'ready' ? outline.data.entries.find((e) => e.id === lessonId) : undefined;
  const reasons = entry ? readiness(entry.kind, manifest.artifacts[lessonId]) : [];

  return (
    <>
      <Header
        motherTongueEditable={false}
        courseLang={course?.lang}
        title={<span className="brand">{t('app.brand')}</span>}
        actions={
          <a className="button button-outline" href={href.index()}>
            {t('action.lessonOverview')}
          </a>
        }
      />
      <main id="main" tabIndex={-1} className="page page-narrow">
        <h1 lang={course?.lang}>{entry?.workingTitle ?? lessonId}</h1>
        {!course && <StatusMessage kind="error">{t('detail.notFound', { id: lessonId })}</StatusMessage>}
        {course && outline.status === 'loading' && <StatusMessage>{t('state.loading')}</StatusMessage>}
        {course && outline.status === 'error' && (
          <StatusMessage kind="error" onRetry={outline.retry}>
            {t('state.outlineFailed', { error: outline.error })}
          </StatusMessage>
        )}
        {entry && reasons.length > 0 && (
          <StatusMessage kind="error">
            {t('play.unavailable')}
            <ReasonList reasons={reasons} />
          </StatusMessage>
        )}
      </main>
    </>
  );
}
