import type { AcceptedAnswers, LocalizedText } from '../../schemas/artifactCommon.ts';
import type { Brief, LessonContent } from '../../schemas/artifacts.ts';
import type { Locale } from '../../schemas/common.ts';
import type { FunctionsBrief, FunctionsItem } from '../../schemas/functions.ts';
import type { GrammarItem } from '../../schemas/grammar.ts';
import { functionsTerms } from '../functionsLesson.ts';
import { indefinitePlural } from '../plural.ts';
import type { VocabularyItem, VocabularyTarget } from '../../schemas/vocabulary.ts';

/**
 * The flattened learner plan of a lesson (SPEC section 5): concrete pages in order, each
 * with its scorable answer units. Progress, scoring and results all read this plan; the
 * session itself only stores responses keyed by unit ID.
 */
export type PageRole = 'presentation' | 'practice' | 'exam';
export type Item = VocabularyItem | GrammarItem | FunctionsItem;

export interface Option {
  id: string;
  text: string;
  /** Learning-language text gets the course language; native labels get the mother tongue. */
  lang: 'learning' | 'native' | 'ui';
}

interface UnitBase {
  id: string;
  itemId: string;
  itemType: Item['type'];
  /** Short task line for results and screen readers; already resolved to the attempt's languages. */
  prompt: { learning?: string; native?: string; before?: string; after?: string };
  explanation: LocalizedText;
  /** Correct answer shown in feedback and results. */
  answer: string;
  answerLang: 'learning' | 'native' | 'ui';
  /** Extra learning-language form shown with the answer (e.g. un livre for a gender row). */
  form?: string;
  /** Learning-language text spoken by the audio control (listening items). */
  speak?: string;
  /** Grammar rules the item assesses, for rule-level error records in results (SPEC section 7). */
  ruleIds?: string[];
}
/**
 * A noun of a translation exam may also be answered as "des" + plural when the right gender is chosen
 * (P4-05 review); the gender is stored as the draft `${unitId}#gender`.
 */
export interface PluralAlternative { accepted: AcceptedAnswers; genders: string[] }
export type PlanUnit =
  | (UnitBase & { kind: 'text'; accepted: AcceptedAnswers; plural?: PluralAlternative })
  | (UnitBase & { kind: 'choice'; options: Option[]; correct: string[] })
  /** `distractors`: tokens that belong to no accepted order and stay in the bank (function exam replies). */
  | (UnitBase & { kind: 'order'; tokens: Option[]; acceptedOrders: string[][]; distractors?: string[] })
  | (UnitBase & { kind: 'spot'; tokens: Option[]; faultyTokenId: string; correction: { mode: 'type' | 'select'; accepted: AcceptedAnswers; choices: string[] } });

export interface PlanPage {
  index: number;
  pageId: string;
  stepId: string;
  stepIndex: number;
  stepLabel: LocalizedText;
  role: PageRole;
  estimatedDurationS: number;
  timeLimitS: number | null;
  instructions: LocalizedText;
  items: Item[];
  units: PlanUnit[];
  /** Grammar teaching block of the page's step; null for feedback, exam and vocabulary pages. */
  blockId: string | null;
  /** Application page without content items: the info page before the final exam (P2-03). */
  special?: 'examIntro';
}

export interface LessonPlan {
  lessonId: string;
  lang: string;
  title: string;
  objective: LocalizedText;
  estimatedMinutes: number;
  pages: PlanPage[];
  /** Scored steps in order, for the results menu. */
  steps: { stepId: string; label: LocalizedText; role: 'practice' | 'exam' | 'presentation' }[];
  /** Vocabulary targets by ID, for renderers that show teaching forms and translations. */
  targets: Map<string, VocabularyTarget>;
  /** Lesson category, shown on the start page. */
  kind: LessonContent['kind'];
  /** Vocabulary target groups from the brief (start page); empty for grammar. */
  groups: { id: string; label: LocalizedText; targetIds: string[] }[];
  /** Grammar: verbs the lesson introduces, with the mother-tongue translation (P3-07); empty otherwise. */
  newVerbs: { infinitive: string; translation: string }[];
  /** Function lessons: situation, roles, expressions and words of the brief (P4-04); undefined otherwise. */
  functions?: Pick<FunctionsBrief, 'situation' | 'roles' | 'expressions' | 'words'>;
}

