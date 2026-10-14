import { useId } from 'react';

import { useI18n, useLastTry } from '../app/context.tsx';
import { href } from '../app/route.ts';
import { ArtifactButton } from '../components/ArtifactButton.tsx';
import { Header } from '../components/Header.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import {
  ALL_CATEGORIES,
  catalogLanguages,
  filterRows,
  findCourse,
  levelsFor,
  readiness,
  type CourseSelection,
} from '../domain/courses.ts';
import { useOutline } from '../data/load.ts';
import { formatScore } from '../domain/format.ts';
import { LESSON_KINDS, type LessonKind, type Level } from '../schemas/common.ts';
import type { Manifest } from '../schemas/manifest.ts';

interface IndexPageProps {
  manifest: Manifest;
  selection: CourseSelection;
  categories: ReadonlySet<LessonKind>;
  announcement?: string;
  onSelectLanguage: (lang: string) => void;
  onSelectLevel: (level: Level) => void;
  onCategoriesChange: (next: ReadonlySet<LessonKind>) => void;
}

export function IndexPage({ manifest, selection, categories, announcement, onSelectLanguage, onSelectLevel, onCategoriesChange }: IndexPageProps) {
  const { t, languageName, locale } = useI18n();
  const { scores } = useLastTry();
  const course = findCourse(manifest, selection);
  const outline = useOutline(course);
  const langGroup = useId();
  const levelGroup = useId();
  const catGroup = useId();
  const levels = levelsFor(manifest, selection.lang);
  const courseName = t('index.courseLabel', { language: languageName(selection.lang), level: selection.level });

  const toggle = (kind: LessonKind) => {
    const next = new Set(categories);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onCategoriesChange(next);
  };

  return (
    <>
      <Header
        motherTongueEditable
        courseLang={selection.lang}
        announcement={announcement}
        title={<span className="brand">{t('app.brand')}</span>}
        actions={<>
          <span className="label-muted">{courseName}</span>
          {/* The UX feedback page is a static page published next to the app (P06-00). */}
          <a className="button button-outline button-small" href="docs/feedback.html">{t('index.feedback')}</a>
        </>}
      />
      <main id="main" tabIndex={-1} className="page page-wide">
        <div className="filters" role="group" aria-label={t('index.filters')}>
          <div role="radiogroup" aria-labelledby={langGroup} className="filter-group">
            <span id={langGroup} className="label-muted">
              {t('index.learningLanguage')}
            </span>
            <div className="option-row">
              {catalogLanguages(manifest).map((lang) => (
                <label key={lang} className="option">
                  <input type="radio" name="learning-language" checked={selection.lang === lang} onChange={() => onSelectLanguage(lang)} />
                  <span lang={lang} title={languageName(lang)}>
                    {lang}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-labelledby={levelGroup} className="filter-group">
            <span id={levelGroup} className="label-muted">
              {t('index.level')}
            </span>
            <div className="option-row">
              {levels.length === 0 && <span>{t('state.noLevels')}</span>}
              {levels.map((level) => (
                <label key={level} className="option">
                  <input type="radio" name="level" checked={selection.level === level} onChange={() => onSelectLevel(level)} />
                  <span>{level}</span>
                </label>
              ))}
            </div>
          </div>
          <div role="group" aria-labelledby={catGroup} className="filter-group">
            <span id={catGroup} className="label-muted">
              {t('index.categories')}
            </span>
            <div className="option-row">
              {LESSON_KINDS.map((kind) => (
                <label key={kind} className="option">
                  <input type="checkbox" checked={categories.has(kind)} onChange={() => toggle(kind)} />
                  <span>{t(`filter.${kind}`)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <h1>{t('index.title')}</h1>
        {outline.status === 'ready' && (
          <p className="lead">{t('index.summary', { course: courseName, count: outline.data.entries.length })}</p>
        )}

        {!course && <StatusMessage kind="error">{t('state.noLevels')}</StatusMessage>}
        {course && outline.status === 'loading' && <StatusMessage>{t('state.loading')}</StatusMessage>}
        {course && outline.status === 'error' && (
          <StatusMessage kind="error" onRetry={outline.retry}>
            {t('state.outlineFailed', { error: outline.error })}
          </StatusMessage>
        )}
        {outline.status === 'ready' && categories.size === 0 && (
          <div className="empty-state">
            <p>{t('index.noCategories')}</p>
            <a
              href={href.index()}
              onClick={(e) => {
                e.preventDefault();
                onCategoriesChange(ALL_CATEGORIES);
              }}
            >
              {t('index.resetCategories')}
            </a>
          </div>
        )}
        {outline.status === 'ready' && categories.size > 0 && (
          <div className="table-wrap">
            <table className="lesson-table">
              <thead>
                <tr>
                  <th scope="col">{t('col.number')}</th>
                  <th scope="col">{t('col.lesson')}</th>
                  <th scope="col">{t('col.category')}</th>
                  <th scope="col">{t('col.content')}</th>
                  <th scope="col">{t('col.lastTry')}</th>
                  <th scope="col">{t('col.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filterRows(outline.data.entries, categories).map(({ ordinal, entry }) => {
                  const artifacts = manifest.artifacts[entry.id];
                  const ready = readiness(entry.kind, artifacts).length === 0;
                  const score = scores.get(entry.id);
                  return (
                    <tr key={entry.id} data-lesson-id={entry.id}>
                      <td className="ordinal">{String(ordinal).padStart(2, '0')}</td>
                      <td lang={outline.data.lang}>{entry.workingTitle}</td>
                      <td>{t(`kind.${entry.kind}`)}</td>
                      <td>
                        <ArtifactButton lessonId={entry.id} artifacts={artifacts} />
                      </td>
                      <td className="score">{score === undefined ? '' : formatScore(score, locale)}</td>
                      <td>
                        {ready && (
                          <a className="button button-primary button-small" href={href.play(entry.id)}>
                            {t('action.startLesson')}
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">{t('index.lastTryNote')}</p>
      </main>
    </>
  );
}
