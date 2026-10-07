import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256 } from '../scripts/catalog.ts';
import { briefInputHash } from '../src/catalog/scan.ts';
import { vocabularyExamAnswers } from '../src/domain/vocabularyAnswers.ts';
import { ARTIFACT_SCHEMA_VERSION, type LocalizedText } from '../src/schemas/artifactCommon.ts';
import { isSupportedKind } from '../src/schemas/artifacts.ts';
import type { GrammarBrief } from '../src/schemas/grammar.ts';
import type { VocabularyBrief } from '../src/schemas/vocabulary.ts';
import { validateBrief, validateContent, type Issue, type OutlineContext } from '../src/validation/artifacts.ts';
import { catalogContexts, generateBrief, runBatch, type BriefOptions, type BriefOutcome } from './briefs.ts';
import { CONTENT_PROMPT_VERSION, contentPrompt, grammarSections, normalizeLocalIds, vocabularySections, type Section } from './contentPrompts.ts';
import { GenerationError } from './gemini.ts';
import { toStructuredSchema } from './prompts.ts';
import { isCode, ModelUnit, withFileLock } from './units.ts';

/* ------------------------------------------------------------ fixed copy */

const L = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de });

/** Step labels and page instructions are application copy, not generated text. */
const COPY = {
  introduction: [L('Introduction', 'Introduction', 'Einführung'), L('Read the introduction and listen to the new words.', 'Lisez l’introduction et écoutez les nouveaux mots.', 'Lies die Einführung und hör dir die neuen Wörter an.')],
  flashcards: [L('Flashcards', 'Cartes mémoire', 'Karteikarten'), L('Recall each word, then turn the card to check it.', 'Rappelez-vous chaque mot, puis retournez la carte pour vérifier.', 'Erinnere dich an jedes Wort und dreh dann die Karte um.')],
  matching: [L('Matching', 'Association', 'Zuordnen'), L('Match each word with its translation.', 'Associez chaque mot à sa traduction.', 'Ordne jedem Wort seine Übersetzung zu.')],
  gender: [L('Gender and overview', 'Genre et vue d’ensemble', 'Genus und Übersicht'), L('Choose the gender of each noun, then review all words.', 'Choisissez le genre de chaque nom, puis revoyez tous les mots.', 'Wähle das Genus jedes Nomens und sieh dir dann alle Wörter an.')],
  overview: [L('Overview', 'Vue d’ensemble', 'Übersicht'), L('Review all words of this lesson.', 'Revoyez tous les mots de cette leçon.', 'Sieh dir alle Wörter dieser Lektion an.')],
  practice: [L('Practice', 'Entraînement', 'Übung'), L('Choose the right word and type it.', 'Choisissez le bon mot et écrivez-le.', 'Wähle das richtige Wort und schreibe es.')],
  listening: [L('Listening', 'Écoute', 'Hören'), L('Listen and choose the word you hear.', 'Écoutez et choisissez le mot entendu.', 'Hör zu und wähle das Wort, das du hörst.')],
  exam: [L('Final exam', 'Examen final', 'Abschlussprüfung'), L('Translate each word into French, with its article for nouns.', 'Traduisez chaque mot en français, avec l’article pour les noms.', 'Übersetze jedes Wort ins Französische, bei Nomen mit Artikel.')],
  dictation: [L('Dictation', 'Dictée', 'Diktat'), L('Listen and write the word, with its article for nouns.', 'Écoutez et écrivez le mot, avec l’article pour les noms.', 'Hör zu und schreib das Wort, bei Nomen mit Artikel.')],
  explanation: [L('Explanation', 'Explication', 'Erklärung'), L('Read the explanation and the examples.', 'Lisez l’explication et les exemples.', 'Lies die Erklärung und die Beispiele.')],
  feedback: [L('Your feedback', 'Votre retour', 'Dein Feedback'), L('Continue to the final exam.', 'Passez à l’examen final.', 'Weiter zur Abschlussprüfung.')],
  grammarExam: [L('Final exam', 'Examen final', 'Abschlussprüfung'), L('Answer every item before the time runs out.', 'Répondez à chaque question avant la fin du temps imparti.', 'Beantworte jede Aufgabe, bevor die Zeit abläuft.')],
} as const;