const GENDER_OPTIONS = ['masculine', 'feminine', 'neuter'] as const;

/**
 * Builds the plan for one attempt; `motherTongue` fixes native prompts and labels. With
 * `interleaveGroups` (the learner session) each vocabulary group's introduction page is followed
 * directly by that group's flashcards (P2-02); with `examIntro` an info page precedes the final
 * exam (P2-03). Artifact previews use neither.
 */
export function buildPlan(content: LessonContent, brief: Brief, motherTongue: Locale, { interleaveGroups = false, examIntro = false } = {}): LessonPlan {
  const targets = new Map(brief.kind === 'vocabulary' ? brief.targets.map((t) => [t.id, t]) : []);
  const native = (map: Partial<Record<Locale, string>> | null | undefined) => map?.[motherTongue] ?? Object.values(map ?? {})[0] ?? '';
  const translation = (id: string) => targets.get(id)?.translations[motherTongue]?.[0] ?? id;
  const form = (id: string) => targets.get(id)?.teachingForm ?? id;
  const terms = brief.kind === 'functions' ? functionsTerms(brief) : new Map<string, never>();
  const termText = (id: string) => terms.get(id)?.display ?? id;
  const termNative = (id: string) => terms.get(id)?.translations[motherTongue]?.[0] ?? id;
  const roleLabel = (id: string) => (brief.kind === 'functions' ? brief.roles.find((r) => r.id === id)?.label : undefined) ?? id;
  const steps = content.steps as { id: string; role: string; blockId?: string | null; label: LocalizedText; pages: { pageId: string; estimatedDurationS: number; timeLimitS: number | null; instructions: LocalizedText; items: Item[] }[] }[];

  // A gap takes the expression itself, without the ellipsis of a sentence start.
  const expressionText = (id: string) => (brief.kind === 'functions' ? brief.expressions.find((e) => e.id === id)?.text : undefined) ?? id;
  const unitsOf = (pageId: string, item: Item): PlanUnit[] => {
    const id = (suffix = '') => `${pageId}/${item.itemId}${suffix}`;
    switch (item.type) {
      case 'vocabulary_matching': {
        const options = item.pairs.map((p) => ({ id: p.targetId, text: native(p.nativeLabel) || translation(p.targetId), lang: 'native' as const }));
        return item.pairs.map((p) => ({
          kind: 'choice', id: id(`/${p.targetId}`), itemId: item.itemId, itemType: item.type, prompt: { learning: form(p.targetId) },
          options, correct: [p.targetId], explanation: p.answerExplanation, answer: options.find((o) => o.id === p.targetId)!.text, answerLang: 'native',
        }));
      }
      case 'vocabulary_gender_select': {
        const lang = content.lang;
        const options = GENDER_OPTIONS.filter((g) => g !== 'neuter' || lang === 'de').map((g) => ({ id: g, text: `gender.${g}`, lang: 'ui' as const }));
        return item.rows.map((r) => {
          const t = targets.get(r.targetId);
          return {
            kind: 'choice', id: id(`/${r.targetId}`), itemId: item.itemId, itemType: item.type, prompt: { learning: t?.term ?? r.targetId },
            options, correct: [...(t?.genders ?? [])], explanation: r.answerExplanation, answer: `gender.${t?.genders[0] ?? 'masculine'}`, answerLang: 'ui', form: t?.teachingForm,
          };
        });
      }
      case 'vocabulary_typed_gap':
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: { before: item.before, after: item.after, native: translation(item.targetId) },
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning',
        }];
      case 'vocabulary_listening_choice':
        return [{
          kind: 'choice', id: id(), itemId: item.itemId, itemType: item.type, prompt: {}, speak: form(item.targetId),
          options: item.optionTargetIds.map((t) => ({ id: t, text: form(t), lang: 'learning' })), correct: [item.targetId],
          explanation: item.answerExplanation, answer: form(item.targetId), answerLang: 'learning',
        }];
      case 'vocabulary_translation_exam': {
        const target = targets.get(item.targetId);
        const plural = target && target.wordClass === 'noun' && target.number === 'singular' && !target.articleException ? pluralOf(item.accepted, target.genders) : undefined;
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: { native: native(item.prompt) },
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning', ...(plural ? { plural } : {}),
        }];
      }
      case 'vocabulary_listening_dictation':
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: {}, speak: form(item.targetId),
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning',
        }];
      case 'grammar_person_matching': {
        // One unit per French box on the right; its options are the persons on the left (P3-02 review).
        // A form shared by several persons (je parle, il parle) is right for each of them.
        const options = item.rows.map((r) => ({ id: r.person, text: item.mode === 'translation' ? native(r.native) : r.pronoun ?? '', lang: item.mode === 'translation' ? 'native' as const : 'learning' as const }));
        return item.rows.map((r) => ({
          kind: 'choice', id: id(`/${r.person}`), itemId: item.itemId, itemType: item.type, prompt: { learning: r.answer },
          options, correct: item.rows.filter((x) => x.answer === r.answer).map((x) => x.person),
          explanation: r.answerExplanation, answer: options.find((o) => o.id === r.person)!.text, answerLang: options[0].lang,
        }));
      }
      case 'grammar_pronoun_form_match': {
        const options = item.tokens.map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }));
        return item.rows.map((r) => ({
          kind: 'choice', id: id(`/${r.rowId}`), itemId: item.itemId, itemType: item.type, prompt: { learning: r.pronoun },
          options, correct: item.tokens.filter((t) => r.validForms.includes(t.text)).map((t) => t.tokenId),
          explanation: r.answerExplanation, answer: r.validForms[0], answerLang: 'learning',
        }));
      }
      case 'grammar_pronoun_form_typing':
        return item.rows.map((r) => ({
          kind: 'text', id: id(`/${r.rowId}`), itemId: item.itemId, itemType: item.type, prompt: { learning: r.pronoun },
          accepted: r.accepted, explanation: r.answerExplanation, answer: r.accepted.answers[0], answerLang: 'learning',
        }));
      case 'grammar_gap_choice':
        return [{
          kind: 'choice', id: id(), itemId: item.itemId, itemType: item.type, prompt: { before: item.before, after: item.after },
          options: item.choices.map((c) => ({ id: c.choiceId, text: c.text, lang: 'learning' })), correct: [item.answerChoiceId],
          explanation: item.answerExplanation, answer: item.choices.find((c) => c.choiceId === item.answerChoiceId)?.text ?? '', answerLang: 'learning',
        }];
      case 'grammar_gap_typing':
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: { before: item.before, after: item.after },
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning',
        }];
      case 'grammar_word_order': {
        const { tokens, acceptedOrders, answer } = wordOrder(item);
        return [{ kind: 'order', id: id(), itemId: item.itemId, itemType: item.type, prompt: {}, tokens, acceptedOrders, explanation: item.answerExplanation, answer, answerLang: 'learning' }];
      }
      case 'function_gender_select': {
        // As vocabulary stage 4 (P4-05 review): one choice per noun; other words show no gender.
        const words = brief.kind === 'functions' ? brief.words : [];
        const options = GENDER_OPTIONS.filter((g) => g !== 'neuter' || content.lang === 'de').map((g) => ({ id: g, text: `gender.${g}`, lang: 'ui' as const }));
        return item.ids.flatMap((wid) => {
          const w = words.find((x) => x.id === wid);
          if (!w || w.wordClass !== 'noun') return [];
          return [{
            kind: 'choice' as const, id: id(`/${wid}`), itemId: item.itemId, itemType: item.type, prompt: { learning: w.term },
            options, correct: [...w.genders], explanation: w.explanation, answer: `gender.${w.genders[0] ?? 'masculine'}`, answerLang: 'ui' as const, form: w.teachingForm,
          }];
        });
      }
      case 'function_matching': {
        const options = item.pairs.map((p) => ({ id: p.id, text: termNative(p.id), lang: 'native' as const }));
        return item.pairs.map((p) => ({
          kind: 'choice', id: id(`/${p.id}`), itemId: item.itemId, itemType: item.type, prompt: { learning: termText(p.id) },
          options, correct: [p.id], explanation: p.answerExplanation, answer: termNative(p.id), answerLang: 'native',
        }));
      }
      case 'function_word_order': {
        // Exam replies keep their distractors in the bank; role A's line is the context (SPEC section 8).
        const { tokens, acceptedOrders, answer } = wordOrder(item);
        const prompt = item.context ? { learning: `${roleLabel(item.context.roleId)}: ${item.context.text}` } : {};
        return [{ kind: 'order', id: id(), itemId: item.itemId, itemType: item.type, prompt, tokens, acceptedOrders, distractors: item.distractorTokenIds, explanation: item.answerExplanation, answer, answerLang: 'learning' }];
      }
      case 'function_translation_exam': {
        // As the vocabulary translation exam (P4-05 review), including "des" + plural with the gender.
        const word = brief.kind === 'functions' ? brief.words.find((w) => w.id === item.wordId) : undefined;
        const plural = word && word.wordClass === 'noun' ? pluralOf(item.accepted, word.genders) : undefined;
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: { native: native(item.prompt) },
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning', ...(plural ? { plural } : {}),
        }];
      }
      case 'function_listening_choice':
        // Audio first (P4-05 review): role A's line is spoken, the four replies are heard, not read.
        return [{
          kind: 'choice', id: id(), itemId: item.itemId, itemType: item.type, prompt: { learning: `${roleLabel(item.context.roleId)}: ${item.context.text}` }, speak: item.context.text,
          options: item.options.map((o) => ({ id: o.optionId, text: o.text, lang: 'learning' })), correct: [item.answerOptionId],
          explanation: item.answerExplanation, answer: item.options.find((o) => o.optionId === item.answerOptionId)?.text ?? '', answerLang: 'learning',
        }];
      case 'function_dialogue_gap_choice':
        return [{
          kind: 'choice', id: id(), itemId: item.itemId, itemType: item.type,
          prompt: { learning: `${roleLabel(item.context.roleId)}: ${item.context.text}`, before: item.before, after: item.after },
          options: item.choiceExpressionIds.map((e) => ({ id: e, text: expressionText(e), lang: 'learning' })), correct: [item.expressionId],
          explanation: item.answerExplanation, answer: expressionText(item.expressionId), answerLang: 'learning',
        }];
      case 'function_dialogue_gap_typing':
        // One unit per gap of the exam dialogue; the lines unroll on one timed page.
        return item.lines.flatMap((l) => (l.gap ? [{
          kind: 'text' as const, id: id(`/${l.gap.gapId}`), itemId: item.itemId, itemType: item.type, prompt: { before: l.before, after: l.after },
          accepted: l.gap.accepted, explanation: l.gap.answerExplanation, answer: l.gap.accepted.answers[0], answerLang: 'learning' as const,
        }] : []));
      case 'grammar_error_spotter': {
        const tokens = item.tokens.map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }));
        const sentence = tokens.map((t) => (t.id === item.faultyTokenId ? item.correction.accepted.answers[0] : t.text)).join(' ');
        return [{ kind: 'spot', id: id(), itemId: item.itemId, itemType: item.type, prompt: { learning: tokens.map((t) => t.text).join(' ') }, tokens, faultyTokenId: item.faultyTokenId, correction: item.correction, explanation: item.answerExplanation, answer: sentence, answerLang: 'learning' }];
      }
      case 'vocabulary_introduction':
      case 'vocabulary_flashcards':
      case 'vocabulary_overview':
      case 'grammar_explanation':
      case 'production_feedback_placeholder':
      case 'function_flashcards':
      case 'function_dialogue':
        return []; // presentation only
      default: {
        // A new item type must decide here whether it is scored (compile-time exhaustiveness).
        const unhandled: never = item;
        throw new Error(`No plan units defined for item type ${(unhandled as Item).type}`);
      }
    }
  };

  const pages: PlanPage[] = [];
  steps.forEach((step, stepIndex) => {
    for (const page of step.pages) {
      const units = page.items.flatMap((item) => unitsOf(page.pageId, item).map((u) => ('ruleIds' in item ? { ...u, ruleIds: item.ruleIds } : u)));
      pages.push({
        index: pages.length, pageId: page.pageId, stepId: step.id, stepIndex, stepLabel: step.label, blockId: step.blockId ?? null,
        role: step.role === 'exam' ? 'exam' : units.length ? 'practice' : 'presentation',
        estimatedDurationS: page.estimatedDurationS, timeLimitS: page.timeLimitS, instructions: page.instructions, items: page.items, units,
      });
    }
  });
  if (interleaveGroups) interleaveIntroductions(pages);
  if (examIntro) insertExamIntro(pages);
  return {
    lessonId: content.id, lang: content.lang, title: content.title, objective: content.objective, estimatedMinutes: content.estimatedMinutes, pages, targets,
    kind: content.kind, groups: brief.kind === 'vocabulary' ? brief.groups.map((g) => ({ id: g.id, label: g.label, targetIds: g.targetIds })) : [],
    newVerbs: brief.kind === 'grammar' ? brief.newVerbs.map((v) => ({ infinitive: v.infinitive, translation: native(v.translations) })) : [],
    functions: brief.kind === 'functions' ? { situation: brief.situation, roles: brief.roles, expressions: brief.expressions, words: brief.words } : undefined,
    steps: steps.map((s) => ({ stepId: s.id, label: s.label, role: s.role === 'exam' ? 'exam' : pages.some((p) => p.stepId === s.id && p.role === 'practice') ? 'practice' : 'presentation' })),
  };
}

