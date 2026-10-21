/**
 * Hand-authoring aid for reading lessons (P5-02, SPEC section 9). Claude writes the brief and the lesson
 * content directly as JSON in content/briefs and content/lessons; there are no separate definition files.
 * A new lesson file may be a short draft that holds only its own text:
 *
 *   { "documents": [...], "skim": { question, options, answerOptionId, answerExplanation },
 *     "detail": [questions], "structure": { instructions?, pieces, acceptedOrders, answerExplanation },
 *     "exam": [5 questions] }
 *
 * The tool derives everything else: the envelope and provenance, the six steps with their labels, page IDs
 * and instructions, the flashcard, matching and document items, `skimSeconds` (word count at the skim
 * speed; a value already in the file is kept, so it can be changed by hand), page estimates, the exam
 * limit, the minutes, the brief's target words and exam types, and the input hashes. It validates both
 * files and writes them when they pass. No model calls.
 *
 *   node scripts/author-reading.ts <lesson-id>… | --all [--dry-run]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { sha256 } from './catalog.ts';
import { briefInputHash } from '../src/catalog/scan.ts';
import { documentWords, readingMinutes, readingPageEstimate, readingSkimSeconds, readingTimeLimit } from '../src/domain/readingLesson.ts';
import { READING_COPY } from '../src/domain/lessonCopy.ts';
import type { Level } from '../src/schemas/common.ts';
import { READING_STAGES, type ReadingBrief, type ReadingContent, type ReadingDocument, type ReadingItem, type ReadingStage } from '../src/schemas/reading.ts';
import { validateBrief, validateContent } from '../src/validation/artifacts.ts';
import { catalogContexts } from '../generator/briefs.ts';

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Question = Extract<ReadingItem, { type: 'reading_choice' | 'reading_true_false' }>;

/** The hand-written part of a lesson: from a draft, or read back from a full lesson file. */
function lessonParts(lesson: Json) {
  if (!lesson.steps) return lesson as { documents: ReadingDocument[]; skim: Json; detail: Question[]; structure: Json; exam: Question[] };
  const items = (stage: ReadingStage): ReadingItem[] => lesson.steps.find((s: Json) => s.stage === stage).pages[0].items;
  const page = (stage: ReadingStage) => lesson.steps.find((s: Json) => s.stage === stage).pages[0];
  const { type: _skim, itemId: _skimId, focus: _focus, ...skim } = items('skim')[1] as Extract<ReadingItem, { type: 'reading_skim_choice' }>;
  const { type: _order, itemId: _orderId, ...order } = items('structure')[1] as Extract<ReadingItem, { type: 'reading_order' }>;
  const skimDoc = items('skim')[0] as Extract<ReadingItem, { type: 'reading_document' }>;
  return {
    documents: lesson.documents as ReadingDocument[],
    skim: { ...skim, skimSeconds: skimDoc.skimSeconds },
    detail: items('detail').slice(1) as Question[],
    structure: { instructions: page('structure').instructions, ...order },
    exam: items('exam').slice(1) as Question[],
  };
}