const EXERCISE_INSTRUCTIONS = {
  grammar_pronoun_form_match: L('Choose the form for each pronoun.', 'Choisissez la forme pour chaque pronom.', 'Wähle die Form für jedes Pronomen.'),
  grammar_pronoun_form_typing: L('Type the form for each pronoun.', 'Écrivez la forme pour chaque pronom.', 'Schreib die Form zu jedem Pronomen.'),
  grammar_gap_choice: L('Choose the word that completes the sentence.', 'Choisissez le mot qui complète la phrase.', 'Wähle das Wort, das den Satz ergänzt.'),
  grammar_gap_typing: L('Type the missing words.', 'Écrivez les mots manquants.', 'Schreib die fehlenden Wörter.'),
  grammar_word_order: L('Put the words in the right order.', 'Mettez les mots dans le bon ordre.', 'Bring die Wörter in die richtige Reihenfolge.'),
  grammar_error_spotter: L('Find the wrong word and correct it.', 'Trouvez le mot faux et corrigez-le.', 'Finde das falsche Wort und korrigiere es.'),
} as const;

/** Splits a planned duration over n pages: whole seconds, at least 5 each, summing to the plan where possible. */
export function splitDuration(total: number, n: number): number[] {
  const base = Math.max(5, Math.floor(total / n));
  const rest = Math.max(0, total - base * n);
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

const chunk = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

/* -------------------------------------------------------------- assembly */

type Payloads = Record<string, unknown>;
/** Problems found while assembling, attributed to the section that must be repaired. */
type SectionIssues = Map<string, string[]>;
const blame = (issues: SectionIssues, key: string, message: string) => issues.set(key, [...(issues.get(key) ?? []), message]);

function byTarget<T extends { targetId: string }>(list: T[], key: string, expected: string[], issues: SectionIssues): Map<string, T> {
  const map = new Map(list.map((x) => [x.targetId, x]));
  for (const id of expected) if (!map.has(id)) blame(issues, key, `missing entry for target ${id}`);
  for (const x of list) if (!expected.includes(x.targetId)) blame(issues, key, `unexpected target ${x.targetId}`);
  return map;
}

function assembleVocabulary(brief: VocabularyBrief, sections: ReturnType<typeof vocabularySections>, p: Payloads, issues: SectionIssues) {
  type S = typeof sections;
  const intro = p.introduction as ReturnTypeOf<S['introduction']['schema']>;
  const words = p.words as ReturnTypeOf<S['words']['schema']>;
  const practice = p.practice as ReturnTypeOf<S['practice']['schema']>;
  const exam = p.exam as ReturnTypeOf<S['exam']['schema']>;
  const targets = new Map(brief.targets.map((t) => [t.id, t]));
  const plan = brief.plan;
  const all = brief.targets.map((t) => t.id);
  const nouns = brief.targets.filter((t) => t.wordClass === 'noun').map((t) => t.id);

  const introTexts = new Map(intro.groups.map((g) => [g.groupId, g.text]));
  for (const g of brief.groups) if (!introTexts.has(g.id)) blame(issues, 'introduction', `missing text for group ${g.id}`);
  const word = byTarget(words.targets, 'words', all, issues);
  for (const id of nouns) if (!word.get(id)?.genderExplanation) blame(issues, 'words', `genderExplanation is required for noun ${id}`);
  const gaps = byTarget(practice.typedGaps, 'practice', plan.typedGaps.targetIds, issues);
  const listens = byTarget(practice.listening, 'practice', plan.listening.practiceTargetIds, issues);
  const translationIds = plan.exam.pages.filter((pg) => pg.kind === 'translation').flatMap((pg) => pg.targetIds);
  const dictationIds = plan.exam.pages.filter((pg) => pg.kind === 'listening_dictation').flatMap((pg) => pg.targetIds);
  const translations = byTarget(exam.translation, 'exam', translationIds, issues);
  const dictations = byTarget(exam.dictation, 'exam', dictationIds, issues);
  if (issues.size) return undefined;

  const answers = (id: string, prompt?: LocalizedText) => {
    const t = targets.get(id)!;
    return { answers: vocabularyExamAnswers(t, brief.lang, prompt), accentSensitive: t.accentSensitive };
  };
  const pages = <T>(list: T[], total: number, make: (x: T, durationS: number, n: number) => object) => {
    const durations = splitDuration(total, list.length);
    return list.map((x, n) => make(x, durations[n], n));
  };
  const step = (id: string, stage: string, role: string, copy: readonly [LocalizedText, LocalizedText], stepPages: object[]) => ({ id, stage, role, label: copy[0], pages: stepPages });
  const page = (pageId: string, estimatedDurationS: number, instructions: LocalizedText, items: object[], timeLimitS: number | null = null) => ({ pageId, estimatedDurationS, timeLimitS, instructions, items });
  const matchingGroups = brief.groups.flatMap((g) => chunk(g.targetIds, plan.matching.groupSize));
  const practicePages = [
    ...pages(plan.typedGaps.targetIds, plan.typedGaps.estimatedDurationS, (id, d) => {
      const g = gaps.get(id)!;
      return page(`gap-${id}`, d, COPY.practice[1], [{ type: 'vocabulary_typed_gap', itemId: `gap-${id}`, targetId: id, before: g.before, after: g.after, referenceTargetIds: g.referenceTargetIds, accepted: g.accepted, answerExplanation: g.answerExplanation }]);
    }),
    ...(plan.listening.practiceTargetIds.length && plan.listening.estimatedDurationS !== null
      ? pages(plan.listening.practiceTargetIds, plan.listening.estimatedDurationS, (id, d) => {
          const l = listens.get(id)!;
          return page(`listen-${id}`, d, COPY.listening[1], [{ type: 'vocabulary_listening_choice', itemId: `listen-${id}`, targetId: id, optionTargetIds: l.optionTargetIds, answerExplanation: l.answerExplanation }]);
        })
      : []),
  ];

  return {
    kind: 'vocabulary',
    theme: brief.theme,
    steps: [
      step('introduction', 'introduction', 'introduction', COPY.introduction, pages(brief.groups, plan.introduction.estimatedDurationS, (g, d) =>
        page(`intro-${g.id}`, d, COPY.introduction[1], [{ type: 'vocabulary_introduction', itemId: `intro-${g.id}`, targetIds: g.targetIds, text: introTexts.get(g.id)! }]))),
      step('flashcards', 'flashcards', 'exercise', COPY.flashcards, pages(brief.groups, plan.flashcards.estimatedDurationS, (g, d) =>
        page(`cards-${g.id}`, d, COPY.flashcards[1], [{ type: 'vocabulary_flashcards', itemId: `cards-${g.id}`, targetIds: g.targetIds }]))),
      step('matching', 'matching', 'exercise', COPY.matching, pages(matchingGroups, plan.matching.estimatedDurationS, (ids, d, n) =>
        page(`match-${n + 1}`, d, COPY.matching[1], [{
          type: 'vocabulary_matching', itemId: `match-${n + 1}`,
          pairs: ids.map((id) => ({ targetId: id, nativeLabel: word.get(id)!.matchingLabel, answerExplanation: word.get(id)!.matchingExplanation })),
        }]))),
      plan.genderOverview.scored
        ? step('overview', 'overview', 'overview', COPY.gender, [page('overview', plan.genderOverview.estimatedDurationS, COPY.gender[1], [{
            type: 'vocabulary_gender_select', itemId: 'gender', targetIds: all, rows: nouns.map((id) => ({ targetId: id, answerExplanation: word.get(id)!.genderExplanation! })),
          }])])
        : step('overview', 'overview', 'overview', COPY.overview, [page('overview', plan.genderOverview.estimatedDurationS, COPY.overview[1], [{ type: 'vocabulary_overview', itemId: 'overview', targetIds: all }])]),
      step('practice', 'practice', 'exercise', COPY.practice, practicePages),
      step('exam', 'exam', 'exam', COPY.exam, plan.exam.pages.map((pg) =>
        page(pg.pageId, pg.estimatedDurationS, pg.kind === 'translation' ? COPY.exam[1] : COPY.dictation[1], pg.targetIds.map((id) =>
          pg.kind === 'translation'
            ? { type: 'vocabulary_translation_exam', itemId: `exam-${id}`, targetId: id, prompt: translations.get(id)!.prompt, accepted: answers(id, translations.get(id)!.prompt), answerExplanation: translations.get(id)!.answerExplanation }
            : { type: 'vocabulary_listening_dictation', itemId: `dictation-${id}`, targetId: id, accepted: answers(id), answerExplanation: dictations.get(id)!.answerExplanation }), pg.timeLimitS))),
    ],
  };
}

type ReturnTypeOf<T> = T extends { parse: (v: unknown) => infer R } ? R : never;
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

/** Maps a full-validation issue (steps.N…) to the section that produced that step. */
function sectionOfStep(content: { steps: { role: string; blockId?: string | null; stage?: string }[] }, path: string): string | undefined {
  const m = /^steps\.(\d+)/.exec(path);
  const s = m ? content.steps[Number(m[1])] : undefined;
  if (!s) return undefined;
  if ('stage' in s && s.stage) return ({ introduction: 'introduction', matching: 'words', overview: 'words', practice: 'practice', exam: 'exam' } as Record<string, string>)[s.stage];
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

/** `make generate`: prepares a missing brief first, then missing lesson content. */
export function generateLesson(id: string, options: BriefOptions): Promise<LessonOutcome> {
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
  if (!isSupportedKind(ctx.entry.kind)) throw new GenerationError(`${ctx.entry.kind} generation is not implemented (phases 4/5).`);
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

    const sectionList: Section[] = brief.kind === 'vocabulary' ? Object.values(vocabularySections(ctx.lang, brief)) : grammarSections(ctx.lang, brief);
    const adapter = options.adapter();
    const units = new Map(sectionList.map((section) => [section.key, new ModelUnit<unknown>(`${id}/${section.key}`, section.schema, toStructuredSchema(section.schema), (repair) => contentPrompt(ctx, brief, section, repair), {
      adapter, report: options.report, sleep: options.sleep, normalize: normalizeLocalIds,
    })]));
    const payloads: Payloads = {};
    let todo = [...units.keys()];
    for (;;) {
      for (const key of todo) payloads[key] = await units.get(key)!.request();
      const issues: SectionIssues = new Map();
      const body = brief.kind === 'vocabulary' ? assembleVocabulary(brief, vocabularySections(ctx.lang, brief), payloads, issues) : assembleGrammar(brief as GrammarBrief, payloads, issues);
      let content: Record<string, unknown> | undefined;
      if (body) {
        const pages = (body.steps as { pages: { estimatedDurationS: number }[] }[]).flatMap((s) => s.pages);
        const models = [...new Set([...units.values()].map((u) => u.model))].join(', ').slice(0, 80);
        content = {
          schemaVersion: ARTIFACT_SCHEMA_VERSION, id, lang: ctx.lang, level: ctx.level, locales: ['en', 'fr', 'de'],
          title: brief.title, objective: brief.objective,
          estimatedMinutes: Math.max(1, Math.round(pages.reduce((sum, pg) => sum + pg.estimatedDurationS, 0) / 60)),
          provenance: { generator: 'lesson-prototype', model: models, promptVersion: CONTENT_PROMPT_VERSION, generatedAt: new Date().toISOString(), inputHashes: { outline: ctx.outlineHash, brief: briefHash } },
          ...body,
        };
        const result = validateContent(content, contentCtx);
        if (result.status === 'valid') {
          await recheckInputs(id, ctx, briefText, options);
          await save(result.value);
          return { id, status: 'generated', message: `model ${models}` };
        }
        attribute(result.issues, content as { steps: [] }, issues, id);
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

