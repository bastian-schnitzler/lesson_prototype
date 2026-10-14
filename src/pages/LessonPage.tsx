import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import { href } from '../app/route.ts';
import { OutlineSummary } from '../artifacts/OutlineSummary.tsx';
import { contentViews, draftViews } from '../artifacts/registry.ts';
import { Header } from '../components/Header.tsx';
import { JsonTree } from '../components/JsonTree.tsx';
import { ReasonList } from '../components/ReasonList.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { courseOfLesson, readiness, type NotReadyReason } from '../domain/courses.ts';
import type { JsonPath } from '../domain/jsonTree.ts';
import { fetchArtifactText, useOutline, type ArtifactText } from '../data/load.ts';
import type { ArtifactFile, Course, Manifest } from '../schemas/manifest.ts';
import { validateBrief, validateContent, type Issue } from '../validation/artifacts.ts';
import type { OutlineEntry } from '../schemas/outline.ts';
import { hasContentFile, type Brief } from '../schemas/artifacts.ts';

type Slot = 'draft' | 'content';
const SECTIONS = ['outline', 'draft', 'content'] as const;

type LoadedArtifact =
  | { status: 'absent' }
  | { status: 'loading' }
  | { status: 'loadError'; error: string }
  | { status: 'parseError'; error: string; text: string }
  | { status: 'parsed'; data: unknown };

function parseArtifact(result: ArtifactText): LoadedArtifact {
  if (result.status === 'error') return { status: 'loadError', error: result.error };
  try {
    return { status: 'parsed', data: JSON.parse(result.text) };
  } catch (e) {
    return { status: 'parseError', error: (e as Error).message, text: result.text };
  }
}

