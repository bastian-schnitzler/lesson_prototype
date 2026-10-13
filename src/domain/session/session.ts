import type { Locale } from '../../schemas/common.ts';
import { classifyAnswer, normalizeAnswer, type AnswerOutcome } from '../answers.ts';
import type { LessonPlan, PlanPage, PlanUnit } from './plan.ts';

/**
 * Session record and pure reducer (SPEC section 5). Time is passed in by the caller,
 * so tests use a fake clock and resume recomputes everything from absolute deadlines.
 */
export type UnitResponse = string | string[] | { tokenId: string; text: string };

export interface LockedUnit {
  response: UnitResponse | null;
  outcome: AnswerOutcome;
  points: number;
  timedOut: boolean;
  /** Interface language when the answer was submitted. */
  interfaceLanguage: Locale;
}

export interface SessionRecord {
  version: 1;
  sessionId: string;
  lessonId: string;
  /** Hash of the content file; a different hash cannot resume this attempt. */
  contentHash: string;
  lang: string;
  level: string;
  /** Captured at start; immutable for the attempt. */
  motherTongue: Locale;
  /** Shuffles matching sides, choices and token banks the same way on resume and in results. */
  seed: number;
  startedAt: number;
  updatedAt: number;
  status: 'active' | 'completed';
  pageIndex: number;
  phase: 'answering' | 'feedback' | 'results';
  completed: string[];
  /** Listening pages skipped because no learning-language voice was available. */
  skippedNoVoice: string[];
  /** Presentation progress that must survive resume, e.g. revealed flashcards: `${pageId}/${itemId}` → keys. */
  revealed: Record<string, string[]>;
  drafts: Record<string, UnitResponse>;
  locked: Record<string, LockedUnit>;
  exam: Record<string, { startedAt: number; deadline: number; timedOut: boolean }>;
  /** Results menu: 'exam' or a step ID. */
  selection: string;
  /** Read-only revisit of an earlier theory page (P6-01); absent while the learner is on `pageIndex`. */
  viewIndex?: number;
}

export const POLICY = { practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 } as const;

/* ---------------------------------------------------------------- scoring */

export function isAnswered(unit: PlanUnit, response: UnitResponse | undefined | null): boolean {
  if (response === undefined || response === null) return false;
  switch (unit.kind) {
    case 'text': return typeof response === 'string' && normalizeAnswer(response) !== '';
    case 'choice': return typeof response === 'string' && response !== '';
    case 'order': return Array.isArray(response) && response.length === unit.tokens.length;
    case 'spot': return typeof response === 'object' && !Array.isArray(response) && !!response.tokenId && normalizeAnswer(response.text) !== '';
  }
}

/** First-submission scoring of one answer unit: 1, 0.5 (orthography only, text) or 0 points. */
export function scoreUnit(unit: PlanUnit, response: UnitResponse | undefined | null): { outcome: AnswerOutcome; points: number } {
  if (!isAnswered(unit, response)) return { outcome: 'unanswered', points: 0 };
  const right = (ok: boolean) => (ok ? { outcome: 'fully_correct' as const, points: 1 } : { outcome: 'incorrect' as const, points: 0 });
  switch (unit.kind) {
    case 'text': {
      const c = classifyAnswer(response as string, unit.accepted);
      return { outcome: c.outcome, points: c.credit };
    }
    case 'choice': return right(unit.correct.includes(response as string));
    case 'order': {
      const order = response as string[];
      const text = (ids: string[]) => ids.map((id) => unit.tokens.find((t) => t.id === id)?.text).join(' ');
      // Repeated words have distinct tokens: compare the sentence, not token identity.
      return right(unit.acceptedOrders.some((o) => text(o) === text(order)));
    }
    case 'spot': {
      const r = response as { tokenId: string; text: string };
      if (r.tokenId !== unit.faultyTokenId) return { outcome: 'incorrect', points: 0 };
      const c = classifyAnswer(r.text, unit.correction.accepted);
      return unit.correction.mode === 'select' ? right(c.outcome === 'fully_correct') : { outcome: c.outcome, points: c.credit };
    }
  }
}

