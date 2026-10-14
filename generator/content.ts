import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256 } from '../scripts/catalog.ts';
import { briefInputHash } from '../src/catalog/scan.ts';
import { ARTIFACT_SCHEMA_VERSION } from '../src/schemas/artifactCommon.ts';
import { isGeneratedKind } from '../src/schemas/artifacts.ts';
import type { GrammarBrief } from '../src/schemas/grammar.ts';
import type { ReadingBrief } from '../src/schemas/reading.ts';
import { validateBrief, validateContent, type Issue, type OutlineContext } from '../src/validation/artifacts.ts';
import { catalogContexts, generateBrief, runBatch, type BriefOptions, type BriefOutcome } from './briefs.ts';
import { CONTENT_PROMPT_VERSION, contentPrompt, grammarSections, normalizeLocalIds, type Section } from './contentPrompts.ts';
import { GenerationError } from './gemini.ts';
import { toStructuredSchema } from './prompts.ts';
import { isCode, ModelUnit, withFileLock } from './units.ts';
import { COPY, EXERCISE_INSTRUCTIONS, READING_COPY } from '../src/domain/lessonCopy.ts';
import { READING_CONTENT_PROMPT_VERSION, readingSections } from './readingPrompts.ts';

/** Splits a planned duration over n pages: whole seconds, at least 5 each, summing to the plan where possible. */
export function splitDuration(total: number, n: number): number[] {
  const base = Math.max(5, Math.floor(total / n));
  const rest = Math.max(0, total - base * n);
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}


/* -------------------------------------------------------------- assembly */

type Payloads = Record<string, unknown>;
/** Problems found while assembling, attributed to the section that must be repaired. */
type SectionIssues = Map<string, string[]>;
const blame = (issues: SectionIssues, key: string, message: string) => issues.set(key, [...(issues.get(key) ?? []), message]);


type GrammarItemPayload = Record<string, unknown> & { type: string };

function assembleGrammar(brief: GrammarBrief, p: Payloads, issues: SectionIssues) {
  const steps: object[] = [];
  for (const block of brief.blocks) {
    const key = `block-${block.id}`;
    const section = p[key] as { explanation: Record<string, unknown>; exercises: { exerciseId: string; items: GrammarItemPayload[] }[] };
    const exercises = new Map(section.exercises.map((e) => [e.exerciseId, e.items]));
    steps.push({
      id: `${block.id}-explanation`, role: 'explanation', blockId: block.id, label: block.title,
      pages: [{ pageId: `${block.id}-explanation`, estimatedDurationS: block.explanationDurationS, timeLimitS: null, instructions: COPY.explanation[1], items: [{ type: 'grammar_explanation', itemId: `${block.id}-explanation`, ruleIds: block.ruleIds, ...section.explanation }] }],
    });
    for (const ex of block.exercises) {
      const items = exercises.get(ex.id);
      if (!items) { blame(issues, key, `missing exercise ${ex.id}`); continue; }
      if (items.length !== ex.itemCount) blame(issues, key, `exercise ${ex.id} must have ${ex.itemCount} items, not ${items.length}`);
      const durations = splitDuration(ex.estimatedDurationS, items.length);
      steps.push({
        id: ex.id, role: 'exercise', blockId: block.id, label: block.title,
        pages: items.map((item, n) => ({ pageId: `${ex.id}-${n + 1}`, estimatedDurationS: durations[n], timeLimitS: null, instructions: EXERCISE_INSTRUCTIONS[ex.type], items: [{ ...item, itemId: `${ex.id}-${n + 1}` }] })),
      });
    }
    for (const id of exercises.keys()) if (!block.exercises.some((e) => e.id === id)) blame(issues, key, `unexpected exercise ${id}`);
  }
  steps.push({
    id: 'feedback', role: 'feedback', blockId: null, label: COPY.feedback[0],
    pages: [{ pageId: 'feedback', estimatedDurationS: brief.feedbackPlaceholder.estimatedDurationS, timeLimitS: null, instructions: COPY.feedback[1], items: [{ type: 'production_feedback_placeholder', itemId: 'feedback' }] }],
  });
  const exam = new Map((p.exam as { pages: { pageId: string; items: GrammarItemPayload[] }[] }).pages.map((pg) => [pg.pageId, pg.items]));
  for (const pg of brief.exam.pages) if (!exam.has(pg.pageId)) blame(issues, 'exam', `missing page ${pg.pageId}`);
  steps.push({
    id: 'exam', role: 'exam', blockId: null, label: COPY.grammarExam[0],
    pages: brief.exam.pages.map((pg) => ({
      pageId: pg.pageId, estimatedDurationS: pg.estimatedDurationS, timeLimitS: pg.timeLimitS, instructions: EXERCISE_INSTRUCTIONS[pg.type],
      items: (exam.get(pg.pageId) ?? []).map((item, n) => ({ ...item, itemId: `${pg.pageId}-${n + 1}` })),
    })),
  });
  return issues.size ? undefined : { kind: 'grammar', topic: brief.topic, steps };
}

