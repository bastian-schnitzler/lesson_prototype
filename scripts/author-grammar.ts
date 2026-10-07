/**
 * Hand-authoring aid for grammar lessons (P3-07): turns a compact lesson definition written by Claude
 * in `authoring/grammar/<id>.ts` (helpers in scripts/author-grammar-items.ts) into the brief and the lesson content, computes page estimates, exam
 * limits, minutes, rule coverage and input hashes from the SPEC section 7 rules, validates both files
 * and writes them. No model calls.
 *
 *   node scripts/author-grammar.ts <lesson-id> [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { sha256 } from './catalog.ts';
import { briefInputHash } from '../src/catalog/scan.ts';
import { COPY, EXERCISE_INSTRUCTIONS } from '../src/domain/lessonCopy.ts';
import { MESSAGES } from '../src/i18n/messages.ts';
import type { LocalizedText } from '../src/schemas/artifactCommon.ts';
import type { GrammarBrief, GrammarContent, GrammarExerciseType, GrammarItem } from '../src/schemas/grammar.ts';
import { L, type Draft, type Item, type LessonDefinition } from './author-grammar-items.ts';
import { validateBrief, validateContent } from '../src/validation/artifacts.ts';
import { catalogContexts } from '../generator/briefs.ts';

/* -------------------------------------------------------------- estimates */

/** Guide seconds per scored unit (SPEC section 7, "Lesson length"). */
const SECONDS: Record<Item['type'], number> = {
  grammar_gap_choice: 10, grammar_gap_typing: 15, grammar_word_order: 25, grammar_error_spotter: 25,
  grammar_pronoun_form_match: 10, grammar_pronoun_form_typing: 15, grammar_person_matching: 8,
};
const units = (item: Draft) => ('rows' in item ? item.rows.length : 1);
const seconds = (item: Draft) => SECONDS[item.type] * units(item);
const roundUp10 = (s: number) => Math.ceil(s / 10) * 10;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const rulesOf = (items: Draft[]) => [...new Set(items.flatMap((i) => i.ruleIds))];

/** Unique exercise-step labels: the exercise name, numbered when a type repeats (results menu). */
function exerciseLabels(types: GrammarExerciseType[]): LocalizedText[] {
  const seen = new Map<string, number>();
  return types.map((type) => {
    const total = types.filter((t) => t === type).length;
    const n = (seen.get(type) ?? 0) + 1;
    seen.set(type, n);
    const name = (locale: 'en' | 'fr' | 'de') => MESSAGES[locale][`exercise.${type}`] + (total > 1 ? ` ${n}` : '');
    return L(name('en'), name('fr'), name('de'));
  });
}

/* ------------------------------------------------------------------ build */