/* ---------------------------------------------------------------- reducer */

export type SessionAction =
  | { type: 'draft'; unitId: string; response: UnitResponse; now: number }
  | { type: 'continue'; now: number; interfaceLanguage: Locale }
  | { type: 'expire'; now: number; interfaceLanguage: Locale }
  | { type: 'voice_ready'; now: number }
  | { type: 'skip_no_voice'; now: number }
  | { type: 'reveal'; itemKey: string; key: string; now: number }
  | { type: 'select'; selection: string }
  | { type: 'navigate'; pageIndex: number };

/** Page the learner currently sees: a revisited theory page, else the active one. */
export const viewedIndex = (r: Pick<SessionRecord, 'pageIndex' | 'viewIndex'>): number => r.viewIndex ?? r.pageIndex;

/**
 * Sidebar navigation (P6-01) only revisits completed theory pages, and never while an exam page is
 * active, so it cannot bypass sequential submission, expose answers or touch a countdown. The
 * active page itself is always a valid target (it ends the revisit).
 */
export function canNavigate(plan: LessonPlan, r: SessionRecord, target: number): boolean {
  if (r.status !== 'active' || r.phase === 'results') return false;
  const current = plan.pages[r.pageIndex];
  const page = plan.pages[target];
  if (!current || !page || current.role === 'exam') return false;
  if (target === r.pageIndex) return true;
  return target < r.pageIndex && page.role === 'presentation' && r.completed.includes(page.pageId);
}

export function startSession(plan: LessonPlan, init: { sessionId: string; contentHash: string; level: string; motherTongue: Locale; seed: number; now: number }): SessionRecord {
  const record: SessionRecord = {
    version: 1, sessionId: init.sessionId, lessonId: plan.lessonId, contentHash: init.contentHash, lang: plan.lang, level: init.level,
    motherTongue: init.motherTongue, seed: init.seed, startedAt: init.now, updatedAt: init.now, status: 'active',
    pageIndex: 0, phase: 'answering', completed: [], skippedNoVoice: [], revealed: {}, drafts: {}, locked: {}, exam: {}, selection: 'exam',
  };
  return activate(plan, record, init.now);
}

/** Starts the countdown of an exam page when it becomes active; an existing deadline is kept. */
function activate(plan: LessonPlan, r: SessionRecord, now: number): SessionRecord {
  const page = plan.pages[r.pageIndex];
  if (!page || page.role !== 'exam' || isListeningPage(page) || r.exam[page.pageId]) return r;
  return { ...r, exam: { ...r.exam, [page.pageId]: { startedAt: now, deadline: now + (page.timeLimitS ?? 0) * 1000, timedOut: false } } };
}

/**
 * Practice pages whose correct answers need no confirmation view: matching, and every page whose
 * items each ask for exactly one answer (typed gap, listening choice, multiple choice, one typed
 * word, word order, error spot). Pages with several answers per item (gender rows, conjugation
 * tables) keep their checked view.
 */
export function skipsFeedbackWhenCorrect(page: PlanPage): boolean {
  return page.role === 'practice' && page.items.length > 0
    && page.items.every((item) => item.type === 'vocabulary_matching' || item.type === 'grammar_person_matching' || page.units.filter((u) => u.itemId === item.itemId).length === 1);
}

/** Such pages answered fully correctly go straight on (after a green flash); feedback would only repeat the answers. */
export function skipsFeedback(page: PlanPage, r: Pick<SessionRecord, 'locked'>): boolean {
  return skipsFeedbackWhenCorrect(page) && page.units.every((u) => r.locked[u.id]?.outcome === 'fully_correct');
}

/** Flashcard pages complete once every card was revealed (P2-02); other presentation pages at once. */
export function presentationComplete(page: PlanPage, r: Pick<SessionRecord, 'revealed'>): boolean {
  return page.items.every((item) => item.type !== 'vocabulary_flashcards' || item.targetIds.every((id) => (r.revealed?.[`${page.pageId}/${item.itemId}`] ?? []).includes(id)));
}