type ReadingLessonPayload = {
  documents: Record<'main' | 'exam', Record<string, unknown>>;
  keywordMatching: { keywordId: string; answerExplanation: unknown }[];
  skim: Record<string, unknown>;
  detail: Record<string, unknown>[];
  structure: { instructions: unknown; task: Record<string, unknown> & { type: string; mode?: string } };
  exam: { pageId: string; items: Record<string, unknown>[] }[];
};

/** Reading: the five stages around the model's documents and questions, with the brief's durations and limits. */
function assembleReading(brief: ReadingBrief, p: Payloads, issues: SectionIssues) {
  const lesson = p.lesson as ReadingLessonPayload;
  const { keywords, skim, detail, structure } = brief.stages;
  const doc = (itemId: string, documentId: 'main' | 'exam', view: 'skim' | 'open' | 'exam') => ({ type: 'reading_document', itemId, documentId, view, skimSeconds: view === 'skim' ? skim.skimSeconds : null });
  const [listS, matchingS] = splitDuration(keywords.estimatedDurationS, 2);
  const exam = new Map(lesson.exam.map((pg) => [pg.pageId, pg.items]));
  for (const pg of brief.exam.pages) if (!exam.has(pg.pageId)) blame(issues, 'lesson', `missing exam page ${pg.pageId}`);
  const task = { ...lesson.structure.task, itemId: 'structure-task' };
  const parts = structure.task === 'order_parts';
  const steps = [
    { id: 'keywords', stage: 'keywords', role: 'exercise', label: READING_COPY.keywords[0], pages: [
      { pageId: 'keywords', estimatedDurationS: listS, timeLimitS: null, instructions: READING_COPY.keywords[1], items: [{ type: 'reading_keywords', itemId: 'keywords', keywordIds: brief.keywords.map((k) => k.id) }] },
      { pageId: 'keyword-matching', estimatedDurationS: matchingS, timeLimitS: null, instructions: READING_COPY.keywordMatching[1], items: [{ type: 'reading_keyword_matching', itemId: 'keyword-matching', pairs: lesson.keywordMatching }] },
    ] },
    { id: 'skim', stage: 'skim', role: 'exercise', label: READING_COPY.skim[0], pages: [{ pageId: 'skim', estimatedDurationS: skim.estimatedDurationS, timeLimitS: null, instructions: READING_COPY.skim[1], items: [doc('doc-skim', 'main', 'skim'), { type: 'reading_skim_choice', itemId: `skim-${skim.focus}`, focus: skim.focus, ...lesson.skim }] }] },
    { id: 'detail', stage: 'detail', role: 'exercise', label: READING_COPY.detail[0], pages: [{ pageId: 'detail', estimatedDurationS: detail.estimatedDurationS, timeLimitS: null, instructions: READING_COPY.detail[1], items: [doc('doc-detail', 'main', 'open'), ...lesson.detail] }] },
    // Putting the parts back in order hides the document; the other tasks keep it open.
    { id: 'structure', stage: 'structure', role: 'exercise', label: READING_COPY.structure[0], pages: [{ pageId: 'structure', estimatedDurationS: structure.estimatedDurationS, timeLimitS: null, instructions: lesson.structure.instructions, items: parts ? [task] : [doc('doc-structure', 'main', 'open'), task] }] },
    { id: 'exam', stage: 'exam', role: 'exam', label: READING_COPY.exam[0], pages: brief.exam.pages.map((pg, n) => ({
      pageId: pg.pageId, estimatedDurationS: pg.estimatedDurationS, timeLimitS: pg.timeLimitS, instructions: READING_COPY.exam[1],
      items: [doc(n ? `doc-exam-${n + 1}` : 'doc-exam', 'exam', 'exam'), ...(exam.get(pg.pageId) ?? []).map((item, i) => ({ ...item, itemId: `${pg.pageId}-${i + 1}` }))],
    })) },
  ];
  const documents = (['main', 'exam'] as const).map((documentId) => ({ documentId, genre: brief.genre, ...lesson.documents[documentId] }));
  return issues.size ? undefined : { kind: 'reading', theme: brief.theme, genre: brief.genre, documents, steps };
}

