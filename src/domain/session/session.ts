import type { Locale } from '../../schemas/common.ts';
import { classifyAnswer, normalizeAnswer, type AnswerOutcome } from '../answers.ts';
import type { Item, LessonPlan, PlanPage, PlanUnit } from './plan.ts';

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
  /** Gender chosen after a "des" + plural answer (P4-05 review). */
  gender?: string;
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
  /** Results sidebar: 'exam', an exam part ('exam:translation', 'exam:dictation'…) or a step ID. */
  selection: string;
  /** Read-only revisit of an earlier theory page (P6-01); absent while the learner is on `pageIndex`. */
  viewIndex?: number;
}

/** Default weights of vocabulary and grammar lessons; a lesson's plan carries the weights of its brief (reading 30/70). */
export const POLICY = { practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 } as const;

/** Item types shown as a two-column matching board: checked in place, and a fully correct board skips its feedback. */
export const MATCHING_TYPES: ReadonlySet<Item['type']> = new Set(['vocabulary_matching', 'grammar_person_matching', 'function_matching', 'reading_keyword_matching', 'reading_part_heading_matching']);

/* ---------------------------------------------------------------- scoring */

export function isAnswered(unit: PlanUnit, response: UnitResponse | undefined | null): boolean {
  if (response === undefined || response === null) return false;
  switch (unit.kind) {
    case 'text': return typeof response === 'string' && normalizeAnswer(response) !== '';
    case 'choice': return typeof response === 'string' && response !== '';
    // With distractors not every token is placed; otherwise the sentence uses every token.
    case 'order': return Array.isArray(response) && (unit.distractors?.length ? response.length > 0 : response.length === unit.tokens.length);
    case 'spot': return typeof response === 'object' && !Array.isArray(response) && !!response.tokenId && normalizeAnswer(response.text) !== '';
  }
}

/** A typed answer that starts with "des" and a word: then the gender choice is shown (P4-05 review). */
export function isPluralAnswer(response: UnitResponse | undefined | null): boolean {
  return typeof response === 'string' && /^des\s+\S/iu.test(response.trim());
}

