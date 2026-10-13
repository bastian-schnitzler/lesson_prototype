/**
 * Hand-authoring aid for function lessons (P4-03): turns a compact definition written by Claude in
 * `authoring/functions/<id>.ts` into the brief and the lesson content (SPEC section 8, D51). It
 * splits token and gap notation, finds the expressions a dialogue line uses, derives page estimates,
 * exam limits, minutes and input hashes from the page rules, validates both files and writes them.
 * No model calls.
 *
 *   node scripts/author-functions.ts <lesson-id> [--dry-run]
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { sha256 } from './catalog.ts';
import { briefInputHash } from '../src/catalog/scan.ts';
import { functionsPageEstimate, functionsTimeLimit } from '../src/domain/functionsLesson.ts';
import { FUNCTIONS_COPY } from '../src/domain/lessonCopy.ts';
import { chunk } from '../src/domain/vocabularyLesson.ts';
import type { LocalizedText } from '../src/schemas/artifactCommon.ts';
import { FUNCTIONS_PAGE_RULES, type FunctionsBrief, type FunctionsContent, type FunctionsItem } from '../src/schemas/functions.ts';
import { validateBrief, validateContent } from '../src/validation/artifacts.ts';
import { catalogContexts } from '../generator/briefs.ts';

export { L, type FunctionsDefinition } from './author-functions-definition.ts';
import type { FunctionsDefinition } from './author-functions-definition.ts';

const list = (x: string | string[]) => (Array.isArray(x) ? x : [x]);
const plain = (s: string) => s.normalize('NFC').toLowerCase().replace(/[’ʼ]/g, "'").replace(/\s+/g, ' ').replace(/[\s.!?…]+$/u, '').trim();
const tokensOf = (spec: string, start = 1) => spec.split(' | ').map((text, n) => ({ tokenId: `t${n + start}`, text: text.trim() }));

/** Expressions a line uses: every expression whose text occurs in it. */
const usedIn = (def: FunctionsDefinition, line: string) => def.expressions.filter((e) => plain(line).includes(plain(e.text))).map((e) => e.id);

function splitGap(line: string, marker: RegExp) {
  const m = marker.exec(line);
  if (!m) throw new Error(`no gap in "${line}"`);
  return { before: line.slice(0, m.index).trim(), inner: m[1] ?? '', after: line.slice(m.index + m[0].length).trim() };
}

