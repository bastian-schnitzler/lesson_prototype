/**
 * Hand-authoring aid for reading lessons: turns a compact lesson definition written by Claude in
 * `authoring/reading/<id>.ts` (helpers in scripts/author-reading-items.ts) into the brief and the
 * lesson content. It numbers segments, counts words, derives the stage plan, page estimates, exam
 * limits, minutes and input hashes (docs/reading-lessons.md), validates both files and writes them
 * when they changed. No model calls.
 *
 *   node scripts/author-reading.ts <lesson-id>… [--dry-run]
 *   node scripts/author-reading.ts --all [--dry-run]
 *   node scripts/author-reading.ts --all --authoring tests/fixtures/authoring --content-dir tests/fixtures/content
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { sha256 } from './catalog.ts';
import { briefInputHash } from '../src/catalog/scan.ts';
import { READING_COPY } from '../src/domain/lessonCopy.ts';
import { ARTIFACT_SCHEMA_VERSION } from '../src/schemas/artifactCommon.ts';
import type { Level } from '../src/schemas/common.ts';
import { documentWords, NOT_STATED_LEVELS, READING_SKIM_SECONDS, type ReadingBrief, type ReadingContent, type ReadingDocument, type ReadingItem } from '../src/schemas/reading.ts';
import { validateBrief, validateContent } from '../src/validation/artifacts.ts';
import { catalogContexts } from '../generator/briefs.ts';
import { READING_BRIEF_PROMPT_VERSION, READING_CONTENT_PROMPT_VERSION } from '../generator/readingPrompts.ts';
import { shuffle, type DocumentDef, type QuestionDef, type ReadingDefinition } from './author-reading-items.ts';

const ROOT = resolve(import.meta.dirname, '..');
const AUTHORING = join(ROOT, 'authoring', 'reading');

/* -------------------------------------------------------------- estimates */

/**
 * Guide page estimates per level, in seconds (docs/reading-lessons.md, section 3), taken from the
 * first four authored lessons: the key word list and matching, the time after the skim countdown,
 * one detail question, the structure task, one exam question. Exam limits are 1.5 × the estimate.
 */
const GUIDE: Record<Level, { list: number; matching: number; afterSkim: number; detail: number; headings: number; order: number; exam: number }> = {
  A1: { list: 40, matching: 50, afterSkim: 20, detail: 38, headings: 75, order: 60, exam: 30 },
  A2: { list: 45, matching: 50, afterSkim: 20, detail: 45, headings: 80, order: 70, exam: 35 },
  B1: { list: 50, matching: 55, afterSkim: 25, detail: 55, headings: 90, order: 80, exam: 40 },
  B2: { list: 50, matching: 55, afterSkim: 25, detail: 60, headings: 105, order: 95, exam: 45 },
  C1: { list: 50, matching: 55, afterSkim: 30, detail: 65, headings: 120, order: 105, exam: 50 },
  C2: { list: 55, matching: 60, afterSkim: 30, detail: 70, headings: 130, order: 115, exam: 60 },
};
const round5 = (s: number) => Math.round(s / 5) * 5;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/* ------------------------------------------------------------- documents */

/** Numbers the segments (m-s1… / x-s1…) and checks every highlight against its segment. */
function buildDocument(def: DocumentDef, documentId: 'main' | 'exam', genre: ReadingDocument['genre'], terms: Map<string, string>): ReadingDocument {
  const prefix = documentId === 'main' ? 'm' : 'x';
  let n = 0;
  return {
    documentId, genre, title: def.title, meta: def.meta,
    parts: def.parts.map((p) => ({
      partId: p.id, heading: p.heading ?? null,
      segments: p.segments.map((s) => ({ segmentId: `${prefix}-s${++n}`, text: typeof s === 'string' ? s : s[0], value: typeof s === 'string' ? null : s[1] })),
    })),
    highlights: (def.highlights ?? []).map(([keywordId, segmentId, text]) => ({ keywordId, segmentId, text: text ?? terms.get(keywordId) ?? keywordId })),
  };
}

/** The question as stored: without the brief-only focus, with "not stated" offered from B1. */
function item(q: QuestionDef, level: Level): ReadingItem {
  const { focus: _, ...rest } = q;
  return rest.type === 'reading_true_false' ? { ...rest, allowNotStated: NOT_STATED_LEVELS.includes(level) } : rest;
}

/* ------------------------------------------------------------------ build */