/** First-submission scoring of one answer unit: 1, 0.5 (orthography only, text) or 0 points. */
export function scoreUnit(unit: PlanUnit, response: UnitResponse | undefined | null, gender?: string): { outcome: AnswerOutcome; points: number } {
  if (!isAnswered(unit, response)) return { outcome: 'unanswered', points: 0 };
  const right = (ok: boolean) => (ok ? { outcome: 'fully_correct' as const, points: 1 } : { outcome: 'incorrect' as const, points: 0 });
  switch (unit.kind) {
    case 'text': {
      const c = classifyAnswer(response as string, unit.accepted);
      // A plurale tantum answered with "des" counts only with the right gender (P4-05 review).
      if (c.outcome !== 'incorrect' && unit.noun?.pluraleTantum && isPluralAnswer(response) && !(gender && unit.noun.genders.includes(gender))) return { outcome: 'incorrect', points: 0 };
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
  | { type: 'select'; selection: string };

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
 * Practice pages whose correct answers need no confirmation view: matching, typed pronoun forms (P4-05
 * review: all right → green flash and on), and every page whose
 * items each ask for exactly one answer (typed gap, listening choice, multiple choice, one typed
 * word, word order, error spot). Pages with several answers per item (gender rows, conjugation
 * tables) keep their checked view.
 */
export function skipsFeedbackWhenCorrect(page: PlanPage): boolean {
  return page.role === 'practice' && page.items.length > 0
    && page.items.every((item) => isMatchingItem(item.type) || item.type === 'grammar_pronoun_form_typing' || page.units.filter((u) => u.itemId === item.itemId).length === 1);
}

/** Items shown on the matching board: vocabulary, person (P3-02 review), function (P4-04) and reading matching. */
export function isMatchingItem(type: string): boolean {
  return (MATCHING_TYPES as ReadonlySet<string>).has(type);
}

/** Such pages answered fully correctly go straight on (after a green flash); feedback would only repeat the answers. */
export function skipsFeedback(page: PlanPage, r: Pick<SessionRecord, 'locked'>): boolean {
  return skipsFeedbackWhenCorrect(page) && page.units.every((u) => r.locked[u.id]?.outcome === 'fully_correct');
}

/**
 * Presentation keys a page needs before Continue: every flashcard turned once (P2-02, function cards
 * P4-04) and every line of a function dialogue shown (the first line is shown from the start).
 */
export function requiredReveals(page: PlanPage): { itemKey: string; keys: string[] }[] {
  return page.items.flatMap((item) => {
    const itemKey = `${page.pageId}/${item.itemId}`;
    if (item.type === 'vocabulary_flashcards') return [{ itemKey, keys: item.targetIds }];
    if (item.type === 'function_flashcards') return [{ itemKey, keys: item.ids }];
    if (item.type === 'function_dialogue') return [{ itemKey, keys: item.lines.slice(1).map((l) => l.lineId) }];
    return [];
  });
}

/** Flashcard and dialogue pages complete once everything was revealed; other presentation pages at once. */
export function presentationComplete(page: PlanPage, r: Pick<SessionRecord, 'revealed'>): boolean {
  return requiredReveals(page).every(({ itemKey, keys }) => keys.every((key) => (r.revealed?.[itemKey] ?? []).includes(key)));
}

/** The next hidden line of a function dialogue or exam dialogue (SPEC section 8): Next line reveals it. */
export function nextDialogueLine(page: PlanPage, r: Pick<SessionRecord, 'revealed'>): { itemKey: string; key: string } | undefined {
  for (const item of page.items) {
    if (item.type !== 'function_dialogue' && item.type !== 'function_dialogue_gap_typing') continue;
    const itemKey = `${page.pageId}/${item.itemId}`;
    const line = item.lines.slice(1).find((l) => !(r.revealed?.[itemKey] ?? []).includes(l.lineId));
    if (line) return { itemKey, key: line.lineId };
  }
  return undefined;
}

export function isListeningPage(page: PlanPage): boolean {
  return page.units.length > 0 && page.units.every((u) => u.itemType === 'vocabulary_listening_choice' || u.itemType === 'vocabulary_listening_dictation' || u.itemType === 'function_listening_choice');
}

function lockPage(page: PlanPage, r: SessionRecord, interfaceLanguage: Locale, timedOut: boolean): SessionRecord {
  const locked = { ...r.locked };
  for (const unit of page.units) {
    if (locked[unit.id]) continue;
    const response = r.drafts[unit.id] ?? null;
    const gender = unit.kind === 'text' && unit.noun && isPluralAnswer(response) ? (r.drafts[`${unit.id}#gender`] as string | undefined) : undefined;
    locked[unit.id] = { response, ...scoreUnit(unit, response, gender), timedOut, interfaceLanguage, ...(gender ? { gender } : {}) };
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
  if (r.status !== 'active') return r;
  const page = plan.pages[r.pageIndex];
  const now = action.now;
  const deadline = page.role === 'exam' ? r.exam[page.pageId]?.deadline : undefined;
  const expired = deadline !== undefined && now >= deadline;
  let next: SessionRecord;
  switch (action.type) {
    case 'draft': {
      // The gender after a "des" + plural answer is a draft of its own (P4-05 review).
      const unit = page.units.find((u) => u.id === action.unitId || (u.kind === 'text' && u.noun && `${u.id}#gender` === action.unitId));
      if (unit && action.unitId !== unit.id) {
        if (r.phase !== 'answering' || r.locked[unit.id] || expired) return r;
        next = { ...r, drafts: { ...r.drafts, [action.unitId]: action.response } };
        break;
      }
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
  const p = practice.possible ? (plan.scoring.practiceWeight * practice.earned) / practice.possible : 0;
  return p; // Exam credit is sealed until completion, handled above.
}

export interface LessonResults {
  practice: Tally;
  exam: Tally;
  practiceScore: number;
  examScore: number;
  /** practice weight × practice score + exam weight × exam score (0.35/0.65, reading 0.3/0.7); a lesson without practice units weights the exam fully. */
  total: number;
  steps: { stepId: string; role: 'practice' | 'exam' | 'presentation'; tally: Tally; completed: boolean }[];
}

export function lessonResults(plan: LessonPlan, r: SessionRecord): LessonResults {
  const practice = tally(unitsWhere(plan, 'practice', r), r);
  const exam = tally(unitsWhere(plan, 'exam', r), r);
  const practiceScore = percent(practice);
  const examScore = percent(exam);
  const total = practice.possible && exam.possible
    ? (plan.scoring.practiceWeight * practiceScore + plan.scoring.examWeight * examScore) / 100
    : practice.possible ? practiceScore : examScore;
  return {
    practice, exam, practiceScore, examScore, total,
    steps: plan.steps.map((s) => {
      const pages = plan.pages.filter((p) => p.stepId === s.stepId && !(r.skippedNoVoice ?? []).includes(p.pageId));
      return { stepId: s.stepId, role: s.role, tally: tally(pages.flatMap((p) => p.units), r), completed: pages.every((p) => r.completed.includes(p.pageId)) };
    }),
  };
}
