import type { LocalizedText } from '../../schemas/artifactCommon.ts';
import type { LessonPlan, PlanPage } from './plan.ts';
import type { SessionRecord } from './session.ts';

/**
 * The lesson outline of the sidebar (P6-01, SPEC section 5 "Lesson navigation"), congruent with the start
 * page: numbered sections in the start page's order and colours, each with its learning points.
 * Grammar: one section per teaching block (its explanations, then its exercises), then the exam.
 * Functions: flashcards and dialogue, the exercises, the exam. Vocabulary: one section per word group
 * (introduction and flashcards), the exercises, the exam. Every theory page is a point of its own;
 * consecutive practice pages of one step form one point. The production-feedback placeholder and the
 * exam info page belong to the exam section, which has no sub-points.
 */
export interface OutlinePoint {
  key: string;
  kind: 'theory' | 'practice' | 'exam';
  /** Indexes into `plan.pages`, in order. */
  pages: number[];
  title: LocalizedText;
}

export interface OutlineSection {
  key: string;
  kind: 'lesson' | 'exam';
  /** Shown title; `titleKey` (an interface message) when the section has no content label. */
  title?: LocalizedText;
  titleKey?: 'nav.exercises';
  /** Start-page colour slot. */
  colour: number;
  points: OutlinePoint[];
  pages: number[];
}

export type PointState = 'done' | 'current' | 'upcoming';

const isTheory = (page: PlanPage) => page.role === 'presentation' && !page.special && !page.items.some((it) => it.type === 'production_feedback_placeholder');
const belongsToExam = (page: PlanPage) => page.role === 'exam' || page.special === 'examIntro' || page.items.some((it) => it.type === 'production_feedback_placeholder');

const joinLabels = (labels: LocalizedText[]): LocalizedText => {
  const locales = Object.keys(labels[0] ?? {}) as (keyof LocalizedText)[];
  return Object.fromEntries(locales.map((l) => [l, [...new Set(labels.map((x) => x[l]))].join(' · ')])) as LocalizedText;
};

/** The outline is derived once per plan; the sidebar and the phone strip read it on every render. */
const outlines = new WeakMap<LessonPlan, OutlineSection[]>();

export function lessonOutline(plan: LessonPlan): OutlineSection[] {
  let sections = outlines.get(plan);
  if (!sections) outlines.set(plan, (sections = buildOutline(plan)));
  return sections;
}

function buildOutline(plan: LessonPlan): OutlineSection[] {
  const sections: OutlineSection[] = [];
  const groupOf = (page: PlanPage) => {
    const item = page.items[0];
    const targetIds = item && 'targetIds' in item ? item.targetIds : [];
    return plan.groups.find((g) => g.targetIds.includes(targetIds[0]));
  };
  const sectionKey = (page: PlanPage) => {
    if (belongsToExam(page)) return 'exam';
    if (plan.kind === 'grammar') return page.blockId ?? page.stepId;
    if (plan.kind === 'reading') return page.stepId; // the five stages: key words, skim, detail, structure, exam
    if (plan.kind === 'functions') return page.role;
    return (isTheory(page) && groupOf(page)?.id) || 'exercises';
  };
  plan.pages.forEach((page, index) => {
    const key = sectionKey(page);
    let section = sections.find((s) => s.key === key);
    if (!section) {
      const group = plan.kind === 'vocabulary' ? groupOf(page) : undefined;
      section = { key, kind: key === 'exam' ? 'exam' : 'lesson', colour: sections.length, points: [], pages: [],
        ...(key === 'exam' ? {} : group && key === group.id ? { title: group.label } : plan.kind === 'grammar' || plan.kind === 'reading' ? { title: page.stepLabel } : plan.kind === 'functions' ? {} : { titleKey: 'nav.exercises' as const }) };
      sections.push(section);
    }
    section.pages.push(index);
    if (key === 'exam') {
      if (page.role === 'exam' && !section.title) section.title = page.stepLabel;
      return;
    }
    if (isTheory(page)) {
      const item = page.items[0];
      section.points.push({ key: page.pageId, kind: 'theory', pages: [index], title: item?.type === 'grammar_explanation' ? item.heading : page.stepLabel });
      return;
    }
    const last = section.points.at(-1);
    if (last?.kind === 'practice' && plan.pages[last.pages[0]].stepId === page.stepId) last.pages.push(index);
    else section.points.push({ key: sections.some((x) => x.points.some((pt) => pt.key === page.stepId)) ? `${page.stepId}/practice` : page.stepId, kind: 'practice', pages: [index], title: page.stepLabel }); // a reading step can hold a theory page and a matching page under one ID
  });
  // Function sections are named by their steps, as on the start page.
  for (const section of sections) if (!section.title && !section.titleKey) section.title = joinLabels(section.points.map((p) => p.title));
  return sections;
}

/** A sidebar entry: a learning point numbered through the lesson (the exam has no number), in its section's colour. */
export interface NumberedPoint extends OutlinePoint {
  number: number | null;
  colour: number;
  sectionIndex: number;
}

/**
 * The flat timeline of the sidebar and the phone strip (P6-01 review): every learning point numbered
 * 1, 2, 3… through the lesson, as listed below the lettered sections on the start page; the exam last.
 */
export function numberedPoints(sections: OutlineSection[]): NumberedPoint[] {
  let n = 0;
  return sections.flatMap((section, sectionIndex): NumberedPoint[] => section.kind === 'exam'
    ? [{ key: section.key, kind: 'exam' as const, pages: section.pages, title: section.title ?? { en: '', fr: '', de: '' }, number: null, colour: section.colour, sectionIndex }]
    : section.points.map((point) => ({ ...point, number: ++n, colour: section.colour, sectionIndex })));
}

export function pointState(point: Pick<OutlinePoint, 'pages'>, record: Pick<SessionRecord, 'pageIndex' | 'phase'>): PointState {
  if (record.phase === 'results') return 'done';
  if (point.pages.includes(record.pageIndex)) return 'current';
  return point.pages[0] < record.pageIndex ? 'done' : 'upcoming';
}

/** The exam is running (or its info page or the placeholder before it is shown): the sidebar only shows. */
export function inExam(plan: LessonPlan, record: Pick<SessionRecord, 'pageIndex' | 'phase'>): boolean {
  const page = plan.pages[record.pageIndex];
  return record.phase !== 'results' && !!page && belongsToExam(page);
}
