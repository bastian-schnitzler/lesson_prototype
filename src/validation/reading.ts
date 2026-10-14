import { nativeLocales } from '../schemas/artifactCommon.ts';
import type { Level } from '../schemas/common.ts';
import {
  documentWords,
  examWordRange,
  NOT_STATED_LEVELS,
  READING_LIMITS,
  READING_SKIM_SECONDS,
  READING_STAGES,
  READING_WORDS,
  type ReadingBrief,
  type ReadingContent,
  type ReadingDocument,
  type ReadingItem,
} from '../schemas/reading.ts';
import type { Issues } from './artifacts.ts';

/**
 * Reading checks beyond the schemas (docs/reading-lessons.md, section 4.3): counts, references
 * between IDs, word counts per level, and the lesson following its brief. A failure makes the file
 * invalid; the prototype has no warning status.
 */

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Same members with the same multiplicity, in any order. */
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

function checkMinutes(estimatedMinutes: number, seconds: number, issues: Issues) {
  const expected = Math.max(1, Math.round(seconds / 60));
  issues.check(estimatedMinutes === expected, 'estimatedMinutes', `must equal the summed page estimates rounded to minutes (${expected})`);
}

function checkWords(words: number, [min, max]: readonly [number, number], path: string, what: string, issues: Issues) {
  issues.check(words >= min && words <= max, path, `${what} has ${words} words; ${min}–${max} expected at this level (whitespace-separated tokens with a letter or digit)`);
}

/* ================================================================= briefs */

export function checkReadingBrief(b: ReadingBrief, issues: Issues) {
  const level = b.level as Level;
  issues.unique(b.keywords.map((k) => k.id), 'keywords', 'keyword ID');
  issues.unique(b.keywords.map((k) => k.term), 'keywords', 'keyword term');
  for (const locale of nativeLocales(b.lang)) issues.unique(b.keywords.map((k) => k.translations[locale]?.[0] ?? ''), 'keywords', `${locale} matching label (first translation)`);
  checkWords(b.documents.main.targetWords, READING_WORDS[level], 'documents.main.targetWords', 'the main document', issues);
  checkWords(b.documents.exam.targetWords, examWordRange(level), 'documents.exam.targetWords', 'the exam document', issues);
  const { keywords, skim, detail, structure } = b.stages;
  issues.check(skim.skimSeconds === READING_SKIM_SECONDS[level], 'stages.skim.skimSeconds', `must be ${READING_SKIM_SECONDS[level]} at ${level}`);
  issues.unique(detail.questions.map((q) => q.id), 'stages.detail.questions', 'question ID');
  if (structure.task !== 'order_information') issues.check(b.documents.main.partCount >= 3, 'documents.main.partCount', `${structure.task} needs a main document of at least 3 parts`);
  issues.unique(b.exam.pages.map((pg) => pg.pageId), 'exam.pages', 'page ID');
  issues.check(sum(b.exam.pages.map((pg) => pg.itemCount)) === READING_LIMITS.examQuestions, 'exam.pages', `the exam has exactly ${READING_LIMITS.examQuestions} questions`);
  b.exam.pages.forEach((pg, i) => issues.check(pg.timeLimitS >= pg.estimatedDurationS, `exam.pages.${i}.timeLimitS`, 'the time limit must not be shorter than the estimated duration'));
  checkMinutes(b.estimatedMinutes, keywords.estimatedDurationS + skim.estimatedDurationS + detail.estimatedDurationS + structure.estimatedDurationS + sum(b.exam.pages.map((pg) => pg.estimatedDurationS)), issues);
}

/* ================================================================ content */

interface DocumentIndex {
  doc: ReadingDocument;
  segments: Map<string, string>;
  parts: string[];
}

function indexDocument(doc: ReadingDocument): DocumentIndex {
  return { doc, segments: new Map(doc.parts.flatMap((p) => p.segments.map((s) => [s.segmentId, s.text] as const))), parts: doc.parts.map((p) => p.partId) };
}