function useArtifact(file: ArtifactFile | undefined): LoadedArtifact {
  const [state, setState] = useState<LoadedArtifact>(file ? { status: 'loading' } : { status: 'absent' });
  const url = file?.url;
  useEffect(() => {
    if (!url) {
      setState({ status: 'absent' });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetchArtifactText(url, ctrl.signal).then(
      (r) => setState(parseArtifact(r)),
      () => undefined,
    );
    return () => ctrl.abort();
  }, [url]);
  return state;
}

interface LessonPageProps {
  manifest: Manifest;
  lessonId: string;
  onReturnToOverview: (course: Course) => void;
}

export function LessonPage({ manifest, lessonId, onReturnToOverview }: LessonPageProps) {
  const { t } = useI18n();
  const course = courseOfLesson(manifest, lessonId);
  const outline = useOutline(course);
  const artifacts = manifest.artifacts[lessonId];
  const draft = useArtifact(artifacts?.draft);
  const content = useArtifact(artifacts?.content);
  const [mode, setMode] = useState<'structured' | 'raw'>('structured');
  const [treeOverrides, setTreeOverrides] = useState<ReadonlyMap<JsonPath, boolean>>(() => new Map());
  const [jump, setJump] = useState<(typeof SECTIONS)[number]>();

  // Jumping from Raw JSON first restores the structured view, then scrolls once its sections exist.
  useEffect(() => {
    if (!jump || mode !== 'structured') return;
    document.getElementById(`${jump}-heading`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setJump(undefined);
  }, [jump, mode]);

  const index = outline.status === 'ready' ? outline.data.entries.findIndex((e) => e.id === lessonId) : -1;
  const entry: OutlineEntry | undefined = outline.status === 'ready' ? outline.data.entries[index] : undefined;
  const reasons: NotReadyReason[] = entry ? readiness(entry.kind, artifacts) : [];

  // Validate in the browser too, so invalid files are inspectable with their problems.
  const validation = useMemo(() => {
    if (!entry || !course) return {};
    const ctx = { entry, lang: course.lang, level: course.level };
    const briefResult = draft.status === 'parsed' ? validateBrief(draft.data, ctx) : undefined;
    let contentIssues: Issue[] | undefined;
    if (content.status === 'parsed') {
      contentIssues =
        briefResult?.value && briefResult.status !== 'invalid'
          ? validateContent(content.data, { ...ctx, brief: briefResult.value }).issues
          : [{ path: '', message: 'no valid draft to check this content against' }];
    }
    return { draft: briefResult?.issues, content: contentIssues, brief: briefResult?.value };
  }, [entry, course, draft, content]);
  const ready = entry !== undefined && reasons.length === 0;

  const actions = course && (
    <>
      <a
        className="button button-outline"
        href={href.index()}
        onClick={(e) => {
          e.preventDefault();
          onReturnToOverview(course);
        }}
      >
        {t('action.lessonOverview')}
      </a>
      <button type="button" className="button button-outline" aria-pressed={mode === 'raw'} onClick={() => setMode(mode === 'raw' ? 'structured' : 'raw')}>
        {mode === 'raw' ? t('action.structuredView') : t('action.rawJson')}
      </button>
      {ready && (
        <a className="button button-primary artifact-start" href={href.play(lessonId)}>
          {t('action.startLesson')}
        </a>
      )}
      {entry && (
        <div className="header-jump" role="group" aria-label={t('detail.jumpTo')}>
          {SECTIONS.filter((section) => section !== 'content' || hasContentFile(entry.kind)).map((section) => (
            <button
              key={section}
              type="button"
              className="button button-outline"
              onClick={() => {
                setMode('structured');
                setJump(section);
              }}
            >
              {t(`artifact.${section}`)}
            </button>
          ))}
        </div>
      )}
    </>
  );

  let body: ReactNode;
  if (!course) {
    body = (
      <StatusMessage kind="error">
        {t('detail.notFound', { id: lessonId })} <a href={href.index()}>{t('action.lessonOverview')}</a>
      </StatusMessage>
    );
  } else if (outline.status === 'loading') {
    body = <StatusMessage>{t('state.loading')}</StatusMessage>;
  } else if (outline.status === 'error') {
    body = (
      <StatusMessage kind="error" onRetry={outline.retry}>
        {t('state.outlineFailed', { error: outline.error })}
      </StatusMessage>
    );
  } else if (!entry) {
    body = <StatusMessage kind="error">{t('detail.notFound', { id: lessonId })}</StatusMessage>;
  } else if (mode === 'raw') {
    body = <RawView entry={entry} draft={draft} content={content} issues={validation} overrides={treeOverrides} onOverridesChange={setTreeOverrides} />;
  } else {
    const pending = entry.kind === 'functions';
    body = (
      <>
        {pending && <StatusMessage>{t('detail.pendingCategory', { kind: t(`kind.${entry.kind}`) })}</StatusMessage>}
        {!ready && !pending && (
          <div className="note" role="note">
            <p>{t('detail.startUnavailable')}</p>
            <ReasonList reasons={reasons} />
          </div>
        )}
        <section className="artifact-section" aria-labelledby="outline-heading">
          <h2 id="outline-heading">
            <span className="section-tag">{t('artifact.outline')}</span> {t('detail.outlineHeading')}
          </h2>
          <OutlineSummary entry={entry} ordinal={index + 1} lang={course.lang} level={course.level} />
        </section>
        <ArtifactSection slot="draft" kind={entry.kind} loaded={draft} issues={validation.draft} file={artifacts?.draft} />
        {/* Vocabulary lessons consist of the brief only (P2-04): no content section. */}
        {hasContentFile(entry.kind) && <ArtifactSection slot="content" kind={entry.kind} loaded={content} issues={validation.content} file={artifacts?.content} brief={validation.brief} />}
      </>
    );
  }

  return (
    <>
      <Header
        motherTongueEditable={true}
        courseLang={course?.lang}
        title={<span className="brand">{t('app.brand')}</span>}
        actions={actions}
      />
      <main id="main" tabIndex={-1} className="page page-wide">
        <h1 lang={course?.lang}>{entry?.workingTitle ?? lessonId}</h1>
        {body}
      </main>
    </>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  const { t } = useI18n();
  return (
    <StatusMessage kind="error">
      {t('detail.invalid')}
      <ul className="reasons">
        {issues.map((i, n) => (
          <li key={n}>
            {i.path && <code>{i.path}</code>} {i.message}
          </li>
        ))}
      </ul>
    </StatusMessage>
  );
}

interface ArtifactSectionProps {
  slot: Slot;
  kind: OutlineEntry['kind'];
  loaded: LoadedArtifact;
  issues?: Issue[];
  file?: ArtifactFile;
  brief?: Brief;
}

function ArtifactSection({ slot, kind, loaded, issues, file, brief }: ArtifactSectionProps) {
  const { t } = useI18n();
  const headingId = `${slot}-heading`;
  const View = (slot === 'draft' ? draftViews : contentViews)[kind];
  let inner: ReactNode;
  switch (loaded.status) {
    case 'absent':
      inner = <p className="muted">{t(slot === 'draft' ? 'detail.missingDraft' : 'detail.missingContent')}</p>;
      break;
    case 'loading':
      inner = <p className="muted">{t('state.loading')}</p>;
      break;
    case 'loadError':
      inner = <StatusMessage kind="error">{t('detail.loadFailed', { error: loaded.error })}</StatusMessage>;
      break;
    case 'parseError':
      inner = (
        <>
          <StatusMessage kind="error">{t('detail.malformed', { error: loaded.error })}</StatusMessage>
          <pre className="raw-text">{loaded.text}</pre>
        </>
      );
      break;
    case 'parsed':
      inner = (
        <>
          {file?.status === 'stale' && <StatusMessage>{t('detail.stale')}</StatusMessage>}
          {issues && issues.length > 0 ? (
            <IssueList issues={issues} />
          ) : View ? (
            <View data={loaded.data} brief={brief} />
          ) : (
            <p className="muted">{t('detail.noStructuredView')}</p>
          )}
        </>
      );
      break;
  }
  return (
    <section className="artifact-section" aria-labelledby={headingId}>
      <h2 id={headingId}>
        <span className="section-tag">{t(`artifact.${slot}`)}</span> {t(slot === 'draft' ? 'detail.draftHeading' : 'detail.contentHeading')}
      </h2>
      {inner}
    </section>
  );
}

interface RawViewProps {
  entry: OutlineEntry;
  draft: LoadedArtifact;
  content: LoadedArtifact;
  issues: { draft?: Issue[]; content?: Issue[] };
  overrides: ReadonlyMap<JsonPath, boolean>;
  onOverridesChange: (next: ReadonlyMap<JsonPath, boolean>) => void;
}

/** View wrapper { outline, draft?, content? } with each parsed file unchanged. */
function RawView({ entry, draft, content, issues, overrides, onOverridesChange }: RawViewProps) {
  const { t } = useI18n();
  const root: Record<string, unknown> = { outline: entry };
  if (draft.status === 'parsed') root.draft = draft.data;
  if (content.status === 'parsed') root.content = content.data;
  const diagnostics = (
    [
      ['draft', draft],
      ['content', content],
    ] as const
  ).filter(([, a]) => a.status === 'parseError' || a.status === 'loadError');
  return (
    <section aria-label={t('action.rawJson')}>
      <p className="muted">{t('raw.hint')}</p>
      <JsonTree value={root} rootLabel={t('raw.rootLabel')} overrides={overrides} onOverridesChange={onOverridesChange} />
      {(['draft', 'content'] as const).map(
        (slot) =>
          issues[slot] &&
          issues[slot].length > 0 && (
            <div key={`issues-${slot}`} className="diagnostic">
              <p>{t(`artifact.${slot}`)}</p>
              <IssueList issues={issues[slot]} />
            </div>
          ),
      )}
      {diagnostics.map(([slot, a]) => (
        <div key={slot} className="diagnostic">
          {a.status === 'parseError' ? (
            <>
              <p>{t('raw.parseError', { artifact: t(`artifact.${slot}`), error: a.error })}</p>
              <pre className="raw-text">{a.text}</pre>
            </>
          ) : (
            a.status === 'loadError' && <StatusMessage kind="error">{t('detail.loadFailed', { error: a.error })}</StatusMessage>
          )}
        </div>
      ))}
    </section>
  );
}
