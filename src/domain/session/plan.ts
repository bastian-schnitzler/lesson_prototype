import type { AcceptedAnswers, LocalizedText } from '../../schemas/artifactCommon.ts';
import type { Brief, LessonContent } from '../../schemas/artifacts.ts';
import type { Locale } from '../../schemas/common.ts';
import type { GrammarItem } from '../../schemas/grammar.ts';
import type { VocabularyItem, VocabularyTarget } from '../../schemas/vocabulary.ts';

/**
 * The flattened learner plan of a lesson (SPEC section 5): concrete pages in order, each
 * with its scorable answer units. Progress, scoring and results all read this plan; the
 * session itself only stores responses keyed by unit ID.
 */
export type PageRole = 'presentation' | 'practice' | 'exam';
export type Item = VocabularyItem | GrammarItem;

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
}
export type PlanUnit =
  | (UnitBase & { kind: 'text'; accepted: AcceptedAnswers })
  | (UnitBase & { kind: 'choice'; options: Option[]; correct: string[] })
  | (UnitBase & { kind: 'order'; tokens: Option[]; acceptedOrders: string[][] })
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
}

const GENDER_OPTIONS = ['masculine', 'feminine', 'neuter'] as const;

/** Builds the plan for one attempt; `motherTongue` fixes native prompts and labels. */
export function buildPlan(content: LessonContent, brief: Brief, motherTongue: Locale): LessonPlan {
  const targets = new Map(brief.kind === 'vocabulary' ? brief.targets.map((t) => [t.id, t]) : []);
  const native = (map: Partial<Record<Locale, string>> | null | undefined) => map?.[motherTongue] ?? Object.values(map ?? {})[0] ?? '';
  const translation = (id: string) => targets.get(id)?.translations[motherTongue]?.[0] ?? id;
  const form = (id: string) => targets.get(id)?.teachingForm ?? id;
  const steps = content.steps as { id: string; role: string; label: LocalizedText; pages: { pageId: string; estimatedDurationS: number; timeLimitS: number | null; instructions: LocalizedText; items: Item[] }[] }[];

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
      case 'vocabulary_translation_exam':
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: { native: native(item.prompt) },
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning',
        }];
      case 'vocabulary_listening_dictation':
        return [{
          kind: 'text', id: id(), itemId: item.itemId, itemType: item.type, prompt: {}, speak: form(item.targetId),
          accepted: item.accepted, explanation: item.answerExplanation, answer: item.accepted.answers[0], answerLang: 'learning',
        }];
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
        const tokens = item.tokens.map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }));
        const text = (order: string[]) => order.map((tid) => tokens.find((t) => t.id === tid)?.text ?? '').join(' ');
        return [{ kind: 'order', id: id(), itemId: item.itemId, itemType: item.type, prompt: {}, tokens, acceptedOrders: item.acceptedOrders, explanation: item.answerExplanation, answer: text(item.acceptedOrders[0]), answerLang: 'learning' }];
      }
      case 'grammar_error_spotter': {
        const tokens = item.tokens.map((t) => ({ id: t.tokenId, text: t.text, lang: 'learning' as const }));
        const sentence = tokens.map((t) => (t.id === item.faultyTokenId ? item.correction.accepted.answers[0] : t.text)).join(' ');
        return [{ kind: 'spot', id: id(), itemId: item.itemId, itemType: item.type, prompt: { learning: tokens.map((t) => t.text).join(' ') }, tokens, faultyTokenId: item.faultyTokenId, correction: item.correction, explanation: item.answerExplanation, answer: sentence, answerLang: 'learning' }];
      }
      default:
        return [];
    }
  };

  const pages: PlanPage[] = [];
  steps.forEach((step, stepIndex) => {
    for (const page of step.pages) {
      const units = page.items.flatMap((item) => unitsOf(page.pageId, item));
      pages.push({
        index: pages.length, pageId: page.pageId, stepId: step.id, stepIndex, stepLabel: step.label,
        role: step.role === 'exam' ? 'exam' : units.length ? 'practice' : 'presentation',
        estimatedDurationS: page.estimatedDurationS, timeLimitS: page.timeLimitS, instructions: page.instructions, items: page.items, units,
      });
    }
  });
  return {
    lessonId: content.id, lang: content.lang, title: content.title, objective: content.objective, estimatedMinutes: content.estimatedMinutes, pages, targets,
    steps: steps.map((s) => ({ stepId: s.id, label: s.label, role: s.role === 'exam' ? 'exam' : pages.some((p) => p.stepId === s.id && p.role === 'practice') ? 'practice' : 'presentation' })),
  };
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
