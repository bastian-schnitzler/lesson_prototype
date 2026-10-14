import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import { examKindKey, outlineGroups, type OutlineGroup, type OutlineState } from '../domain/session/outline.ts';
import type { LessonPlan } from '../domain/session/plan.ts';
import type { SessionRecord } from '../domain/session/session.ts';
import type { MessageKey } from '../i18n/messages.ts';

/**
 * Lesson outline (P6-01, V2 timeline). On wide screens a fixed column; on small screens a compact
 * outline opened on demand by the Outline button. State is a mark plus a word, never colour alone.
 */
const COLLAPSED_KEY = 'lesson-prototype:outline-collapsed';
const MARK: Record<OutlineState, string> = { current: '●', done: '✓', available: '○', locked: '–' };
const STATE_KEY: Record<OutlineState, MessageKey> = { current: 'sidebar.current', done: 'sidebar.done', available: 'sidebar.available', locked: 'sidebar.locked' };

/** Shared frame: fixed column on wide screens, on-demand outline with Escape/focus return on small ones. */
export function SidebarShell({ toggleLabel, heading, children }: { toggleLabel: string; heading?: string; children: (close: () => void) => ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  // Wide screens: the outline retracts to a slim rail; the choice is a per-viewer convenience kept in the browser.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; } });
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '0' : '1'); } catch { /* storage unavailable: the choice lasts for this page only */ }
  };
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => { setOpen(false); toggle.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label={t('sidebar.title')}>
      <button type="button" className="sidebar-collapse" aria-expanded={!collapsed} aria-controls={id} aria-label={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')} title={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')} onClick={toggleCollapsed}>
        <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
      </button>
      <button ref={toggle} type="button" className="button button-outline sidebar-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {toggleLabel}
      </button>
      <nav id={id} className={`sidebar-panel${open ? ' is-open' : ''}`} aria-label={t('sidebar.title')}>
        <p className="sidebar-title">{heading ?? t('sidebar.title')}</p>
        <div className="sidebar-scroll">{children(() => setOpen(false))}</div>
      </nav>
    </aside>
  );
}

export interface ResultsEntry { key: string; label: string; score: string; nested?: boolean; /** ' is-all-right' | ' is-all-wrong' | ' is-mixed' (P4-05 colours) */ tone?: string }

/** Results sidebar (P6-01): choosing an entry shows only that part; scores are never recomputed. */
export function ResultsSidebar({ entries, selected, onSelect }: { entries: ResultsEntry[]; selected: string; onSelect: (key: string) => void }) {
  const { t } = useI18n();
  return (
    <SidebarShell toggleLabel={t('sidebar.toggle')} heading={t('sidebar.results')}>
      {(close) => (
        <ol className="sidebar-list">
          {entries.map((e) => (
            <li key={e.key} className={`sidebar-item${e.key === selected ? ' is-current' : ''}${e.nested ? ' is-nested' : ''}`}>
              <button type="button" className={`sidebar-link${e.tone ?? ''}`} aria-current={e.key === selected ? 'true' : undefined} onClick={() => { onSelect(e.key); close(); }}>
                <span className="sidebar-text results-row"><span className="sidebar-label">{e.label}</span><small>{e.score}</small></span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </SidebarShell>
  );
}

export function LessonSidebar({ plan, record, onNavigate }: { plan: LessonPlan; record: SessionRecord; onNavigate: (pageIndex: number) => void }) {
  const { t, locale } = useI18n();
  const all = outlineGroups(plan, record);
  // While the exam runs the outline shows the exam pages only (D53): earlier parts are finished and locked.
  const groups = record.status === 'active' && plan.pages[record.pageIndex]?.role === 'exam' ? all.filter((g) => g.role === 'exam') : all;
  const current = groups.findIndex((g) => g.state === 'current');
  const examRunning = record.status === 'active' && plan.pages[record.pageIndex]?.role === 'exam';
  const points = groups.filter((g) => g.role === 'presentation').length;
  const examPages = groups.filter((g) => g.role === 'exam');
  const minutes = (s: number) => (s % 60 ? t('unit.minutesSeconds', { m: Math.floor(s / 60), s: s % 60 }) : t('unit.minutes', { n: s / 60 }));
  const limit = (g: OutlineGroup) => (g.timeLimitS ? minutes(g.timeLimitS) : '');
  const seenLabels = new Set<string>();
  let examNumber = 0;
  const labelOf = (g: OutlineGroup) => {
    const page = plan.pages[g.pageIndex];
    const base = g.label[locale];
    if (g.role === 'exam') {
      if (!examRunning) return t('session.examPage');
      // "Translation 1/2", "Dictation 2/2": the kind of the page, numbered within its kind.
      const kind = examKindKey(page);
      const same = examPages.filter((x) => examKindKey(plan.pages[x.pageIndex]) === kind);
      examNumber = same.indexOf(g) + 1;
      return same.length > 1 ? `${t(kind)} ${examNumber}/${same.length}` : t(kind);
    }
    if (g.role === 'presentation') {
      // Vocabulary introductions and flashcards are named after their word group when there are several.
      const item = page.items[0];
      const group = item && 'targetIds' in item && plan.groups.length > 1 ? plan.groups.find((x) => item.targetIds.every((id) => x.targetIds.includes(id))) : undefined;
      const label = group ? `${base} · ${group.label[locale]}` : base;
      seenLabels.add(base);
      return label;
    }
    return seenLabels.has(base) ? `${base} · ${t('sidebar.exercises')}` : base;
  };
  const labels = groups.map(labelOf);
  const meta = (g: OutlineGroup) => {
    if (g.role === 'exam') return limit(g);
    return g.pageCount > 1 ? t('sidebar.pages', { count: g.pageCount }) : '';
  };
  const heading = examRunning ? t('sidebar.examPages', { count: examPages.length }) : t('sidebar.points', { count: points });

  return (
    <SidebarShell toggleLabel={`${t('sidebar.toggle')} ${current + 1}/${groups.length}`} heading={heading}>
      {(close) => (
        <>
          <ol className="sidebar-list">
            {groups.map((g, i) => {
              const content = (
                <>
                  <span className="sidebar-mark" aria-hidden="true">{MARK[g.state]}</span>
                  <span className="sidebar-text">
                    <span className="sidebar-label">{labels[i]}</span>
                    {meta(g) && <small>{meta(g)}</small>}
                    <small className="sidebar-state">{t(STATE_KEY[g.state])}</small>
                  </span>
                </>
              );
              return (
                <li key={g.pageId} className={`sidebar-item is-${g.state}${g.role === 'exam' ? ' is-exam' : ''}`}>
                  {g.navigable ? (
                    <button type="button" className="sidebar-link" onClick={() => { onNavigate(g.pageIndex); close(); }}>{content}</button>
                  ) : (
                    <span className="sidebar-link" aria-current={g.state === 'current' ? 'step' : undefined} aria-disabled={g.state === 'locked' || undefined}>{content}</span>
                  )}
                </li>
              );
            })}
          </ol>
          {examRunning && <p className="muted sidebar-note">{t('sidebar.exam')}</p>}
        </>
      )}
    </SidebarShell>
  );
}
