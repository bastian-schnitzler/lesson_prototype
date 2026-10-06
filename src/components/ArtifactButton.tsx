import { useId } from 'react';

import { useI18n } from '../app/context.tsx';
import { href } from '../app/route.ts';
import { artifactState } from '../domain/courses.ts';
import type { LessonArtifacts } from '../schemas/manifest.ts';

/** The single Content button: labeled by the highest artifact present (D15). */
export function ArtifactButton({ lessonId, artifacts }: { lessonId: string; artifacts: LessonArtifacts | undefined }) {
  const { t } = useI18n();
  const descId = useId();
  const state = artifactState(artifacts);
  const description = [
    t(`content.describe.${state.label}`),
    state.incomplete ? t('content.describe.incomplete') : '',
    state.problem ? t(`content.describe.${state.problem}`) : '',
  ]
    .filter(Boolean)
    .join(' ');
  const warn = state.incomplete || state.problem !== null;
  return (
    <>
      <a className={`button button-outline button-small${warn ? ' has-warning' : ''}`} href={href.lesson(lessonId)} aria-describedby={descId}>
        {t(`artifact.${state.label}`)}
        {warn && <span aria-hidden="true"> ⚠</span>}
      </a>
      <span id={descId} className="visually-hidden">
        {description}
      </span>
    </>
  );
}