function checkDocuments(c: ReadingContent, b: ReadingBrief, issues: Issues) {
  const level = c.level as Level;
  const keywordIds = new Set(b.keywords.map((k) => k.id));
  issues.check(sameSet(c.documents.map((d) => d.documentId), ['main', 'exam']), 'documents', 'one main and one exam document');
  issues.check(c.genre === b.genre, 'genre', `must equal the brief genre ${b.genre}`);
  issues.unique(c.documents.flatMap((d) => d.parts.map((p) => p.partId)), 'documents', 'part ID');
  issues.unique(c.documents.flatMap((d) => d.parts.flatMap((p) => p.segments.map((s) => s.segmentId))), 'documents', 'segment ID');
  c.documents.forEach((doc, d) => {
    const path = `documents.${d}`;
    const plan = b.documents[doc.documentId];
    issues.check(doc.genre === b.genre, `${path}.genre`, `the ${doc.documentId} document must be a ${b.genre} like the brief`);
    issues.check(doc.parts.length === plan.partCount, `${path}.parts`, `the brief plans ${plan.partCount} parts for the ${doc.documentId} document`);
    checkWords(documentWords(doc), doc.documentId === 'main' ? READING_WORDS[level] : examWordRange(level), path, `the ${doc.documentId} document`, issues);
    const segments = indexDocument(doc).segments;
    if (doc.documentId === 'exam') issues.check(doc.highlights.length === 0, `${path}.highlights`, 'the exam document has no highlights');
    doc.highlights.forEach((h, i) => {
      issues.check(keywordIds.has(h.keywordId), `${path}.highlights.${i}`, `unknown keyword ${h.keywordId}`);
      const text = segments.get(h.segmentId);
      if (issues.check(text !== undefined, `${path}.highlights.${i}`, `unknown segment ${h.segmentId}`)) issues.check(text!.includes(h.text), `${path}.highlights.${i}`, `"${h.text}" is not in segment ${h.segmentId}`);
    });
    if (doc.documentId === 'main') for (const id of keywordIds) issues.check(doc.highlights.some((h) => h.keywordId === id), `${path}.highlights`, `keyword ${id} is never highlighted`);
  });
}

function checkOptions(item: { options: { optionId: string; text: string }[]; answerOptionId: string }, path: string, issues: Issues) {
  issues.unique(item.options.map((o) => o.optionId), path, 'option ID');
  issues.unique(item.options.map((o) => o.text), path, 'option text');
  issues.check(item.options.some((o) => o.optionId === item.answerOptionId), path, 'answerOptionId must be one of the options');
}

type Question = Extract<ReadingItem, { evidenceSegmentIds: string[] }>;
const isQuestion = (item: ReadingItem): item is Question => item.type === 'reading_choice' || item.type === 'reading_true_false' || item.type === 'reading_short_answer';

function checkQuestion(item: Question, doc: DocumentIndex, level: Level, path: string, issues: Issues) {
  for (const id of item.evidenceSegmentIds) issues.check(doc.segments.has(id), `${path}.evidenceSegmentIds`, `segment ${id} is not in the ${doc.doc.documentId} document`);
  issues.unique(item.evidenceSegmentIds, path, 'evidence segment');
  const notStated = item.type === 'reading_true_false' && item.answer === 'not_stated';
  issues.check(notStated ? item.evidenceSegmentIds.length === 0 : item.evidenceSegmentIds.length > 0, `${path}.evidenceSegmentIds`, notStated ? 'a "not stated" answer has no evidence' : 'name the segments that prove the answer');
  if (item.type === 'reading_choice') checkOptions(item, path, issues);
  if (item.type === 'reading_true_false') {
    const allowed = NOT_STATED_LEVELS.includes(level);
    issues.check(item.allowNotStated === allowed, `${path}.allowNotStated`, allowed ? `true/false questions offer "not stated" from B1 (${level})` : `"not stated" starts at B1, not ${level}`);
  }
}

const documentItem = (items: ReadingItem[]) => items.find((i): i is Extract<ReadingItem, { type: 'reading_document' }> => i.type === 'reading_document');