export function buildReadingLesson(id: string, root = resolve(import.meta.dirname, '..')) {
  const dir = join(root, 'content');
  const ctx = catalogContexts(dir).find((c) => c.entry.id === id);
  if (!ctx) throw new Error(`no outline entry ${id}`);
  if (ctx.entry.kind !== 'reading') throw new Error(`${id} is a ${ctx.entry.kind} lesson`);
  const level = ctx.level as Level;
  const draft: Json = JSON.parse(readFileSync(join(dir, 'briefs', `${id}.json`), 'utf8'));
  const parts = lessonParts(JSON.parse(readFileSync(join(dir, 'lessons', `${id}.json`), 'utf8')));
  const documents = new Map(parts.documents.map((d) => [d.documentId, d]));
  const main = documents.get('main'), examDoc = documents.get('exam');
  if (!main || !examDoc) throw new Error(`${id}: the lesson needs a main and an exam document`);
  const now = new Date().toISOString();
  const keywordIds: string[] = draft.keywords.map((k: Json) => k.id);
  const provenance = (inputHashes: { outline: string; brief?: string }) => ({ generator: 'claude-code-direct-authoring', model: 'claude-opus-5-5', promptVersion: 'reading-v1', generatedAt: now, inputHashes });

  const skimSeconds = parts.skim.skimSeconds ?? readingSkimSeconds(main, level);
  const { skimSeconds: _s, ...skimQuestion } = parts.skim;
  const { instructions: structureInstructions, ...order } = parts.structure;
  const items: Record<ReadingStage, ReadingItem[]> = {
    flashcards: [{ type: 'reading_flashcards', itemId: 'cards', keywordIds }],
    matching: [{ type: 'reading_keyword_matching', itemId: 'matching', keywordIds }],
    skim: [{ type: 'reading_document', itemId: 'skim-document', documentId: 'main', view: 'skim', skimSeconds }, { type: 'reading_skim_choice', itemId: 'skim-question', focus: draft.skim.focus, ...skimQuestion }],
    detail: [{ type: 'reading_document', itemId: 'detail-document', documentId: 'main', view: 'open', skimSeconds: null }, ...parts.detail],
    structure: [{ type: 'reading_document', itemId: 'structure-document', documentId: 'main', view: 'open', skimSeconds: null }, { type: 'reading_order', itemId: 'order', ...order }],
    exam: [{ type: 'reading_document', itemId: 'exam-document', documentId: 'exam', view: 'exam', skimSeconds: null }, ...parts.exam],
  };
  const steps = READING_STAGES.map((stage) => {
    const estimate = readingPageEstimate(items[stage], documents, level, stage === 'exam');
    const [label, instructions] = READING_COPY[stage];
    return {
      id: stage, stage, role: stage === 'exam' ? 'exam' as const : 'exercise' as const, label,
      pages: [{ pageId: stage, estimatedDurationS: estimate, timeLimitS: stage === 'exam' ? readingTimeLimit(estimate) : null, instructions: stage === 'structure' && structureInstructions ? structureInstructions : instructions, items: items[stage] }],
    };
  });
  const minutes = readingMinutes(steps.map((s) => s.pages[0].estimatedDurationS));

  // Native maps hold every mother tongue except the learning language (D38), which the static type cannot express.
  const brief = {
    schemaVersion: 2, id, lang: ctx.lang, level, locales: ['en', 'fr', 'de'], title: draft.title, objective: draft.objective, estimatedMinutes: minutes,
    provenance: provenance({ outline: ctx.outlineHash! }),
    kind: 'reading', theme: ctx.entry.theme!, genre: draft.genre, situation: draft.situation, readerTask: draft.readerTask, keywords: draft.keywords,
    documents: {
      main: { targetWords: documentWords(main), contents: draft.documents.main.contents },
      exam: { targetWords: documentWords(examDoc), contents: draft.documents.exam.contents },
    },
    skim: { focus: draft.skim.focus },
    detailQuestions: draft.detailQuestions,
    exam: { types: [...new Set(parts.exam.map((q) => q.type))] },
    scoring: { practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 },
  } as ReadingBrief;
  const briefText = JSON.stringify(brief, null, 2) + '\n';
  const briefHash = briefInputHash(JSON.parse(briefText), sha256);
  const content: ReadingContent = {
    schemaVersion: 2, id, lang: brief.lang, level, locales: brief.locales, title: brief.title, objective: brief.objective, estimatedMinutes: minutes,
    provenance: provenance({ outline: ctx.outlineHash!, brief: briefHash }),
    kind: 'reading', theme: brief.theme, genre: brief.genre, documents: [main, examDoc], steps,
  };
  const contentText = JSON.stringify(content, null, 2) + '\n';

  const briefResult = validateBrief(JSON.parse(briefText), ctx);
  const contentResult = briefResult.value ? validateContent(JSON.parse(contentText), { ...ctx, brief: briefResult.value, briefHash }) : undefined;
  return {
    briefText, contentText, dir,
    report: `${id}: ${level}, ${keywordIds.length} key words, ${documentWords(main)} + ${documentWords(examDoc)} words, skim ${skimSeconds} s, ${parts.detail.length} detail questions, ${minutes} min`,
    issues: [
      ...briefResult.issues.map((i) => `brief ${i.path}: ${i.message}`),
      ...(contentResult?.issues ?? []).map((i) => `content ${i.path}: ${i.message}`),
      ...(contentResult ? [] : ['content not checked: the brief is invalid']),
    ],
    stale: [...briefResult.staleReasons, ...(contentResult?.staleReasons ?? [])],
  };
}

if (import.meta.main) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false }, all: { type: 'boolean', default: false } } });
  const root = resolve(import.meta.dirname, '..');
  const ids = values.all
    ? readdirSync(join(root, 'content', 'briefs')).map((f) => f.replace(/\.json$/, '')).filter((id) => catalogContexts(join(root, 'content')).find((c) => c.entry.id === id)?.entry.kind === 'reading')
    : positionals;
  let failed = false;
  for (const id of ids) {
    const built = buildReadingLesson(id, root);
    console.log(built.report);
    if (built.issues.length || built.stale.length) {
      failed = true;
      for (const issue of [...built.issues, ...built.stale]) console.error(`  ${issue}`);
      continue;
    }
    if (!values['dry-run']) {
      writeFileSync(join(built.dir, 'briefs', `${id}.json`), built.briefText);
      writeFileSync(join(built.dir, 'lessons', `${id}.json`), built.contentText);
      console.log('  written');
    }
  }
  if (failed) process.exitCode = 1;
}
