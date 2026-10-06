import type { z } from 'zod';

import { nativeLocales } from '../schemas/artifactCommon.ts';
import { briefSchema, contentSchema, isSupportedKind, type Brief, type LessonContent } from '../schemas/artifacts.ts';
import type { GrammarBrief, GrammarContent, GrammarItem } from '../schemas/grammar.ts';
import type { OutlineEntry } from '../schemas/outline.ts';
import { VOCABULARY_STAGES, type VocabularyBrief, type VocabularyContent, type VocabularyItem } from '../schemas/vocabulary.ts';

/**
 * Cross-reference and pedagogical checks that JSON Schema cannot express
 * (SPEC section 4). Schema validity is necessary but does not prove correct
 * teaching content; human review covers language quality.
 */

export interface Issue {
  path: string;
  message: string;
}

export type ArtifactStatus = 'valid' | 'invalid' | 'stale';

export interface ValidationResult<T> {
  status: ArtifactStatus;
  value?: T;
  issues: Issue[];
  /** Input-hash mismatches: the artifact is valid but was generated from older inputs. */
  staleReasons: string[];
}

export interface OutlineContext {
  entry: OutlineEntry;
  lang: string;
  level: string;
  /** Current per-entry outline hash; omitted to skip staleness checks. */
  outlineHash?: string;
}

class Issues {
  list: Issue[] = [];
  add(path: string, message: string) {
    this.list.push({ path, message });
  }
  check(ok: boolean, path: string, message: string) {
    if (!ok) this.add(path, message);
    return ok;
  }
  unique(values: string[], path: string, what: string) {
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v)) this.add(path, `duplicate ${what} ${v}`);
      seen.add(v);
    }
  }
}