export function isListeningPage(page: PlanPage): boolean {
  return page.units.length > 0 && page.units.every((u) => u.itemType === 'vocabulary_listening_choice' || u.itemType === 'vocabulary_listening_dictation');
}

function lockPage(page: PlanPage, r: SessionRecord, interfaceLanguage: Locale, timedOut: boolean): SessionRecord {
  const locked = { ...r.locked };
  for (const unit of page.units) {
    if (locked[unit.id]) continue;
    const response = r.drafts[unit.id] ?? null;
    locked[unit.id] = { response, ...scoreUnit(unit, response), timedOut, interfaceLanguage };
  }
  return { ...r, locked };
}

function advance(plan: LessonPlan, r: SessionRecord, now: number): SessionRecord {
  const page = plan.pages[r.pageIndex];
  const completed = r.completed.includes(page.pageId) ? r.completed : [...r.completed, page.pageId];
  if (r.pageIndex + 1 >= plan.pages.length) return { ...r, completed, status: 'completed', phase: 'results', selection: 'exam' };
  return activate(plan, { ...r, completed, pageIndex: r.pageIndex + 1, phase: 'answering' }, now);
}

export function sessionReducer(plan: LessonPlan, r: SessionRecord, action: SessionAction): SessionRecord {
  if (action.type === 'select') return r.phase === 'results' ? { ...r, selection: action.selection } : r;
  if (action.type === 'navigate') {
    if (!canNavigate(plan, r, action.pageIndex)) return r;
    const { viewIndex: _, ...rest } = r;
    return action.pageIndex === r.pageIndex ? rest : { ...rest, viewIndex: action.pageIndex };
  }
  if (r.status !== 'active') return r;
  if (r.viewIndex !== undefined) {
    // While revisiting, only Continue acts: it steps to the next revisitable page or back to the active one.
    if (action.type !== 'continue') return r;
    const { viewIndex, ...rest } = r;
    const next = plan.pages.findIndex((p, i) => i > viewIndex && i < r.pageIndex && p.role === 'presentation' && r.completed.includes(p.pageId));
    return next >= 0 ? { ...rest, viewIndex: next } : rest;
  }
  const page = plan.pages[r.pageIndex];
  const now = action.now;
  const deadline = page.role === 'exam' ? r.exam[page.pageId]?.deadline : undefined;
  const expired = deadline !== undefined && now >= deadline;
  let next: SessionRecord;
  switch (action.type) {
    case 'draft': {
      const unit = page.units.find((u) => u.id === action.unitId);
      // Locked answers are immutable; input after an exam deadline is ignored.
      if (!unit || r.phase !== 'answering' || r.locked[unit.id] || expired) return r;
      next = { ...r, drafts: { ...r.drafts, [unit.id]: action.response } };
      break;
    }
    case 'voice_ready':
      if (!isListeningPage(page) || page.role !== 'exam' || r.exam[page.pageId]) return r;
      next = { ...r, exam: { ...r.exam, [page.pageId]: { startedAt: now, deadline: now + (page.timeLimitS ?? 0) * 1000, timedOut: false } } };
      break;
    case 'reveal': {
      // Only items of the active page; repeated reveals are no-ops.
      const seen = r.revealed?.[action.itemKey] ?? [];
      if (!page.items.some((it) => `${page.pageId}/${it.itemId}` === action.itemKey) || seen.includes(action.key)) return r;
      next = { ...r, revealed: { ...r.revealed, [action.itemKey]: [...seen, action.key] } };
      break;
    }
    case 'skip_no_voice':
      if (!isListeningPage(page) || r.phase !== 'answering') return r;
      next = advance(plan, { ...r, skippedNoVoice: [...(r.skippedNoVoice ?? []), page.pageId] }, now);
      break;
    case 'expire':
      if (!expired || r.phase !== 'answering') return r;
      next = advance(plan, { ...lockPage(page, r, action.interfaceLanguage, true), exam: { ...r.exam, [page.pageId]: { ...r.exam[page.pageId], timedOut: true } } }, now);
      break;
    case 'continue':
      if (page.role === 'presentation') {
        if (!presentationComplete(page, r)) return r;
        next = advance(plan, r, now);
      }
      else if (page.role === 'exam') {
        if (isListeningPage(page) && deadline === undefined) return r;
        if (expired) return sessionReducer(plan, r, { type: 'expire', now, interfaceLanguage: action.interfaceLanguage });
        next = advance(plan, lockPage(page, r, action.interfaceLanguage, false), now);
      } else if (r.phase === 'answering') {
        if (!page.units.every((u) => isAnswered(u, r.drafts[u.id]))) return r;
        const locked = lockPage(page, r, action.interfaceLanguage, false);
        // A fully correct matching page skips its correction view (P2-02); other pages show feedback.
        next = skipsFeedback(page, locked) ? advance(plan, locked, now) : { ...locked, phase: 'feedback' };
      } else next = advance(plan, r, now);
      break;
  }
  return { ...next, updatedAt: now };
}