export function buildFunctionsLesson(def: FunctionsDefinition, root = resolve(import.meta.dirname, '..')) {
  const dir = join(root, 'content');
  const ctx = catalogContexts(dir).find((c) => c.entry.id === def.id);
  if (!ctx) throw new Error(`no outline entry ${def.id}`);
  if (ctx.entry.kind !== 'functions') throw new Error(`${def.id} is a ${ctx.entry.kind} lesson`);
  const now = new Date().toISOString();
  const native = (en: string, de: string) => ({ en, de }) as Record<'en' | 'fr' | 'de', string>;
  const expression = (id: string) => {
    const e = def.expressions.find((x) => x.id === id);
    if (!e) throw new Error(`unknown expression ${id}`);
    return e;
  };

  // Native maps hold every mother tongue except the learning language (D38), which the static type cannot express.
  const brief = {
    schemaVersion: 2, id: def.id, lang: ctx.lang, level: ctx.level as FunctionsBrief['level'], locales: ['en', 'fr', 'de'], title: def.title, objective: def.objective, estimatedMinutes: 1,
    provenance: { generator: 'claude-code-direct-authoring', model: 'claude-opus-5-5', promptVersion: 'functions-v1', generatedAt: now, inputHashes: { outline: ctx.outlineHash! } },
    kind: 'functions', theme: ctx.entry.theme!, situation: def.situation, coverageNotes: def.coverageNotes, prerequisites: def.prerequisites ?? [],
    roles: def.roles.map((r) => ({ id: r.id, label: r.label, translation: native(r.en, r.de) })),
    expressions: def.expressions.map((e) => ({
      id: e.id, text: e.text, openEnd: e.openEnd ?? false, translations: { en: list(e.en), de: list(e.de) }, explanation: e.explanation,
      example: { text: e.example[0], translation: native(e.example[1], e.example[2]) },
    })),
    words: def.words.map((w) => ({
      id: w.id, term: w.term, teachingForm: w.form, translations: { en: list(w.en), de: list(w.de) }, wordClass: w.wordClass ?? 'noun',
      genders: (w.wordClass ?? 'noun') === 'noun' ? w.genders ?? ['masculine'] : [], explanation: w.explanation,
      example: { text: w.example[0], translation: native(w.example[1], w.example[2]) },
    })),
    scoring: { practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 },
  } as FunctionsBrief;

  const wordOrder = (itemId: string, e: string, spec: string, explanation: LocalizedText, context?: [string, string], role?: string, distractors: string[] = []): FunctionsItem => {
    const tokens = tokensOf(spec);
    const extra = distractors.map((text, n) => ({ tokenId: `t${tokens.length + n + 1}`, text }));
    return {
      type: 'function_word_order', itemId, expressionId: e, context: context ? { roleId: context[0], text: context[1] } : null, roleId: role ?? null,
      tokens: [...tokens, ...extra], distractorTokenIds: extra.map((t) => t.tokenId), acceptedOrders: [tokens.map((t) => t.tokenId)], answerExplanation: explanation,
    };
  };
  type Page = FunctionsContent['steps'][number]['pages'][number];
  const page = (pageId: string, instructions: LocalizedText, items: FunctionsItem[], exam = false): Page => {
    const estimate = functionsPageEstimate(items, exam);
    return { pageId, estimatedDurationS: estimate, timeLimitS: exam ? functionsTimeLimit(estimate) : null, instructions, items };
  };
  const expressionIds = def.expressions.map((e) => e.id), wordIds = def.words.map((w) => w.id);
  const matching = (side: 'expressions' | 'words', ids: string[], n: number): FunctionsItem => ({
    type: 'function_matching', itemId: `match-${side}-${n}`, side,
    pairs: ids.map((id) => ({ id, answerExplanation: side === 'expressions' ? expression(id).explanation : def.words.find((w) => w.id === id)!.explanation })),
  });
  const replyPages = chunk(def.replies, FUNCTIONS_PAGE_RULES.replyPageSize);

  const steps: FunctionsContent['steps'] = [
    // Words first: the example sentences often use them (P4-05 review).
    { id: 'flashcards', stage: 'flashcards', role: 'presentation', label: FUNCTIONS_COPY.flashcards[0], pages: [
      ...(wordIds.length ? [page('cards-words', FUNCTIONS_COPY.wordCards, [{ type: 'function_flashcards', itemId: 'cards-words', side: 'words', ids: wordIds }])] : []),
      page('cards-expressions', FUNCTIONS_COPY.flashcards[1], [{ type: 'function_flashcards', itemId: 'cards-expressions', side: 'expressions', ids: expressionIds }]),
    ] },
    { id: 'dialogue', stage: 'dialogue', role: 'presentation', label: FUNCTIONS_COPY.dialogue[0], pages: [
      page('dialogue', FUNCTIONS_COPY.dialogue[1], [{
        type: 'function_dialogue', itemId: 'dialogue',
        lines: def.dialogue.map(([role, fr, en, de, note], n) => ({ lineId: `line-${n + 1}`, roleId: role, text: fr, translation: native(en, de), note, expressionIds: usedIn(def, fr) })),
      }]),
    ] },
    { id: 'matching', stage: 'matching', role: 'exercise', label: FUNCTIONS_COPY.matching[0], pages: [
      ...chunk(expressionIds, FUNCTIONS_PAGE_RULES.matchingPageSize).map((ids, n) => page(`match-expressions-${n + 1}`, FUNCTIONS_COPY.matching[1], [matching('expressions', ids, n + 1)])),
      ...(wordIds.length ? [page('match-words-1', FUNCTIONS_COPY.wordMatching, [matching('words', wordIds, 1)])] : []),
    ] },
    ...(wordIds.length ? [{ id: 'gender', stage: 'gender' as const, role: 'exercise' as const, label: FUNCTIONS_COPY.gender[0], pages: [
      page('gender', FUNCTIONS_COPY.gender[1], [{ type: 'function_gender_select', itemId: 'gender', ids: wordIds }]),
    ] }] : []),
    { id: 'word-order', stage: 'word_order', role: 'exercise', label: FUNCTIONS_COPY.wordOrder[0], pages:
      def.wordOrder.map(([e, spec, explanation], n) => page(`order-${n + 1}`, FUNCTIONS_COPY.wordOrder[1], [wordOrder(`order-${n + 1}`, e, spec, explanation)])) },
    { id: 'dialogue-gaps', stage: 'dialogue_gaps', role: 'exercise', label: FUNCTIONS_COPY.dialogueGaps[0], pages: def.gaps.map((g, n) => {
      const { before, after } = splitGap(g.line, /___/);
      return page(`gap-${n + 1}`, FUNCTIONS_COPY.dialogueGaps[1], [{
        type: 'function_dialogue_gap_choice', itemId: `gap-${n + 1}`, expressionId: g.e, context: { roleId: g.context[0], text: g.context[1] }, roleId: g.role,
        before, after, choiceExpressionIds: [g.e, ...g.choices], answerExplanation: g.explanation,
      }]);
    }) },
    { id: 'exam', stage: 'exam', role: 'exam', label: FUNCTIONS_COPY.exam[0], pages: [
      ...replyPages.map((replies, p) => page(`exam-replies-${p + 1}`, FUNCTIONS_COPY.exam[1], replies.map((r) => {
        const n = def.replies.indexOf(r) + 1;
        return wordOrder(`reply-${n}`, r.e, r.reply, r.explanation, r.context, r.role, r.distractors);
      }), true)),
      page('exam-dialogue', FUNCTIONS_COPY.examDialogue, [{
        type: 'function_dialogue_gap_typing', itemId: 'exam-dialogue',
        lines: def.examDialogue.map(([role, line, en, de, explanation], n) => {
          const translation = native(en, de);
          if (!line.includes('[')) return { lineId: `exam-line-${n + 1}`, roleId: role, before: line, translation, gap: null, after: '' };
          const { before, inner, after } = splitGap(line, /\[([^\]]+)\]/);
          const answers = inner.split(' / ').map((a) => a.trim());
          // The first answer names the expression; further answers are accepted alternatives.
          const e = def.expressions.find((x) => plain(answers[0]) === plain(x.text));
          if (!e) throw new Error(`the first answer of gap [${inner}] is no expression of the lesson`);
          if (!explanation) throw new Error(`gap [${inner}] needs an explanation`);
          return { lineId: `exam-line-${n + 1}`, roleId: role, before, translation, gap: { gapId: `gap-${n + 1}`, expressionId: e.id, accepted: { answers, accentSensitive: [] }, answerExplanation: explanation }, after };
        }),
      }], true),
    ] },
  ];
  const minutes = Math.max(1, Math.round(steps.flatMap((s) => s.pages).reduce((n, p) => n + p.estimatedDurationS, 0) / 60));
  brief.estimatedMinutes = minutes;
  const briefText = JSON.stringify(brief, null, 2) + '\n';
  const briefHash = briefInputHash(JSON.parse(briefText), sha256);
  const content: FunctionsContent = {
    schemaVersion: 2, id: def.id, lang: brief.lang, level: brief.level, locales: brief.locales, title: def.title, objective: def.objective, estimatedMinutes: minutes,
    provenance: { generator: 'claude-code-direct-authoring', model: 'claude-opus-5-5', promptVersion: 'functions-v1', generatedAt: now, inputHashes: { outline: ctx.outlineHash!, brief: briefHash } },
    kind: 'functions', theme: brief.theme, steps,
  };
  const contentText = JSON.stringify(content, null, 2) + '\n';

  const briefResult = validateBrief(JSON.parse(briefText), ctx);
  const contentResult = briefResult.value ? validateContent(JSON.parse(contentText), { ...ctx, brief: briefResult.value, briefHash }) : undefined;
  const examGaps = def.examDialogue.filter(([, line]) => line.includes('[')).length;
  const nouns = def.words.filter((w) => (w.wordClass ?? 'noun') === 'noun').length;
  const practice = expressionIds.length * 3 + wordIds.length + nouns;
  return {
    briefText, contentText, dir,
    report: `${def.id}: ${expressionIds.length} expressions, ${wordIds.length} words, ${practice} practice units, ${def.replies.length + examGaps} exam units on ${replyPages.length + 1} pages, ${minutes} min`,
    issues: [
      ...briefResult.issues.map((i) => `brief ${i.path}: ${i.message}`),
      ...(contentResult?.issues ?? []).map((i) => `content ${i.path}: ${i.message}`),
      ...(contentResult ? [] : ['content not checked: the brief is invalid']),
    ],
    stale: [...briefResult.staleReasons, ...(contentResult?.staleReasons ?? [])],
  };
}

if (import.meta.main) {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { 'dry-run': { type: 'boolean', default: false } } });
  let failed = false;
  for (const id of positionals) {
    const { default: def } = (await import(resolve(import.meta.dirname, '..', 'authoring', 'functions', `${id}.ts`))) as { default: FunctionsDefinition };
    const built = buildFunctionsLesson(def);
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
