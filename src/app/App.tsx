import { useEffect, useState, type ReactNode } from 'react';

import { Header } from '../components/Header.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { ALL_CATEGORIES, initialSelection, selectLanguage, type CourseSelection } from '../domain/courses.ts';
import { resolveMotherTongue } from '../domain/preferences.ts';
import { useManifest } from '../data/load.ts';
import { IndexPage } from '../pages/IndexPage.tsx';
import { LessonPage } from '../pages/LessonPage.tsx';
import { PlayPage } from '../pages/PlayPage.tsx';
import type { LessonKind } from '../schemas/common.ts';
import { LastTryProvider, PreferencesProvider, useI18n, usePreferences } from './context.tsx';
import { href, useRoute } from './route.ts';

export function App() {
  return (
    <PreferencesProvider>
      <LastTryProvider>
        <Routes />
      </LastTryProvider>
    </PreferencesProvider>
  );
}

function Routes() {
  const { t } = useI18n();
  const prefs = usePreferences();
  const route = useRoute();
  const manifest = useManifest();
  // Course and category selection live here so they survive navigation.
  const [selection, setSelection] = useState<CourseSelection>();
  const [categories, setCategories] = useState<ReadonlySet<LessonKind>>(ALL_CATEGORIES);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (manifest.status === 'ready' && !selection) setSelection(initialSelection(manifest.data));
  }, [manifest, selection]);

  // D38: the mother tongue may not equal the selected course's language.
  const { motherTongue, setMotherTongue } = prefs;
  useEffect(() => {
    if (!selection) return;
    const next = resolveMotherTongue(motherTongue, selection.lang);
    if (next !== motherTongue) {
      setMotherTongue(next);
      setAnnouncement(t('prefs.motherTongueChanged', { locale: t(`locale.${next}`) }));
    }
  }, [selection, motherTongue, setMotherTongue, t]);

  const shell = (body: ReactNode) => (
    <>
      <Header motherTongueEditable={route.name === 'index'} title={<span className="brand">{t('app.brand')}</span>} />
      <main id="main" tabIndex={-1} className="page page-wide">
        {body}
      </main>
    </>
  );

  if (manifest.status === 'loading') return shell(<StatusMessage>{t('state.loading')}</StatusMessage>);
  if (manifest.status === 'error') {
    return shell(
      <StatusMessage kind="error" onRetry={manifest.retry}>
        {t('state.invalidManifest', { error: manifest.error })}
      </StatusMessage>,
    );
  }
  if (manifest.data.courses.length === 0 || !selection) return shell(<StatusMessage kind="error">{t('state.noCourses')}</StatusMessage>);

  switch (route.name) {
    case 'lesson':
      return (
        <LessonPage
          key={route.id}
          manifest={manifest.data}
          lessonId={route.id}
          onReturnToOverview={(course) => {
            setSelection({ lang: course.lang, level: course.level });
            window.location.hash = href.index();
          }}
        />
      );
    case 'play':
      return <PlayPage key={route.id} manifest={manifest.data} lessonId={route.id} />;
    default:
      return (
        <IndexPage
          manifest={manifest.data}
          selection={selection}
          categories={categories}
          announcement={announcement}
          onSelectLanguage={(lang) => setSelection((s) => (s && selectLanguage(manifest.data, s, lang)) ?? s)}
          onSelectLevel={(level) => setSelection((s) => (s ? { ...s, level } : s))}
          onCategoriesChange={setCategories}
        />
      );
  }
}
