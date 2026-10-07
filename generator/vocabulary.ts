import { z } from 'zod';
import { vocabularyLesson, vocabularyMinutes, VOCABULARY_TIMING } from '../src/domain/vocabularyLesson.ts';
import { AcceptedAnswersSchema, ARTIFACT_SCHEMA_VERSION, LocalizedLongTextSchema, LocalizedTextSchema, NestedIdSchema, nativeTextSchema } from '../src/schemas/artifactCommon.ts';
import { TARGET_EXERCISE_FIELDS, vocabularyBriefSchema, vocabularyGroupSchema, vocabularyTargetSchema, type VocabularyBrief } from '../src/schemas/vocabulary.ts';
import { validateBrief, type OutlineContext } from '../src/validation/artifacts.ts';
import { RICH_TEXT, INTRO_SHAPE, contentPrompt, type Section } from './contentPrompts.ts';
import type { BriefAdapter } from './gemini.ts';
import { briefPrompt, PROMPT_VERSION, toStructuredSchema } from './prompts.ts';
import { ModelUnit } from './units.ts';

/**
 * Vocabulary generation (P2-04): the brief is the whole lesson. One model call plans the word
 * inventory (targets and groups without exercise texts); three sections then write the group
 * introductions, the word texts and the practice items. Everything is merged into one brief,
 * validated as a whole and saved once; issues are repaired only in the part that produced them.
 */

const trusted = { schemaVersion: true, id: true, lang: true, level: true, locales: true, provenance: true, estimatedMinutes: true } as const;

/** The inventory payload: the brief without trusted fields, lesson length and exercise texts. */
export function vocabularyInventorySchema(lang: string) {
  return vocabularyBriefSchema(lang).omit(trusted).extend({
    groups: z.array(vocabularyGroupSchema.omit({ introduction: true })).min(1).max(6),
    targets: z.array(vocabularyTargetSchema(lang).omit(TARGET_EXERCISE_FIELDS)).min(1).max(60),
  });
}
export type VocabularyInventory = z.infer<ReturnType<typeof vocabularyInventorySchema>>;

export const vocabularySections = (lang: string, inventory: VocabularyInventory) => {
  const ids = inventory.targets.map((t) => t.id).join(', ');
  const nouns = inventory.targets.filter((t) => t.wordClass === 'noun').map((t) => t.id);
  return {
    introduction: {
      key: 'introduction',
      schema: z.strictObject({ groups: z.array(z.strictObject({ groupId: NestedIdSchema, text: LocalizedLongTextSchema })).min(1) }),
      task: `Write the introduction page text for each target group (${inventory.groups.map((g) => g.id).join(', ')}): present the topic, what the learner will be able to do, and the group's words with a useful observation (pattern, pronunciation, spelling). Do not quiz the learner. ${INTRO_SHAPE} ${RICH_TEXT}`,
    },
    words: {
      key: 'words',
      schema: z.strictObject({
        targets: z.array(z.strictObject({
          targetId: NestedIdSchema,
          explanation: LocalizedTextSchema,
          genderExplanation: LocalizedTextSchema.nullable(),
          matchingLabel: nativeTextSchema(lang).nullable(),
          examPrompt: nativeTextSchema(lang).nullable(),
        })).min(1),
      }),
      task: `For every target (${ids}): explanation says why the ${lang} form means this word (meaning, article/gender for nouns, a spelling or pronunciation point); it is shown when matching, listening choice, translation or dictation is corrected. genderExplanation is required exactly for the nouns (${nouns.join(', ') || 'none'}) and null otherwise: state the lexical gender and the matching indefinite article; do not invent a universal spelling rule. matchingLabel is null unless two targets of the same matching page (the words in group order, cut into balanced pages of at most ${VOCABULARY_TIMING.matchingGroupSize}) would show the same native label in some mother tongue; then give a short disambiguated label for every mother tongue. examPrompt is null when the first native translation is a clear translation cue; otherwise (a mother tongue does not mark gender or number that the ${lang} answer requires) give the cue for every mother tongue, e.g. "student (female)".`,
    },
    practice: {
      key: 'practice',
      schema: z.strictObject({
        targets: z.array(z.strictObject({
          targetId: NestedIdSchema,
          gap: z.strictObject({ before: z.string().max(200), after: z.string().max(200), accepted: AcceptedAnswersSchema, referenceTargetIds: z.array(NestedIdSchema).length(4), explanation: LocalizedTextSchema }),
          listeningOptionTargetIds: z.array(NestedIdSchema).length(4),
        })).min(1),
      }),
      task: `For every target (${ids}): gap is one contextual ${lang} sentence before + gap + after; the gap takes the target without its article, so the article (if any) stays in "before". gap.accepted.answers are article-free forms that fit; gap.referenceTargetIds are four distinct target IDs including the answer, where no other reference fits the gap; gap.explanation says why the word fits the sentence. listeningOptionTargetIds are four distinct targets including the answer, preferably similar-sounding.`,
    },
  } satisfies Record<string, Section>;
};
type Sections = ReturnType<typeof vocabularySections>;
type Payload<K extends keyof Sections> = z.infer<Sections[K]['schema']>;