/** The lesson follows the brief: five fixed stages, the planned questions, the exam plan. */
export function checkReadingContent(c: ReadingContent, b: ReadingBrief, issues: Issues) {
  const level = c.level as Level;
  checkDocuments(c, b, issues);
  const docs = new Map(c.documents.map((d) => [d.documentId, indexDocument(d)]));
  const main = docs.get('main');
  const exam = docs.get('exam');
  if (!main || !exam) return;

  c.steps.forEach((step, si) => {
    const stage = READING_STAGES[si];
    issues.check(step.stage === stage && step.role === (stage === 'exam' ? 'exam' : 'exercise'), `steps.${si}`, `expected the ${stage} stage as an ${stage === 'exam' ? 'exam' : 'exercise'} step`);
  });
  const stepOf = (stage: string) => c.steps.find((s) => s.stage === stage);
  const pathOf = (stage: string) => `steps.${c.steps.findIndex((s) => s.stage === stage)}`;
  const itemsOf = (stage: string) => stepOf(stage)?.pages.flatMap((pg) => pg.items) ?? [];
  const durationOf = (stage: string) => sum(stepOf(stage)?.pages.map((pg) => pg.estimatedDurationS) ?? []);

  for (const stage of ['keywords', 'skim', 'detail', 'structure'] as const) {
    issues.check(durationOf(stage) === b.stages[stage].estimatedDurationS, pathOf(stage), `pages must add up to the brief's ${b.stages[stage].estimatedDurationS}s for ${stage}`);
    for (const page of stepOf(stage)?.pages ?? []) issues.check(page.timeLimitS === null, `${pathOf(stage)}.pages`, 'only exam pages have a countdown');
  }

  // Documents: main in skim, detail and structure; exam in the exam; each page starts with it.
  c.steps.forEach((step, si) => step.pages.forEach((page, pi) => {
    const doc = documentItem(page.items);
    const path = `steps.${si}.pages.${pi}`;
    if (!doc) return;
    issues.check(page.items[0] === doc, path, 'the document comes first on its page');
    const expected = step.stage === 'exam' ? 'exam' : 'main';
    issues.check(doc.documentId === expected, path, `the ${step.stage} stage shows the ${expected} document`);
    const view = step.stage === 'exam' ? 'exam' : step.stage === 'skim' ? 'skim' : 'open';
    issues.check(doc.view === view, path, `the ${step.stage} stage shows the document in ${view} view`);
    issues.check(view === 'skim' ? doc.skimSeconds === b.stages.skim.skimSeconds : doc.skimSeconds === null, path, view === 'skim' ? `skimSeconds must equal the brief's ${b.stages.skim.skimSeconds}` : 'only the skim view has skimSeconds');
  }));

  // 1. Key words: the list, then matching, both covering every key word.
  const keywordIds = b.keywords.map((k) => k.id);
  const keywordItems = itemsOf('keywords');
  const list = keywordItems.filter((i) => i.type === 'reading_keywords');
  const matching = keywordItems.filter((i) => i.type === 'reading_keyword_matching');
  issues.check(list.length === 1 && matching.length === 1 && keywordItems.length === 2, pathOf('keywords'), 'the keywords stage has one key word list and one matching');
  if (list[0]?.type === 'reading_keywords') issues.check(sameSet(list[0].keywordIds, keywordIds), pathOf('keywords'), 'the list shows every key word once');
  if (matching[0]?.type === 'reading_keyword_matching') issues.check(sameSet(matching[0].pairs.map((p) => p.keywordId), keywordIds), pathOf('keywords'), 'the matching pairs every key word once');

  // 2. Skim: one page, the document then one global question.
  const skimItems = itemsOf('skim');
  const skimQuestions = skimItems.filter((i) => i.type === 'reading_skim_choice');
  issues.check(stepOf('skim')?.pages.length === 1 && skimItems.length === 2 && skimQuestions.length === READING_LIMITS.skimQuestions && !!documentItem(skimItems), pathOf('skim'), 'the skim stage is one page: the document, then one reading_skim_choice');
  for (const q of skimQuestions) {
    if (q.type !== 'reading_skim_choice') continue;
    checkOptions(q, pathOf('skim'), issues);
    issues.check(q.focus === b.stages.skim.focus, pathOf('skim'), `the skim question asks about ${b.stages.skim.focus}`);
  }

  // 3. Detail: the planned questions in order, each page showing the open document.
  const detailQuestions = itemsOf('detail').filter(isQuestion);
  const planned = b.stages.detail.questions;
  issues.check(
    detailQuestions.length === planned.length && detailQuestions.every((q, i) => q.itemId === planned[i].id && q.type === planned[i].type),
    pathOf('detail'),
    `expected the brief's questions in order: ${planned.map((q) => `${q.id} (${q.type})`).join(', ')}`,
  );
  stepOf('detail')?.pages.forEach((page, pi) => {
    const path = `${pathOf('detail')}.pages.${pi}`;
    issues.check(!!documentItem(page.items), path, 'each detail page shows the document');
    issues.check(page.items.every((i) => i.type === 'reading_document' || isQuestion(i)), path, 'detail pages hold the document and questions only');
    page.items.forEach((item, ii) => isQuestion(item) && checkQuestion(item, main, level, `${path}.items.${ii}`, issues));
  });

  // 4. Structure: one task of the planned kind.
  const tasks = itemsOf('structure').filter((i) => i.type !== 'reading_document');
  const task = b.stages.structure.task;
  const sp = pathOf('structure');
  if (issues.check(stepOf('structure')?.pages.length === 1 && tasks.length === READING_LIMITS.structureTasks, sp, 'the structure stage is one page with one task')) {
    const item = tasks[0];
    const withDocument = !!documentItem(itemsOf('structure'));
    if (task === 'heading_matching') {
      if (issues.check(item.type === 'reading_part_heading_matching', sp, 'the brief plans heading matching') && item.type === 'reading_part_heading_matching') {
        issues.check(sameSet(item.pairs.map((p) => p.partId), main.parts), sp, 'pair every part of the main document once');
        issues.check(sameSet(item.headings.map((h) => h.headingId), item.pairs.map((p) => p.headingId)), sp, 'one heading per part, each used once');
        issues.unique(item.headings.map((h) => h.text), sp, 'heading text');
        issues.check(main.doc.parts.every((p) => p.heading === null), 'documents', 'with heading matching the main document shows no part headings');
      }
    } else if (issues.check(item.type === 'reading_order', sp, 'the brief plans an order task') && item.type === 'reading_order') {
      const pieceIds = item.pieces.map((p) => p.pieceId);
      issues.unique(pieceIds, sp, 'piece ID');
      for (const order of item.acceptedOrders) issues.check(sameSet(order, pieceIds), sp, 'each accepted order uses every piece exactly once');
      if (task === 'order_parts') {
        issues.check(item.mode === 'parts', sp, 'order_parts uses mode "parts"');
        issues.check(sameSet(item.pieces.map((p) => p.partId ?? ''), main.parts), sp, 'one piece per part of the main document');
        issues.check(!withDocument, sp, 'putting the parts back in order hides the document');
      } else {
        issues.check(item.mode === 'information', sp, 'order_information uses mode "information"');
        issues.check(item.pieces.every((p) => p.partId === null), sp, 'pieces of information do not stand for parts');
      }
    }
  }

  // 5. Exam: the planned pages, the exam document on each, five questions.
  const examStep = stepOf('exam');
  const examPlan = new Map(b.exam.pages.map((pg) => [pg.pageId, pg]));
  issues.check(sameSet(examStep?.pages.map((pg) => pg.pageId) ?? [], [...examPlan.keys()]), pathOf('exam'), 'exam pages must match the brief exam plan');
  examStep?.pages.forEach((page, pi) => {
    const path = `${pathOf('exam')}.pages.${pi}`;
    const plan = examPlan.get(page.pageId);
    const questions = page.items.filter(isQuestion);
    issues.check(!!documentItem(page.items), path, 'each exam page shows the exam document');
    issues.check(page.items.every((i) => i.type === 'reading_document' || isQuestion(i)), path, 'exam pages hold the document and questions only');
    if (plan) {
      issues.check(page.timeLimitS === plan.timeLimitS, `${path}.timeLimitS`, `must equal the brief's limit ${plan.timeLimitS}s`);
      issues.check(page.estimatedDurationS === plan.estimatedDurationS, `${path}.estimatedDurationS`, `must equal the brief's ${plan.estimatedDurationS}s`);
      issues.check(questions.length === plan.itemCount && questions.every((q) => plan.types.includes(q.type)), `${path}.items`, `page plan expects ${plan.itemCount} questions of type ${plan.types.join(' / ')}`);
    }
    page.items.forEach((item, ii) => isQuestion(item) && checkQuestion(item, exam, level, `${path}.items.${ii}`, issues));
  });
}
