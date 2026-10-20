import type { LessonPlan, PlanPage } from './plan.ts';
import { SKIMMED } from './readingPlan.ts';
import type { SessionRecord } from './session.ts';

/**
 * Play-test times per page (P5-05): when a page was entered, first checked (its first answer locked),
 * when a skimmed document was put away, and when the page was left. The reducer records them for every
 * category; they never change scores, progress or deadlines. Records saved before P5-05 have none.
 */
export interface PageTime {
  enteredAt: number;
  checkedAt?: number;
  skimmedAt?: number;
  leftAt?: number;
}

/** Adds the time stamps that the step from `prev` to `next` produced (a pure update, like the reducer). */
export function trackPageTimes(plan: LessonPlan, prev: SessionRecord, next: SessionRecord, now: number): SessionRecord {
  const page = plan.pages[prev.pageIndex];
  if (!page) return next;
  const times = { ...(prev.pageTimes ?? {}) };
  const current: PageTime = { ...(times[page.pageId] ?? { enteredAt: prev.updatedAt }) };
  if (current.checkedAt === undefined && page.units.some((u) => next.locked[u.id] && !prev.locked[u.id])) current.checkedAt = now;
  if (current.skimmedAt === undefined && Object.entries(next.revealed ?? {}).some(([key, seen]) => key.startsWith(`${page.pageId}/`) && seen.includes(SKIMMED))) current.skimmedAt = now;
  const left = next.pageIndex !== prev.pageIndex || next.status !== prev.status;
  if (left) current.leftAt = now;
  times[page.pageId] = current;
  const entered = plan.pages[next.pageIndex];
  if (left && next.status === 'active' && entered && !times[entered.pageId]) times[entered.pageId] = { enteredAt: now };
  return { ...next, pageTimes: times };
}

export interface PageTimeRow {
  pageId: string;
  /** 1-based page number in the plan, the exam info page included. */
  number: number;
  stepId: string;
  role: PlanPage['role'];
  estimatedS: number;
  /** Seconds from entering to leaving the page; undefined while it is open or for older records. */
  actualS?: number;
  /** Reading skim pages: the stored skim time and the seconds the document was actually open. */
  skimSeconds?: number;
  skimUsedS?: number;
  /** Seconds from entering (or from putting the document away) to the first Check. */
  answerS?: number;
}

const seconds = (from: number | undefined, to: number | undefined) => (from !== undefined && to !== undefined ? Math.round((to - from) / 100) / 10 : undefined);

/** One row per page of the plan, in order, for the play-test table and its JSON download. */
export function pageTimeRows(plan: LessonPlan, r: SessionRecord): PageTimeRow[] {
  return plan.pages.map((page, n) => {
    const time = r.pageTimes?.[page.pageId];
    const skim = page.items.find((it) => it.type === 'reading_document' && it.view === 'skim');
    return {
      pageId: page.pageId, number: n + 1, stepId: page.stepId, role: page.role, estimatedS: page.estimatedDurationS,
      actualS: seconds(time?.enteredAt, time?.leftAt),
      ...(skim?.type === 'reading_document' ? { skimSeconds: skim.skimSeconds ?? undefined, skimUsedS: seconds(time?.enteredAt, time?.skimmedAt) } : {}),
      answerS: seconds(time?.skimmedAt ?? time?.enteredAt, time?.checkedAt),
    };
  });
}

/** The JSON a play tester sends back: the attempt, then the rows. */
export function pageTimesExport(plan: LessonPlan, r: SessionRecord) {
  return {
    lessonId: r.lessonId, level: r.level, contentHash: r.contentHash, motherTongue: r.motherTongue,
    startedAt: new Date(r.startedAt).toISOString(), status: r.status, pages: pageTimeRows(plan, r),
  };
}