/** The "des" + plural alternative of indefinite singular answers (un livre → des livres) with their genders. */
export function pluralOf(accepted: AcceptedAnswers, genders: readonly string[]): PluralAlternative | undefined {
  const answers = [...new Set(accepted.answers.map(indefinitePlural).filter((a): a is string => !!a))];
  return answers.length && genders.length ? { accepted: { answers, accentSensitive: accepted.accentSensitive }, genders: [...genders] } : undefined;
}

/**
 * Tokens and accepted orders of a word-order item. The full stop that ends every accepted sentence
 * is not a token to place: it is left out and not shown (P3-02 review). Punctuation inside the
 * sentence and a final ? or ! stay tokens.
 */
function wordOrder(item: { tokens: { tokenId: string; text: string }[]; acceptedOrders: string[][] }) {
  const last = item.acceptedOrders[0].at(-1);
  const stop = item.tokens.find((t) => t.tokenId === last && t.text === '.') && item.acceptedOrders.every((o) => o.at(-1) === last) ? last : undefined;
  const tokens = item.tokens.filter((t) => t.tokenId !== stop).map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }));
  const acceptedOrders = item.acceptedOrders.map((o) => o.filter((tid) => tid !== stop));
  const answer = acceptedOrders[0].map((tid) => tokens.find((t) => t.id === tid)?.text ?? '').join(' ');
  return { tokens, acceptedOrders, answer };
}