export function buildReadingLesson(def: ReadingDefinition, dir = join(ROOT, 'content')) {
  const ctx = catalogContexts(dir).find((c) => c.entry.id === def.id);
  if (!ctx) throw new Error(`no outline entry ${def.id}`);
  if (ctx.entry.kind !== 'reading' || !ctx.entry.theme) throw new Error(`${def.id} is not a reading entry`);
  const level = ctx.level as Level;
  const guide = GUIDE[level];
  const d = def.durations ?? {};
  const terms = new Map(def.keywords.map((k) => [k.id, k.term]));
  const main = buildDocument(def.main, 'main', def.genre, terms);
  const exam = buildDocument(def.exam, 'exam', def.genre, terms);
  const skimSeconds = READING_SKIM_SECONDS[level];
  const task = def.structure.item;
  const structureTask = task.type === 'reading_part_heading_matching' ? 'heading_matching' : task.type === 'reading_order' && task.mode === 'parts' ? 'order_parts' : 'order_information';

  const [listS, matchingS] = d.keywords ?? [guide.list, guide.matching];
  const skimS = d.skim ?? skimSeconds + guide.afterSkim;
  const detailS = d.detail ?? round5(guide.detail * def.detail.length);
  const structureS = d.structure ?? (structureTask === 'heading_matching' ? guide.headings : guide.order);
  const examPlan = def.examPages.map((pg, n) => {
    const [estimate, limit] = d.exam?.[n] ?? [round5(guide.exam * pg.questions.length), round5(1.5 * guide.exam * pg.questions.length)];
    return { pageId: pg.pageId, types: [...new Set(pg.questions.map((q) => q.type))], itemCount: pg.questions.length, estimatedDurationS: estimate, timeLimitS: limit };
  });
  const minutes = Math.max(1, Math.round((listS + matchingS + skimS + detailS + structureS + sum(examPlan.map((p) => p.estimatedDurationS))) / 60));
  const now = new Date().toISOString();
  const provenance = (promptVersion: string, brief?: string) => ({ generator: 'claude-code-direct-authoring', model: 'claude-opus-5-5', promptVersion, generatedAt: now, inputHashes: { outline: ctx.outlineHash!, ...(brief ? { brief } : {}) } });
  const envelope = { schemaVersion: ARTIFACT_SCHEMA_VERSION as typeof ARTIFACT_SCHEMA_VERSION, id: def.id, lang: ctx.lang, level, locales: ['en', 'fr', 'de'] as ['en', 'fr', 'de'], title: def.title ?? ctx.entry.workingTitle, objective: def.objective, estimatedMinutes: minutes };

  const brief: ReadingBrief = {
    ...envelope,
    provenance: provenance(READING_BRIEF_PROMPT_VERSION),
    kind: 'reading', theme: ctx.entry.theme, genre: def.genre,
    situation: def.situation, readerTask: def.readerTask, coverageNotes: def.coverageNotes, prerequisites: def.prerequisites,
    keywords: def.keywords.map((k) => ({ id: k.id, term: k.term, translations: k.translations as ReadingBrief['keywords'][number]['translations'], explanation: k.explanation })),
    documents: {
      main: { targetWords: documentWords(main), partCount: main.parts.length, contents: def.main.contents },
      exam: { targetWords: documentWords(exam), partCount: exam.parts.length, contents: def.exam.contents },
    },
    stages: {
      keywords: { estimatedDurationS: listS + matchingS },
      skim: { focus: def.skim.focus, skimSeconds, estimatedDurationS: skimS },
      detail: { questions: def.detail.map((q) => ({ id: q.itemId, type: q.type, focus: q.focus ?? def.objective })), estimatedDurationS: detailS },
      structure: { task: structureTask, estimatedDurationS: structureS },
    },
    exam: { pages: examPlan },
    scoring: { practiceWeight: 30, examWeight: 70, orthographyCredit: 0.5 },
  };
  const briefText = JSON.stringify(brief, null, 2) + '\n';
  const briefHash = briefInputHash(JSON.parse(briefText), sha256);

  const page = (pageId: string, estimatedDurationS: number, instructions: ReadingContent['steps'][number]['pages'][number]['instructions'], items: ReadingItem[], timeLimitS: number | null = null) => ({ pageId, estimatedDurationS, timeLimitS, instructions, items });
  const doc = (itemId: string, documentId: 'main' | 'exam', view: 'skim' | 'open' | 'exam'): ReadingItem => ({ type: 'reading_document', itemId, documentId, view, skimSeconds: view === 'skim' ? skimSeconds : null });
  const skimOptions = shuffle([def.skim.right, ...def.skim.wrong], `${def.id}|skim`);
  const instructions = (stage: keyof typeof READING_COPY) => def.instructions?.[stage as 'keywords'] ?? READING_COPY[stage][1];
  const content: ReadingContent = {
    ...envelope,
    provenance: provenance(READING_CONTENT_PROMPT_VERSION, briefHash),
    kind: 'reading', theme: ctx.entry.theme, genre: def.genre,
    documents: [main, exam],
    steps: [
      { id: 'keywords', stage: 'keywords', role: 'exercise', label: READING_COPY.keywords[0], pages: [
        page('keywords', listS, instructions('keywords'), [{ type: 'reading_keywords', itemId: 'keywords', keywordIds: def.keywords.map((k) => k.id) }]),
        page('keyword-matching', matchingS, READING_COPY.keywordMatching[1], [{ type: 'reading_keyword_matching', itemId: 'keyword-matching', pairs: def.keywords.map((k) => ({ keywordId: k.id, answerExplanation: k.matching })) }]),
      ] },
      { id: 'skim', stage: 'skim', role: 'exercise', label: READING_COPY.skim[0], pages: [page('skim', skimS, instructions('skim'), [
        doc('doc-skim', 'main', 'skim'),
        { type: 'reading_skim_choice', itemId: `skim-${def.skim.focus}`, focus: def.skim.focus, question: def.skim.question, options: skimOptions.map((text, n) => ({ optionId: `o${n + 1}`, text })), answerOptionId: `o${skimOptions.indexOf(def.skim.right) + 1}`, answerExplanation: def.skim.explanation },
      ])] },
      { id: 'detail', stage: 'detail', role: 'exercise', label: READING_COPY.detail[0], pages: [page('detail', detailS, instructions('detail'), [doc('doc-detail', 'main', 'open'), ...def.detail.map((q) => item(q, level))])] },
      // Putting the parts back in order hides the document; the other tasks keep it open.
      { id: 'structure', stage: 'structure', role: 'exercise', label: READING_COPY.structure[0], pages: [page('structure', structureS, def.structure.instructions ?? READING_COPY.structure[1], structureTask === 'order_parts' ? [task] : [doc('doc-structure', 'main', 'open'), task])] },
      { id: 'exam', stage: 'exam', role: 'exam', label: READING_COPY.exam[0], pages: def.examPages.map((pg, n) => page(pg.pageId, examPlan[n].estimatedDurationS, instructions('exam'), [doc(n ? `doc-exam-${n + 1}` : 'doc-exam', 'exam', 'exam'), ...pg.questions.map((q) => item(q, level))], examPlan[n].timeLimitS)) },
    ],
  };
  const contentText = JSON.stringify(content, null, 2) + '\n';

  const briefResult = validateBrief(JSON.parse(briefText), ctx);
  const contentResult = briefResult.value ? validateContent(JSON.parse(contentText), { ...ctx, brief: briefResult.value, briefHash }) : undefined;
  const questions = def.detail.length + 1 + sum(def.examPages.map((pg) => pg.questions.length));
  return {
    briefText, contentText, dir,
    report: `${def.id} (${level}, ${def.genre}): ${documentWords(main)} + ${documentWords(exam)} words, ${questions} questions, ${structureTask}, ${minutes} min`,
    issues: [...briefResult.issues.map((i) => `brief ${i.path}: ${i.message}`), ...(contentResult?.issues ?? []).map((i) => `content ${i.path}: ${i.message}`), ...(contentResult ? [] : ['content not checked: the brief is invalid'])],
    stale: [...briefResult.staleReasons, ...(contentResult?.staleReasons ?? [])],
  };
}

