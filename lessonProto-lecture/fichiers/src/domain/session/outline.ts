import type { MessageKey } from '../../i18n/messages.ts';
import type { LocalizedText } from '../../schemas/artifactCommon.ts';
import type { LessonPlan, PageRole } from './plan.ts';
import { canNavigate, viewedIndex, type SessionRecord } from './session.ts';

/**
 * Sidebar outline (SPEC section 5, P6-01): one entry per learner page with a state that never relies
 * on colour alone. Derived from the plan and the record, so it survives reload and language changes.
 */
export type OutlineState = 'current' | 'done' | 'available' | 'locked';

export interface OutlineEntry {
  pageIndex: number;
  pageId: string;
  stepId: string;
  label: LocalizedText;
  role: PageRole;
  state: OutlineState;
  /** True when the sidebar may jump here; exam pages are never navigable. */
  navigable: boolean;
  /** Answer units on the page (exam pages show question counts). */
  questionCount: number;
  /** Exam countdown length; null on pages without one. */
  timeLimitS: number | null;
}

/** Message key naming what an exam page asks: translation, dictation, questions on a document or mixed questions. */
export function examKindKey(page: { units: { itemType: string }[]; items?: { type: string }[] }): MessageKey {
  const types = new Set(page.units.map((u) => u.itemType));
  if (types.size === 1 && types.has('vocabulary_translation_exam')) return 'examIntro.translation';
  if (types.size === 1 && types.has('vocabulary_listening_dictation')) return 'examIntro.dictation';
  if (page.items?.some((item) => item.type === 'reading_document')) return 'examIntro.reading';
  return 'examIntro.mixed';
}

export function outline(plan: LessonPlan, r: SessionRecord): OutlineEntry[] {
  const viewed = viewedIndex(r);
  return plan.pages
    .filter((p) => !(r.skippedNoVoice ?? []).includes(p.pageId))
    .map((p) => {
      const done = r.completed.includes(p.pageId);
      const state: OutlineState = r.status === 'completed' ? 'done' : p.index === viewed ? 'current' : done ? 'done' : p.index === r.pageIndex && r.status === 'active' ? 'available' : 'locked';
      return {
        pageIndex: p.index, pageId: p.pageId, stepId: p.stepId, label: p.stepLabel, role: p.role, state,
        navigable: p.index !== viewed && canNavigate(plan, r, p.index),
        questionCount: p.units.length, timeLimitS: p.timeLimitS,
      };
    });
}

/**
 * Compact outline shown in the sidebar: every theory page is its own point; consecutive pages of one
 * exercise step collapse into one entry (twelve typed gaps are one "Practice" row), and the final exam is
 * one row until it starts, then lists its pages with question counts and limits (D50).
 */
export interface OutlineGroup extends OutlineEntry {
  /** Pages the entry stands for. */
  pageCount: number;
  /** Sum of the page limits of a collapsed exam; the page limit for a single exam page. */
  timeLimitS: number | null;
}

export function outlineGroups(plan: LessonPlan, r: SessionRecord): OutlineGroup[] {
  const entries = outline(plan, r);
  const viewed = viewedIndex(r);
  const examRunning = r.status === 'active' && plan.pages[r.pageIndex]?.role === 'exam';
  const groups: OutlineGroup[] = [];
  // The exam information page belongs to the exam row, not to the points to learn.
  let intro: OutlineEntry | undefined;
  for (const e of entries) {
    if (plan.pages[e.pageIndex].special === 'examIntro') { intro = e; continue; }
    const collapse = e.role === 'practice' || (e.role === 'exam' && !examRunning);
    const last = groups[groups.length - 1];
    if (collapse && last && last.stepId === e.stepId && last.role === e.role) {
      last.pageCount += 1;
      last.questionCount += e.questionCount;
      last.timeLimitS = last.timeLimitS === null && e.timeLimitS === null ? null : (last.timeLimitS ?? 0) + (e.timeLimitS ?? 0);
      // The group is current when it holds the viewed page; done only when every page is.
      const states = [last.state, e.state];
      last.state = states.includes('current') ? 'current' : states.every((s) => s === 'done') ? 'done' : states.includes('available') ? 'available' : states.includes('done') ? 'available' : 'locked';
      last.navigable = last.navigable || e.navigable;
      continue;
    }
    groups.push({ ...e, pageCount: 1, state: intro?.state === 'current' && e.role === 'exam' && !examRunning ? 'current' : e.state });
  }
  // A group is only navigable when it is a single theory page, or holds the active page while a theory page is revisited.
  return groups.map((g) => {
    const holdsActive = viewed !== r.pageIndex && entries.some((e) => e.stepId === g.stepId && e.role === g.role && e.pageIndex === r.pageIndex) && g.role !== 'presentation' && g.state !== 'current';
    return { ...g, navigable: g.pageCount === 1 ? g.navigable : holdsActive && canNavigate(plan, r, r.pageIndex), pageIndex: holdsActive ? r.pageIndex : g.pageIndex };
  });
}