/**
 * Inserts the exam info page (P2-03) before the first exam page: it lists the exam pages with their
 * tasks and countdowns; the renderer builds its text from the following exam pages.
 */
function insertExamIntro(pages: PlanPage[]) {
  const first = pages.findIndex((p) => p.role === 'exam');
  if (first < 0) return;
  const exam = pages[first];
  pages.splice(first, 0, {
    index: first, pageId: 'exam-intro', stepId: exam.stepId, stepIndex: exam.stepIndex, stepLabel: exam.stepLabel, blockId: null, role: 'presentation',
    estimatedDurationS: 20, timeLimitS: null, instructions: exam.stepLabel, items: [], units: [], special: 'examIntro',
  });
  pages.forEach((p, n) => (p.index = n));
}

/** Reorders in place: intro 1, cards 1, intro 2, cards 2, … (pages paired by group order). */
function interleaveIntroductions(pages: PlanPage[]) {
  const isIntro = (p: PlanPage) => p.items.some((it) => it.type === 'vocabulary_introduction');
  const isCards = (p: PlanPage) => p.items.some((it) => it.type === 'vocabulary_flashcards');
  const intros = pages.filter(isIntro), cards = pages.filter(isCards);
  if (!intros.length || !cards.length) return;
  const start = pages.findIndex((p) => isIntro(p) || isCards(p));
  const merged = Array.from({ length: Math.max(intros.length, cards.length) }, (_, n) => [intros[n], cards[n]]).flat().filter((p): p is PlanPage => !!p);
  pages.splice(start, merged.length, ...merged);
  pages.forEach((p, n) => (p.index = n));
}

/** Deterministic pseudo-random order from the session seed (SPEC: runtime shuffle with a stored seed). */
export function seededOrder<T>(list: T[], seed: number, key: string): T[] {
  let h = seed >>> 0;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  const next = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