/** Writes a file unless only its generatedAt stamps differ, so rebuilding an unchanged lesson keeps its hashes. */
function writeIfChanged(file: string, text: string): boolean {
  const strip = (s: string) => s.replace(/"generatedAt": "[^"]*"/g, '').replace(/"brief": "[0-9a-f]{64}"/g, '');
  if (existsSync(file) && strip(readFileSync(file, 'utf8')) === strip(text)) return false;
  writeFileSync(file, text);
  return true;
}

if (import.meta.main) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    'dry-run': { type: 'boolean', default: false }, all: { type: 'boolean', default: false }, authoring: { type: 'string' }, 'content-dir': { type: 'string' },
  } });
  const authoring = values.authoring ? resolve(values.authoring) : AUTHORING;
  const contentDir = values['content-dir'] ? resolve(values['content-dir']) : join(ROOT, 'content');
  const ids = values.all ? readdirSync(authoring).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, '')).sort() : positionals;
  let failed = false;
  for (const id of ids) {
    const { default: def } = (await import(join(authoring, `${id}.ts`))) as { default: ReadingDefinition };
    const built = buildReadingLesson(def, contentDir);
    console.log(built.report);
    if (built.issues.length || built.stale.length) {
      failed = true;
      for (const issue of [...built.issues, ...built.stale]) console.error(`  ${issue}`);
      continue;
    }
    if (values['dry-run']) continue;
    const briefFile = join(built.dir, 'briefs', `${id}.json`);
    // An unchanged brief keeps its file, so the content's brief hash must be taken from the file on disk.
    const briefWritten = writeIfChanged(briefFile, built.briefText);
    const briefHash = briefInputHash(JSON.parse(readFileSync(briefFile, 'utf8')), sha256);
    const contentText = built.contentText.replace(/"brief": "[0-9a-f]{64}"/, `"brief": "${briefHash}"`);
    const contentFile = join(built.dir, 'lessons', `${id}.json`);
    // A new brief hash always rewrites the content, which records it.
    const contentWritten = briefWritten ? (writeFileSync(contentFile, contentText), true) : writeIfChanged(contentFile, contentText);
    console.log(briefWritten || contentWritten ? '  written' : '  unchanged');
  }
  if (failed) process.exitCode = 1;
}