/* ----------------------------------------------------------- aggregates */

/** Duration-weighted progress over concrete learner pages; 100 once results are shown. */
export function progress(plan: LessonPlan, r: SessionRecord): number {
  if (r.status === 'completed') return 100;
  const included = plan.pages.filter((p) => !(r.skippedNoVoice ?? []).includes(p.pageId));
  const total = included.reduce((s, p) => s + p.estimatedDurationS, 0);
  const done = included.filter((p) => r.completed.includes(p.pageId)).reduce((s, p) => s + p.estimatedDurationS, 0);
  return total ? (100 * done) / total : 0;
}

export interface Tally { earned: number; possible: number }
const tally = (units: PlanUnit[], r: SessionRecord): Tally => ({
  earned: units.reduce((s, u) => s + (r.locked[u.id]?.points ?? 0), 0),
  possible: units.length,
});
const unitsWhere = (plan: LessonPlan, role: 'practice' | 'exam', r: SessionRecord) => plan.pages.filter((p) => p.role === role && !(r.skippedNoVoice ?? []).includes(p.pageId)).flatMap((p) => p.units);
export const percent = (t: Tally) => (t.possible ? (100 * t.earned) / t.possible : 0);

/**
 * Header score out of 100 weighted lesson points: practice credit accumulates as pages lock;
 * the exam contribution stays hidden until the exam is complete (D16).
 */
export function headerScore(plan: LessonPlan, r: SessionRecord): number {
  if (r.status === 'completed') return lessonResults(plan, r).total;
  const practice = tally(unitsWhere(plan, 'practice', r), r);
  const p = practice.possible ? (POLICY.practiceWeight * practice.earned) / practice.possible : 0;
  return p; // Exam credit is sealed until completion, handled above.
}

export interface LessonResults {
  practice: Tally;
  exam: Tally;
  practiceScore: number;
  examScore: number;
  /** 0.35 × practice score + 0.65 × exam score; a lesson without practice units weights the exam fully. */
  total: number;
  steps: { stepId: string; role: 'practice' | 'exam' | 'presentation'; tally: Tally; completed: boolean }[];
}

export function lessonResults(plan: LessonPlan, r: SessionRecord): LessonResults {
  const practice = tally(unitsWhere(plan, 'practice', r), r);
  const exam = tally(unitsWhere(plan, 'exam', r), r);
  const practiceScore = percent(practice);
  const examScore = percent(exam);
  const total = practice.possible && exam.possible
    ? (POLICY.practiceWeight * practiceScore + POLICY.examWeight * examScore) / 100
    : practice.possible ? practiceScore : examScore;
  return {
    practice, exam, practiceScore, examScore, total,
    steps: plan.steps.map((s) => {
      const pages = plan.pages.filter((p) => p.stepId === s.stepId && !(r.skippedNoVoice ?? []).includes(p.pageId));
      return { stepId: s.stepId, role: s.role, tally: tally(pages.flatMap((p) => p.units), r), completed: pages.every((p) => r.completed.includes(p.pageId)) };
    }),
  };
}