/** Merges inventory and section payloads; missing or unexpected entries are attributed to their section. */
function merge(inventory: VocabularyInventory, p: { introduction: Payload<'introduction'>; words: Payload<'words'>; practice: Payload<'practice'> }, issues: Map<string, string[]>) {
  const blame = (key: string, message: string) => issues.set(key, [...(issues.get(key) ?? []), message]);
  const byId = <T extends { targetId: string }>(list: T[], key: string) => {
    const map = new Map(list.map((x) => [x.targetId, x]));
    for (const t of inventory.targets) if (!map.has(t.id)) blame(key, `missing entry for target ${t.id}`);
    for (const x of list) if (!inventory.targets.some((t) => t.id === x.targetId)) blame(key, `unexpected target ${x.targetId}`);
    return map;
  };
  const intros = new Map(p.introduction.groups.map((g) => [g.groupId, g.text]));
  for (const g of inventory.groups) if (!intros.has(g.id)) blame('introduction', `missing text for group ${g.id}`);
  const words = byId(p.words.targets, 'words');
  const practice = byId(p.practice.targets, 'practice');
  if (issues.size) return undefined;
  return {
    ...inventory,
    groups: inventory.groups.map((g) => ({ ...g, introduction: intros.get(g.id)! })),
    targets: inventory.targets.map((t) => {
      const { targetId: _w, ...w } = words.get(t.id)!;
      const { targetId: _p, ...pr } = practice.get(t.id)!;
      return { ...t, ...w, ...pr };
    }),
  };
}

/** Section that must repair a full-brief validation issue, by its path. */
export function sectionOfPath(path: string): 'inventory' | 'introduction' | 'words' | 'practice' {
  if (/^groups\.\d+\.introduction/.test(path)) return 'introduction';
  if (/^matching\.\d+/.test(path)) return 'words'; // duplicate matching labels on a derived page
  if (/^targets\.\d+\.(gap|listeningOptionTargetIds)/.test(path)) return 'practice';
  if (/^targets\.\d+\.(explanation|genderExplanation|matchingLabel|examPrompt)/.test(path)) return 'words';
  return 'inventory';
}

/** Generates one complete vocabulary brief; `save` writes it atomically. */
export async function generateVocabularyBrief(ctx: OutlineContext, options: { adapter: BriefAdapter; report?: (m: string) => void; sleep?: (ms: number) => Promise<void> }, isCurrent: () => boolean): Promise<{ brief: VocabularyBrief; model: string }> {
  const id = ctx.entry.id;
  const unitOptions = { adapter: options.adapter, report: options.report, sleep: options.sleep };
  const inventorySchema = vocabularyInventorySchema(ctx.lang);
  const inventoryUnit = new ModelUnit<VocabularyInventory>(id, inventorySchema as z.ZodType<VocabularyInventory>, toStructuredSchema(inventorySchema), (repair) => briefPrompt(ctx, repair), unitOptions);
  let inventory = await inventoryUnit.request();
  let units = sectionUnits(inventory);
  let todo = Object.keys(units) as (keyof Sections)[];
  const payloads: Partial<Record<keyof Sections, unknown>> = {};

  function sectionUnits(inv: VocabularyInventory) {
    const sections = vocabularySections(ctx.lang, inv);
    // The section prompt shows the inventory as the brief (source data).
    const source = { ...inv, kind: 'vocabulary' } as unknown as VocabularyBrief;
    return Object.fromEntries(Object.values(sections).map((section) => [section.key, new ModelUnit<unknown>(`${id}/${section.key}`, section.schema, toStructuredSchema(section.schema), (repair) => contentPrompt(ctx, source, section, repair), unitOptions)])) as Record<keyof Sections, ModelUnit<unknown>>;
  }

  for (;;) {
    for (const key of todo) payloads[key] = await units[key].request();
    const issues = new Map<string, string[]>();
    const merged = merge(inventory, payloads as Parameters<typeof merge>[1], issues);
    if (merged) {
      const models = [...new Set([inventoryUnit.model, ...Object.values(units).map((u) => u.model)])].join(', ').slice(0, 80);
      const draft = {
        ...merged, schemaVersion: ARTIFACT_SCHEMA_VERSION, id, lang: ctx.lang, level: ctx.level, locales: ['en', 'fr', 'de'], estimatedMinutes: 1,
        provenance: { generator: 'lesson-prototype', model: models, promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString(), inputHashes: { outline: ctx.outlineHash } },
      };
      // Lesson length follows the derived pages (SPEC section 6).
      const parsed = vocabularyBriefSchema(ctx.lang).safeParse(draft);
      if (parsed.success) draft.estimatedMinutes = vocabularyMinutes(vocabularyLesson(parsed.data).steps);
      const result = validateBrief(draft, ctx);
      if (result.status === 'valid' && result.value?.kind === 'vocabulary') {
        if (!isCurrent()) throw new Error('outline changed');
        return { brief: result.value, model: models };
      }
      for (const issue of [...result.issues.map((i) => ({ path: i.path, message: i.message })), ...result.staleReasons.map((r) => ({ path: '', message: r }))]) {
        const key = sectionOfPath(issue.path);
        issues.set(key, [...(issues.get(key) ?? []), `${issue.path || '(root)'}: ${issue.message}`]);
      }
    }
    const inventoryIssues = issues.get('inventory');
    if (inventoryIssues) {
      // A changed inventory invalidates every section.
      inventoryUnit.reject(inventoryIssues);
      inventory = await inventoryUnit.request();
      units = sectionUnits(inventory);
      todo = Object.keys(units) as (keyof Sections)[];
      continue;
    }
    for (const [key, messages] of issues) units[key as keyof Sections].reject(messages);
    todo = [...issues.keys()] as (keyof Sections)[];
  }
}