/** Maps a full-validation issue (steps.N…) to the section that produced that step. */
function sectionOfStep(content: { steps: { role: string; blockId?: string | null; stage?: string }[] }, path: string): string | undefined {
  const m = /^steps\.(\d+)/.exec(path);
  const s = m ? content.steps[Number(m[1])] : undefined;
  if (!s) return undefined;
  if (s.role === 'exam') return 'exam';
  return s.blockId ? `block-${s.blockId}` : undefined;
}

/* -------------------------------------------------------------- generate */

export interface LessonOutcome extends BriefOutcome {
  brief?: BriefOutcome['status'];
}

const pending = new Map<string, Promise<LessonOutcome>>();

/** `make generate-missing`: every supported lesson of the catalog, brief first, then content. */
export function generateMissingLessons(options: BriefOptions): Promise<BriefOutcome[]> {
  return runBatch(catalogContexts(options.contentDir), options, generateLesson);
}

/** `make generate`: prepares a missing brief first, then missing lesson content (vocabulary: the brief is the whole lesson). */
export function generateLesson(id: string, options: BriefOptions): Promise<LessonOutcome> {
  const kind = catalogContexts(options.contentDir).find((c) => c.entry.id === id)?.entry.kind;
  if (kind === 'vocabulary') return generateBrief(id, options);
  const key = join(resolve(options.contentDir), 'lessons', `${id}.json`);
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    const brief = await generateBrief(id, { ...options, regenerate: false });
    return { ...(await generateContent(id, key, options)), brief: brief.status };
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

async function generateContent(id: string, file: string, options: BriefOptions): Promise<LessonOutcome> {
  const ctx = catalogContexts(options.contentDir).find((c) => c.entry.id === id)!;
  if (!isGeneratedKind(ctx.entry.kind)) throw new GenerationError(`${ctx.entry.kind} generation is not implemented (phases 4/5).`);
  const briefText = await readFile(join(resolve(options.contentDir), 'briefs', `${id}.json`), 'utf8');
  const briefData: unknown = JSON.parse(briefText);
  const checked = validateBrief(briefData, ctx);
  if (checked.status !== 'valid' || !checked.value) throw new GenerationError(`${id}: the brief is ${checked.status}; content needs a valid brief.`);
  const brief = checked.value;
  const briefHash = briefInputHash(briefData, sha256);
  const contentCtx = { ...ctx, brief, briefHash };
  await mkdir(join(resolve(options.contentDir), 'lessons'), { recursive: true });

  return withFileLock(file, id, 'lesson', async (save) => {
    let old: string | undefined;
    try { old = await readFile(file, 'utf8'); }
    catch (error) { if (!isCode(error, 'ENOENT')) throw new GenerationError(`${id}: cannot read existing lesson.`); }
    if (old !== undefined && !options.regenerate) {
      let status = 'malformed';
      try { status = validateContent(JSON.parse(old), contentCtx).status; } catch { /* malformed JSON */ }
      if (status === 'valid') return { id, status: 'reused' };
      throw new GenerationError(`${id}: existing lesson is ${status}; review it, then run make generate ID=${id} REGENERATE=1.`);
    }

    if (brief.kind === 'vocabulary') throw new GenerationError(`${id}: vocabulary lessons have no content file.`);
    if (brief.kind === 'functions') throw new GenerationError(`${id}: function lessons are written by hand (D51).`);
    const sectionList: Section[] = brief.kind === 'reading' ? readingSections(ctx.lang, brief) : grammarSections(ctx.lang, brief);
    const adapter = options.adapter();
    const units = new Map(sectionList.map((section) => [section.key, new ModelUnit<unknown>(`${id}/${section.key}`, section.schema, toStructuredSchema(section.schema), (repair) => contentPrompt(ctx, brief, section, repair), {
      adapter, report: options.report, sleep: options.sleep, normalize: normalizeLocalIds,
    })]));
    const payloads: Payloads = {};
    let todo = [...units.keys()];
    for (;;) {
      for (const key of todo) payloads[key] = await units.get(key)!.request();
      const issues: SectionIssues = new Map();
      const body = brief.kind === 'reading' ? assembleReading(brief, payloads, issues) : assembleGrammar(brief, payloads, issues);
      let content: Record<string, unknown> | undefined;
      if (body) {
        const pages = (body.steps as { pages: { estimatedDurationS: number }[] }[]).flatMap((s) => s.pages);
        const models = [...new Set([...units.values()].map((u) => u.model))].join(', ').slice(0, 80);
        content = {
          schemaVersion: ARTIFACT_SCHEMA_VERSION, id, lang: ctx.lang, level: ctx.level, locales: ['en', 'fr', 'de'],
          title: brief.title, objective: brief.objective,
          estimatedMinutes: Math.max(1, Math.round(pages.reduce((sum, pg) => sum + pg.estimatedDurationS, 0) / 60)),
          provenance: { generator: 'lesson-prototype', model: models, promptVersion: brief.kind === 'reading' ? READING_CONTENT_PROMPT_VERSION : CONTENT_PROMPT_VERSION, generatedAt: new Date().toISOString(), inputHashes: { outline: ctx.outlineHash, brief: briefHash } },
          ...body,
        };
        const result = validateContent(content, contentCtx);
        if (result.status === 'valid') {
          await recheckInputs(id, ctx, briefText, options);
          await save(result.value);
          return { id, status: 'generated', message: `model ${models}` };
        }
        // Reading writes its whole lesson in one section, which repairs every issue.
        if (brief.kind === 'reading') for (const issue of result.issues) blame(issues, 'lesson', `${issue.path}: ${issue.message}`);
        else attribute(result.issues, content as { steps: [] }, issues, id);
      }
      for (const [key, messages] of issues) units.get(key)!.reject(messages);
      todo = [...issues.keys()];
    }
  });
}

/** Assigns validation issues to sections; an issue no section can repair is a generator bug. */
function attribute(found: Issue[], content: { steps: [] }, issues: SectionIssues, id: string) {
  for (const issue of found) {
    const key = sectionOfStep(content, issue.path);
    if (!key) throw new GenerationError(`${id}: assembled content is invalid at ${issue.path || '(root)'}: ${issue.message}`);
    blame(issues, key, `${issue.path}: ${issue.message}`);
  }
}

async function recheckInputs(id: string, ctx: OutlineContext, briefText: string, options: BriefOptions) {
  const current = catalogContexts(options.contentDir).find((c) => c.entry.id === id);
  if (current?.outlineHash !== ctx.outlineHash) throw new GenerationError(`${id}: outline changed during generation; retry with the current outline.`);
  const now = await readFile(join(resolve(options.contentDir), 'briefs', `${id}.json`), 'utf8');
  if (now !== briefText) throw new GenerationError(`${id}: brief changed during generation; retry with the current brief.`);
}