function schemaIssues(error: z.ZodError): Issue[] {
  return error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Same members with the same multiplicity, in any order. */
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');

/** Corrections must name the mark, not only the character (D28). */
const CHARACTER_ONLY = /\bwritten with (an? )?[àâäçéèêëîïôöûùüÿœæ](?![\p{L}])/iu;

function checkEnvelope(v: Brief | LessonContent, ctx: OutlineContext, issues: Issues) {
  issues.check(v.id === ctx.entry.id, 'id', `must equal the outline ID ${ctx.entry.id}`);
  issues.check(v.kind === ctx.entry.kind, 'kind', `must equal the outline kind ${ctx.entry.kind}`);
  issues.check(v.lang === ctx.lang, 'lang', `must equal the course language ${ctx.lang}`);
  issues.check(v.level === ctx.level, 'level', `must equal the course level ${ctx.level}`);
  if (v.kind === 'grammar') issues.check(v.topic === ctx.entry.topic, 'topic', `must equal the outline topic ${ctx.entry.topic}`);
  else issues.check(v.theme === ctx.entry.theme, 'theme', `must equal the outline theme ${ctx.entry.theme}`);
}

function checkMinutes(estimatedMinutes: number, seconds: number, issues: Issues) {
  const expected = Math.max(1, Math.round(seconds / 60));
  issues.check(estimatedMinutes === expected, 'estimatedMinutes', `must equal the summed page estimates rounded to minutes (${expected})`);
}

/* ================================================================= briefs */

const ORAL_INTENT = /\b(oral|à l'oral|prononc|mündlich|aussprech|aussprache|aloud|pronounc|listen)/iu;
const FR_INDEFINITE = /^(un|une|des) \S/u;

function checkVocabularyBrief(b: VocabularyBrief, ctx: OutlineContext, issues: Issues) {
  const ids = b.targets.map((t) => t.id);
  const known = new Set(ids);
  issues.unique(ids, 'targets', 'target ID');
  issues.check(b.targets.length === b.targetCount, 'targetCount', `is ${b.targetCount} but ${b.targets.length} targets are listed`);
  issues.unique(b.groups.map((g) => g.id), 'groups', 'group ID');
  const grouped = b.groups.flatMap((g) => g.targetIds);
  issues.check(sameSet(grouped, ids) && grouped.length === ids.length, 'groups', 'every target must belong to exactly one group');

  b.targets.forEach((t, i) => {
    const p = `targets.${i}`;
    if (t.wordClass === 'noun') {
      issues.check(t.genders.length > 0, `${p}.genders`, 'a noun needs at least one accepted gender');
      issues.check(t.number !== null, `${p}.number`, 'a noun needs a grammatical number');
      if (ctx.lang === 'fr' && t.articleException === null) {
        for (const f of t.examForms) issues.check(FR_INDEFINITE.test(f), `${p}.examForms`, `"${f}" must include the indefinite article un/une/des (D39) or declare an articleException`);
      }
    } else {
      issues.check(t.genders.length === 0, `${p}.genders`, 'only nouns have a gender (D8)');
      issues.check(t.number === null, `${p}.number`, 'only nouns have a grammatical number here');
      issues.check(t.articleException === null, `${p}.articleException`, 'only nouns can have an article exception');
    }
    const words = new Set(t.examForms.flatMap((f) => f.toLowerCase().split(/\s+/)));
    for (const w of t.accentSensitive) issues.check(words.has(w.toLowerCase()), `${p}.accentSensitive`, `"${w}" is not a word of the exam forms`);
  });

  const hasNouns = b.targets.some((t) => t.wordClass === 'noun');
  issues.check(b.plan.genderOverview.scored === hasNouns, 'plan.genderOverview.scored', hasNouns ? 'must be true when the lesson has nouns' : 'must be false without nouns');

  const refs = (list: string[], path: string) => {
    issues.unique(list, path, 'target reference');
    for (const id of list) issues.check(known.has(id), path, `unknown target ${id}`);
  };
  refs(b.plan.typedGaps.targetIds, 'plan.typedGaps.targetIds');
  const listening = b.plan.listening;
  refs(listening.practiceTargetIds, 'plan.listening.practiceTargetIds');
  issues.check((listening.practiceTargetIds.length > 0) === (listening.estimatedDurationS !== null), 'plan.listening.estimatedDurationS', 'is set exactly when listening practice is planned');
  if (ORAL_INTENT.test(ctx.entry.intent)) issues.check(listening.required, 'plan.listening.required', 'must be true: the outline intent asks for oral recognition or pronunciation');

  const pages = b.plan.exam.pages;
  issues.unique(pages.map((pg) => pg.pageId), 'plan.exam.pages', 'page ID');
  const translated = pages.filter((pg) => pg.kind === 'translation').flatMap((pg) => pg.targetIds);
  issues.check(sameSet(translated, ids) && translated.length === ids.length, 'plan.exam.pages', 'every target needs exactly one translation exam item');
  pages.forEach((pg, i) => refs(pg.targetIds, `plan.exam.pages.${i}.targetIds`));
  const dictation = pages.some((pg) => pg.kind === 'listening_dictation');
  if (listening.required) {
    issues.check(listening.practiceTargetIds.length > 0, 'plan.listening.practiceTargetIds', 'required listening needs practice items');
    issues.check(dictation, 'plan.exam.pages', 'required listening needs a listening-dictation exam page');
  }

  const p = b.plan;
  checkMinutes(
    b.estimatedMinutes,
    p.introduction.estimatedDurationS +
      p.flashcards.estimatedDurationS +
      p.matching.estimatedDurationS +
      p.genderOverview.estimatedDurationS +
      p.typedGaps.estimatedDurationS +
      (p.listening.estimatedDurationS ?? 0) +
      sum(pages.map((pg) => pg.estimatedDurationS)),
    issues,
  );
}

function checkGrammarBrief(b: GrammarBrief, issues: Issues) {
  const rules = new Set(b.rules.map((r) => r.id));
  issues.unique(b.rules.map((r) => r.id), 'rules', 'rule ID');
  issues.unique(b.blocks.map((x) => x.id), 'blocks', 'block ID');
  issues.unique(b.blocks.flatMap((x) => x.exercises.map((e) => e.id)), 'blocks', 'exercise ID');
  issues.unique(b.exam.pages.map((pg) => pg.pageId), 'exam.pages', 'page ID');
  const taught = new Set<string>();
  b.blocks.forEach((block, i) => {
    for (const r of block.ruleIds) {
      issues.check(rules.has(r), `blocks.${i}.ruleIds`, `unknown rule ${r}`);
      taught.add(r);
    }
    block.exercises.forEach((ex, j) => {
      for (const r of ex.ruleIds) issues.check(block.ruleIds.includes(r), `blocks.${i}.exercises.${j}.ruleIds`, `rule ${r} is not taught in this block`);
    });
  });
  for (const r of rules) issues.check(taught.has(r), 'blocks', `rule ${r} is never taught`);
  const examined = new Set(b.exam.pages.flatMap((pg) => pg.ruleIds));
  b.exam.pages.forEach((pg, i) => {
    for (const r of pg.ruleIds) issues.check(rules.has(r), `exam.pages.${i}.ruleIds`, `unknown rule ${r}`);
  });
  for (const r of rules) issues.check(examined.has(r), 'exam.pages', `the exam does not cover rule ${r}`);
  checkMinutes(
    b.estimatedMinutes,
    sum(b.blocks.map((x) => x.explanationDurationS + sum(x.exercises.map((e) => e.estimatedDurationS)))) +
      b.feedbackPlaceholder.estimatedDurationS +
      sum(b.exam.pages.map((pg) => pg.estimatedDurationS)),
    issues,
  );
}

function finish<T>(value: T, issues: Issues, stale: string[]): ValidationResult<T> {
  if (issues.list.length) return { status: 'invalid', value, issues: issues.list, staleReasons: stale };
  return { status: stale.length ? 'stale' : 'valid', value, issues: [], staleReasons: stale };
}

export function validateBrief(data: unknown, ctx: OutlineContext): ValidationResult<Brief> {
  if (!isSupportedKind(ctx.entry.kind)) {
    return { status: 'invalid', issues: [{ path: 'kind', message: `${ctx.entry.kind} lessons have no agreed brief schema yet` }], staleReasons: [] };
  }
  const parsed = briefSchema(ctx.entry.kind, ctx.lang).safeParse(data);
  if (!parsed.success) return { status: 'invalid', issues: schemaIssues(parsed.error), staleReasons: [] };
  const brief = parsed.data;
  const issues = new Issues();
  checkEnvelope(brief, ctx, issues);
  if (brief.kind === 'vocabulary') checkVocabularyBrief(brief, ctx, issues);
  else checkGrammarBrief(brief, issues);
  const stale = ctx.outlineHash && brief.provenance.inputHashes.outline !== ctx.outlineHash ? ['the outline entry changed after this brief was generated'] : [];
  return finish(brief, issues, stale);
}

/* ================================================================ content */

export interface ContentContext extends OutlineContext {
  brief: Brief;
  /** Current canonical hash of the brief file; omitted to skip staleness checks. */
  briefHash?: string;
}

function checkExplanations(items: { answerExplanation?: { en: string } }[], path: string, issues: Issues) {
  for (const it of items) {
    if (it.answerExplanation && CHARACTER_ONLY.test(it.answerExplanation.en)) {
      issues.add(path, `explanation "${it.answerExplanation.en}" must name the mark (accent aigu, cédille, umlaut…), not only the character`);
    }
  }
}

const FR_ARTICLE_START = /^(un|une|des|le|la|les|l')(\s|$)|^l'/iu;

function checkVocabularyContent(c: VocabularyContent, b: VocabularyBrief, ctx: ContentContext, issues: Issues) {
  const targets = new Map(b.targets.map((t) => [t.id, t]));
  const allIds = b.targets.map((t) => t.id);
  const nouns = b.targets.filter((t) => t.wordClass === 'noun').map((t) => t.id);
  const roles = { introduction: 'introduction', flashcards: 'exercise', matching: 'exercise', overview: 'overview', practice: 'exercise', exam: 'exam' } as const;
  const allowed: Record<(typeof VOCABULARY_STAGES)[number], VocabularyItem['type'][]> = {
    introduction: ['vocabulary_introduction'],
    flashcards: ['vocabulary_flashcards'],
    matching: ['vocabulary_matching'],
    overview: [b.plan.genderOverview.scored ? 'vocabulary_gender_select' : 'vocabulary_overview'],
    practice: ['vocabulary_typed_gap', 'vocabulary_listening_choice'],
    exam: ['vocabulary_translation_exam', 'vocabulary_listening_dictation'],
  };
  const known = (id: string, path: string) => issues.check(targets.has(id), path, `unknown target ${id}`);
  const covered: Record<string, string[]> = {};
  const examPlan = new Map(b.plan.exam.pages.map((pg) => [pg.pageId, pg]));

  c.steps.forEach((step, si) => {
    const sp = `steps.${si}`;
    const stage = VOCABULARY_STAGES[si];
    issues.check(step.stage === stage, `${sp}.stage`, `expected stage ${stage} (six-stage order)`);
    issues.check(step.role === roles[step.stage], `${sp}.role`, `stage ${step.stage} uses role ${roles[step.stage]}`);
    step.pages.forEach((page, pi) => {
      const pp = `${sp}.pages.${pi}`;
      if (step.stage === 'exam') {
        const plan = examPlan.get(page.pageId);
        if (issues.check(plan !== undefined, `${pp}.pageId`, `exam page ${page.pageId} is not in the brief's exam plan`) && plan) {
          issues.check(page.timeLimitS === plan.timeLimitS, `${pp}.timeLimitS`, `must equal the brief's limit ${plan.timeLimitS}s`);
          const kind = plan.kind === 'translation' ? 'vocabulary_translation_exam' : 'vocabulary_listening_dictation';
          issues.check(page.items.every((it) => it.type === kind), `${pp}.items`, `page plan expects ${kind} items`);
          const pageTargets = page.items.map((it) => ('targetId' in it ? it.targetId : ''));
          issues.check(sameSet(pageTargets, plan.targetIds) && pageTargets.length === plan.targetIds.length, `${pp}.items`, 'items must match the planned targets');
        }
      } else {
        issues.check(page.timeLimitS === null, `${pp}.timeLimitS`, 'practice pages have no countdown');
      }
      page.items.forEach((item, ii) => {
        const ip = `${pp}.items.${ii}`;
        if (!issues.check(allowed[step.stage].includes(item.type), `${ip}.type`, `${item.type} is not allowed in stage ${step.stage}`)) return;
        (covered[item.type] ??= []).push(...('targetIds' in item ? item.targetIds : 'targetId' in item ? [item.targetId] : []));
        switch (item.type) {
          case 'vocabulary_introduction':
          case 'vocabulary_flashcards':
          case 'vocabulary_overview':
            item.targetIds.forEach((id) => known(id, ip));
            break;
          case 'vocabulary_matching': {
            issues.check(item.pairs.length <= b.plan.matching.groupSize, ip, `group has ${item.pairs.length} pairs; the plan allows ${b.plan.matching.groupSize}`);
            (covered.matching ??= []).push(...item.pairs.map((pr) => pr.targetId));
            for (const locale of nativeLocales(ctx.lang)) {
              const labels = item.pairs.map((pr) => pr.nativeLabel?.[locale] ?? targets.get(pr.targetId)?.translations[locale]?.[0] ?? '');
              issues.unique(labels, `${ip}.pairs`, `${locale} label`);
            }
            item.pairs.forEach((pr) => known(pr.targetId, ip));
            checkExplanations(item.pairs, ip, issues);
            break;
          }
          case 'vocabulary_gender_select':
            issues.check(sameSet(item.targetIds, allIds), ip, 'the gender page lists every target');
            issues.check(sameSet(item.rows.map((r) => r.targetId), nouns) && item.rows.length === nouns.length, ip, 'gender rows must be exactly the nouns');
            checkExplanations(item.rows, ip, issues);
            break;
          case 'vocabulary_typed_gap': {
            known(item.targetId, ip);
            const refs = item.referenceTargetIds;
            issues.check(new Set(refs).size === 4 && refs.includes(item.targetId), ip, 'four distinct reference targets including the answer');
            refs.forEach((id) => known(id, ip));
            if (ctx.lang === 'fr') for (const a of item.accepted.answers) issues.check(a === 'un' && targets.get(item.targetId)?.wordClass === 'numeral' || !FR_ARTICLE_START.test(a), ip, `typed-gap answer "${a}" must be article-free`);
            const others = refs.filter((id) => id !== item.targetId).map((id) => targets.get(id)?.term.toLowerCase());
            issues.check(!item.accepted.answers.some((a) => others.includes(a.toLowerCase())), ip, 'exactly one reference choice may fit the gap');
            checkExplanations([item], ip, issues);
            break;
          }
          case 'vocabulary_listening_choice':
            known(item.targetId, ip);
            issues.check(new Set(item.optionTargetIds).size === 4 && item.optionTargetIds.includes(item.targetId), ip, 'four distinct options including the answer');
            item.optionTargetIds.forEach((id) => known(id, ip));
            checkExplanations([item], ip, issues);
            break;
          case 'vocabulary_translation_exam':
          case 'vocabulary_listening_dictation': {
            const t = targets.get(item.targetId);
            if (!known(item.targetId, ip) || !t) break;
            for (const f of t.examForms) issues.check(item.accepted.answers.includes(f), ip, `accepted answers must include the exam form "${f}"`);
            if (item.type === 'vocabulary_listening_dictation') issues.check(item.accepted.answers.includes(t.teachingForm), ip, `dictation must accept the spoken teaching form "${t.teachingForm}"`);
            if (item.type === 'vocabulary_translation_exam' && t.genderVariants.length) {
              const acceptsAll = t.genderVariants.every((v) => item.accepted.answers.includes(v));
              const hinted = nativeLocales(ctx.lang).every((l) => item.prompt[l] !== t.translations[l]?.[0]);
              issues.check(acceptsAll || hinted, ip, 'prompt must disambiguate gender/number in every mother tongue, or accept every gender variant');
            }
            checkExplanations([item], ip, issues);
            break;
          }
        }
      });
    });
  });

  const exact = (list: string[] | undefined, expected: string[], what: string) =>
    issues.check(sameSet(list ?? [], expected) && (list ?? []).length === expected.length, 'steps', `${what} must cover each planned target exactly once`);
  exact(covered.vocabulary_introduction, allIds, 'the introduction');
  exact(covered.vocabulary_flashcards, allIds, 'flashcards');
  exact(covered.matching, allIds, 'matching');
  exact(covered.vocabulary_typed_gap, b.plan.typedGaps.targetIds, 'typed gaps');
  exact(covered.vocabulary_listening_choice, b.plan.listening.practiceTargetIds, 'listening practice');
  const examPages = c.steps[5]?.pages.map((pg) => pg.pageId) ?? [];
  issues.check(sameSet(examPages, [...examPlan.keys()]), 'steps.5.pages', 'exam pages must match the brief exam plan');
}

function checkGrammarItem(item: GrammarItem, path: string, rules: Set<string>, exam: boolean, issues: Issues) {
  if ('ruleIds' in item) for (const r of item.ruleIds) issues.check(rules.has(r), `${path}.ruleIds`, `unknown rule ${r}`);
  const tokens = 'tokens' in item ? item.tokens : [];
  issues.unique(tokens.map((t) => t.tokenId), path, 'token ID');
  switch (item.type) {
    case 'grammar_gap_choice':
      issues.unique(item.choices.map((ch) => ch.choiceId), path, 'choice ID');
      issues.unique(item.choices.map((ch) => ch.text), path, 'choice text');
      issues.check(item.choices.some((ch) => ch.choiceId === item.answerChoiceId), path, 'answerChoiceId must be one of the choices');
      break;
    case 'grammar_gap_typing':
      if (exam) issues.check(item.hint === null, path, 'exam gaps have no hint');
      break;
    case 'grammar_pronoun_form_match':
      issues.unique(item.rows.map((r) => r.rowId), path, 'row ID');
      for (const r of item.rows) issues.check(tokens.some((t) => r.validForms.includes(t.text)), path, `row ${r.rowId} has no token with a valid form`);
      checkExplanations(item.rows, path, issues);
      break;
    case 'grammar_pronoun_form_typing':
      issues.unique(item.rows.map((r) => r.rowId), path, 'row ID');
      checkExplanations(item.rows, path, issues);
      break;
    case 'grammar_word_order': {
      const all = tokens.map((t) => t.tokenId);
      for (const order of item.acceptedOrders) issues.check(order.length === all.length && sameSet(order, all), path, 'each accepted order uses every token exactly once');
      break;
    }
    case 'grammar_error_spotter': {
      const faulty = tokens.find((t) => t.tokenId === item.faultyTokenId);
      if (issues.check(faulty !== undefined, path, 'faultyTokenId must be one of the tokens') && faulty) {
        issues.check(!item.correction.accepted.answers.includes(faulty.text), path, 'the correction must differ from the faulty token');
      }
      if (item.correction.mode === 'select') {
        issues.check(item.correction.choices.length >= 2 && item.correction.choices.some((ch) => item.correction.accepted.answers.includes(ch)), path, 'select mode needs 2–4 choices including an accepted answer');
      } else {
        issues.check(item.correction.choices.length === 0, path, 'type mode has no choices');
      }
      break;
    }
  }
  if ('answerExplanation' in item) checkExplanations([item], path, issues);
}

function checkGrammarContent(c: GrammarContent, b: GrammarBrief, issues: Issues) {
  const rules = new Set(b.rules.map((r) => r.id));
  // Expected sequence: per block one explanation step, then one step per planned exercise; feedback; exam.
  const expected: { role: string; blockId: string | null; exercise?: GrammarBrief['blocks'][number]['exercises'][number] }[] = [];
  for (const block of b.blocks) {
    expected.push({ role: 'explanation', blockId: block.id });
    for (const ex of block.exercises) expected.push({ role: 'exercise', blockId: block.id, exercise: ex });
  }
  expected.push({ role: 'feedback', blockId: null }, { role: 'exam', blockId: null });
  if (!issues.check(c.steps.length === expected.length, 'steps', `expected ${expected.length} steps from the brief's blocks, exercises, feedback and exam`)) return;
  const examPlan = new Map(b.exam.pages.map((pg) => [pg.pageId, pg]));

  c.steps.forEach((step, si) => {
    const want = expected[si];
    const sp = `steps.${si}`;
    issues.check(step.role === want.role && step.blockId === want.blockId, sp, `expected a ${want.role} step${want.blockId ? ` for block ${want.blockId}` : ''}`);
    const items = step.pages.flatMap((pg) => pg.items);
    if (want.role === 'explanation') issues.check(items.every((it) => it.type === 'grammar_explanation'), sp, 'explanation steps contain explanations only');
    if (want.role === 'feedback') issues.check(items.length === 1 && items[0].type === 'production_feedback_placeholder', sp, 'the feedback step is the fixed production placeholder');
    if (want.exercise) {
      issues.check(items.every((it) => it.type === want.exercise!.type), sp, `planned exercise ${want.exercise.id} is ${want.exercise.type}`);
      issues.check(items.length === want.exercise.itemCount, sp, `planned exercise ${want.exercise.id} has ${want.exercise.itemCount} items`);
    }
    step.pages.forEach((page, pi) => {
      const pp = `${sp}.pages.${pi}`;
      if (want.role === 'exam') {
        const plan = examPlan.get(page.pageId);
        if (issues.check(plan !== undefined, `${pp}.pageId`, `exam page ${page.pageId} is not in the brief's exam plan`) && plan) {
          issues.check(page.timeLimitS === plan.timeLimitS, `${pp}.timeLimitS`, `must equal the brief's limit ${plan.timeLimitS}s`);
          issues.check(page.items.every((it) => it.type === plan.type) && page.items.length === plan.itemCount, `${pp}.items`, `page plan expects ${plan.itemCount} ${plan.type} items`);
        }
      } else {
        issues.check(page.timeLimitS === null, `${pp}.timeLimitS`, 'only exam pages have a countdown');
      }
      page.items.forEach((item, ii) => checkGrammarItem(item, `${pp}.items.${ii}`, rules, want.role === 'exam', issues));
    });
  });
  const examPages = c.steps[c.steps.length - 1].pages.map((pg) => pg.pageId);
  issues.check(sameSet(examPages, [...examPlan.keys()]), 'steps', 'exam pages must match the brief exam plan');
}

export function validateContent(data: unknown, ctx: ContentContext): ValidationResult<LessonContent> {
  if (!isSupportedKind(ctx.entry.kind)) {
    return { status: 'invalid', issues: [{ path: 'kind', message: `${ctx.entry.kind} lessons have no agreed content schema yet` }], staleReasons: [] };
  }
  const parsed = contentSchema(ctx.entry.kind, ctx.lang).safeParse(data);
  if (!parsed.success) return { status: 'invalid', issues: schemaIssues(parsed.error), staleReasons: [] };
  const content = parsed.data;
  const issues = new Issues();
  checkEnvelope(content, ctx, issues);

  type AnyPage = { pageId: string; estimatedDurationS: number; items: { itemId: string }[] };
  const steps: { id: string; pages: AnyPage[] }[] = content.steps;
  const pages = steps.flatMap((s) => s.pages);
  issues.unique(steps.map((s) => s.id), 'steps', 'step ID');
  issues.unique(pages.map((p) => p.pageId), 'steps', 'page ID');
  issues.unique(pages.flatMap((p) => p.items.map((i) => i.itemId)), 'steps', 'item ID');
  checkMinutes(content.estimatedMinutes, sum(pages.map((p) => p.estimatedDurationS)), issues);

  if (content.kind === 'vocabulary' && ctx.brief.kind === 'vocabulary') checkVocabularyContent(content, ctx.brief, ctx, issues);
  else if (content.kind === 'grammar' && ctx.brief.kind === 'grammar') checkGrammarContent(content, ctx.brief, issues);

  const stale: string[] = [];
  if (ctx.outlineHash && content.provenance.inputHashes.outline !== ctx.outlineHash) stale.push('the outline entry changed after this content was generated');
  if (ctx.briefHash && content.provenance.inputHashes.brief !== ctx.briefHash) stale.push('the brief changed after this content was generated');
  return finish(content, issues, stale);
}