export function buildLesson(def: LessonDefinition, root = resolve(import.meta.dirname, '..')) {
  const dir = join(root, 'content');
  const oldBrief = JSON.parse(readFileSync(join(dir, 'briefs', `${def.id}.json`), 'utf8')) as GrammarBrief;
  const oldContent = JSON.parse(readFileSync(join(dir, 'lessons', `${def.id}.json`), 'utf8')) as GrammarContent;
  const ctx = catalogContexts(dir).find((c) => c.entry.id === def.id);
  if (!ctx) throw new Error(`no outline entry ${def.id}`);
  const now = new Date().toISOString();

  const blocks = def.blocks.map((b) => {
    const old = oldBrief.blocks.find((x) => x.id === b.id);
    const oldExplanation = oldContent.steps.find((s) => s.role === 'explanation' && s.blockId === b.id)?.pages[0].items[0];
    const explanation = b.explanation ?? (oldExplanation?.type === 'grammar_explanation' ? { heading: oldExplanation.heading, text: oldExplanation.text, formTable: oldExplanation.formTable, examples: oldExplanation.examples } : undefined);
    if (!old && !(b.title && b.ruleIds && b.explanationPlan && b.examples && explanation)) throw new Error(`new block ${b.id} needs every field`);
    return {
      id: b.id, title: b.title ?? old!.title, ruleIds: b.ruleIds ?? old!.ruleIds, explanationPlan: b.explanationPlan ?? old!.explanationPlan,
      explanationDurationS: Math.min(180, Math.max(60, old?.explanationDurationS ?? 120)),
      examples: b.examples ?? old!.examples, pitfalls: b.pitfalls ?? old!.pitfalls, explanation: explanation!,
      exercises: b.exercises,
    };
  });

  const brief: GrammarBrief = {
    ...oldBrief,
    estimatedMinutes: 1,
    provenance: { generator: 'claude-code-direct-authoring', model: 'claude-opus-5-5', promptVersion: 'brief-v7', generatedAt: now, inputHashes: { outline: ctx.outlineHash! } },
    scopeBoundaries: def.scopeBoundaries ?? oldBrief.scopeBoundaries,
    rules: def.rules ?? oldBrief.rules,
    blocks: blocks.map((b) => ({
      id: b.id, title: b.title, ruleIds: b.ruleIds, explanationPlan: b.explanationPlan, explanationDurationS: b.explanationDurationS, examples: b.examples, pitfalls: b.pitfalls,
      exercises: b.exercises.map((e) => ({ id: e.id, type: e.type, itemCount: e.items.length, ruleIds: rulesOf(e.items), estimatedDurationS: sum(e.items.map(seconds)) })),
    })),
    newVerbs: def.newVerbs as GrammarBrief['newVerbs'],
    feedbackPlaceholder: { estimatedDurationS: 30 },
    exam: { pages: def.exam.map((p) => ({ pageId: p.pageId, type: p.type, itemCount: p.items.length, ruleIds: rulesOf(p.items), estimatedDurationS: sum(p.items.map(seconds)), timeLimitS: roundUp10(1.5 * sum(p.items.map(seconds))) })) },
  };
  const total = sum(brief.blocks.map((b) => b.explanationDurationS + sum(b.exercises.map((e) => e.estimatedDurationS)))) + 30 + sum(brief.exam.pages.map((p) => p.estimatedDurationS));
  brief.estimatedMinutes = Math.max(1, Math.round(total / 60));
  // Keep the brief's key order stable (newVerbs after blocks).
  const orderedBrief = Object.fromEntries(Object.keys({ ...oldBrief, newVerbs: null }).map((k) => [k, brief[k as keyof GrammarBrief]])) as GrammarBrief;

  const labels = exerciseLabels(blocks.flatMap((b) => b.exercises.map((e) => e.type)));
  let labelIndex = 0;
  const steps: GrammarContent['steps'] = [];
  for (const b of blocks) {
    steps.push({ id: `${b.id}-explanation`, role: 'explanation', blockId: b.id, label: b.title, pages: [{ pageId: `${b.id}-explanation`, estimatedDurationS: b.explanationDurationS, timeLimitS: null, instructions: COPY.explanation[1], items: [{ type: 'grammar_explanation', itemId: `${b.id}-explanation`, ruleIds: b.ruleIds, ...b.explanation }] }] });
    for (const e of b.exercises) {
      steps.push({
        id: e.id, role: 'exercise', blockId: b.id, label: labels[labelIndex++],
        pages: e.items.map((item, n) => ({ pageId: `${e.id}-${n + 1}`, estimatedDurationS: seconds(item), timeLimitS: null, instructions: EXERCISE_INSTRUCTIONS[e.type], items: [{ ...item, itemId: `${e.id}-${n + 1}` } as GrammarItem] })),
      });
    }
  }
  steps.push(oldContent.steps.find((s) => s.role === 'feedback')!);
  steps.push({
    id: 'exam', role: 'exam', blockId: null, label: COPY.grammarExam[0],
    pages: def.exam.map((p, i) => ({ pageId: p.pageId, estimatedDurationS: brief.exam.pages[i].estimatedDurationS, timeLimitS: brief.exam.pages[i].timeLimitS, instructions: EXERCISE_INSTRUCTIONS[p.type], items: p.items.map((item, n) => ({ ...item, itemId: `${p.pageId}-${n + 1}` } as GrammarItem)) })),
  });
  const briefText = JSON.stringify(orderedBrief, null, 2) + '\n';
  const content: GrammarContent = {
    ...oldContent,
    estimatedMinutes: Math.max(1, Math.round(sum(steps.flatMap((s) => s.pages.map((p) => p.estimatedDurationS))) / 60)),
    steps,
    provenance: { generator: 'claude-code-direct-authoring', model: 'claude-opus-5-5', promptVersion: 'content-v4', generatedAt: now, inputHashes: { outline: ctx.outlineHash!, brief: briefInputHash(JSON.parse(briefText), sha256) } },
  };
  const contentText = JSON.stringify(content, null, 2) + '\n';

  const briefResult = validateBrief(JSON.parse(briefText), ctx);
  const contentResult = briefResult.value ? validateContent(JSON.parse(contentText), { ...ctx, brief: briefResult.value, briefHash: briefInputHash(JSON.parse(briefText), sha256) }) : undefined;
  const practice = sum(blocks.flatMap((b) => b.exercises.flatMap((e) => e.items.map(units))));
  const exam = sum(def.exam.flatMap((p) => p.items.map(units)));
  return {
    briefText, contentText, dir,
    report: `${def.id}: ${practice} practice units, ${exam} exam units on ${def.exam.length} pages, ${brief.estimatedMinutes} min`,
    issues: [...briefResult.issues.map((i) => `brief ${i.path}: ${i.message}`), ...(contentResult?.issues ?? []).map((i) => `content ${i.path}: ${i.message}`), ...(contentResult ? [] : ['content not checked: the brief is invalid'])],
    stale: [...briefResult.staleReasons, ...(contentResult?.staleReasons ?? [])],
  };
}

if (import.meta.main) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false } } });
  let failed = false;
  for (const id of positionals) {
    const { default: def } = (await import(resolve(import.meta.dirname, '..', 'authoring', 'grammar', `${id}.ts`))) as { default: LessonDefinition };
    const built = buildLesson(def);
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
