# Grammar lessons

Design: **explain a little, practise at once, examine at the end**. A grammar lesson is cut into 2–4 teaching blocks. Each block has one explanation page, followed by 2–4 short exercises on exactly the rules of that block. After the last block comes a fixed "personal feedback" placeholder, then a timed exam with fresh sentences that covers every rule.

A grammar lesson has two artifacts: the **brief** plans the rules, the blocks, the exercises and the exam pages; the **lesson content** holds the explanation text, every item with its answers, and the page durations and countdowns.

Shared rules (envelope, languages, Check/Continue, free-text scoring, 35 / 65 weights, exam countdown, results) are in [README.md](README.md). Source: [SPEC.md section 7](../SPEC.md#7-grammar-learning-flow), [src/schemas/grammar.ts](../../src/schemas/grammar.ts).

---

## 1. What the learner sees

The example is `fr-verb-etre-present` (être in the present), 15 minutes.

| # | Stage | ≈ Time | What the learner does | Counts for |
|---|---|---|---|---|
| 1 | **Explanation** (block 1) | 2 min | One page: the rule as formatted text, a form table (`je` → `suis`, with an example), and example sentences with a translation. A grammar lesson that introduces new verbs shows a **New verbs** table on the start page and the first explanation. | – |
| 2 | **Exercises** (block 1) | 3 min | 2–4 exercises on the rules of the block, one page per item (or per board). Types in section 2. | practice |
| 3 | Blocks 2–4 | … | The same pattern for each further block. | practice |
| 4 | **Feedback placeholder** | 30 s | A fixed page: "Individual feedback would be here on production." No answer, no score. | – |
| 5 | **Exam** | 3 min | Exam info page, then 2–4 timed pages, one item type per page: typed gaps, typed pronoun forms or word order. No feedback until the end. | exam |

Results follow (see [README.md](README.md#results)); each exercise has its own entry, named after its block ("Multiple-choice gaps 1", "Typed gaps 2").

## 2. Exercise types

| Type | What the learner does | Units | Allowed in |
|---|---|---|---|
| `grammar_person_matching` | The vocabulary matching board, with one row per person: the three singular persons, a gap, the three plural persons. Mode `translation`: mother-tongue pronoun → French pronoun (*he* → `il`). Mode `forms`: French pronoun → verb form (`je` → `suis`). One board per page. | 1 per row | practice |
| `grammar_pronoun_form_match` | Drag form tokens from a bank onto one row per pronoun (or click, or keyboard). Each token is used once; duplicate texts are separate tokens. | 1 per row | practice |
| `grammar_pronoun_form_typing` | One field per pronoun row: type the form. | 1 per row | practice, exam |
| `grammar_gap_choice` | A sentence with `____` and exactly four choices. An optional hint stands on its own line above the sentence, never in parentheses inside it. Choosing submits the page. | 1 | practice |
| `grammar_gap_typing` | Type the missing text in the sentence. Hint in practice only. | 1 | practice, exam |
| `grammar_word_order` | Drag tokens from a bank into a line (or click, or keyboard). Punctuation inside the sentence and a final `?` or `!` are tokens; the final full stop is not. | 1 per sentence | practice, exam |
| `grammar_error_spotter` | Click the one wrong word of a sentence, then type (or select) its correction. Detection and correction must both be right. | 1 per sentence | practice |

Rules on types:
- The three pronoun types (person matching, pronoun/form match, pronoun/form typing) are allowed only for the topics `pronouns`, `verbs_morphology` and `verb_usage`. Article, adverb, negation or question lessons use gaps and word order.
- Every lesson with the topic `pronouns` or `verbs_morphology` has at least one person matching board (exception: the imperative, which has only *tu*, *nous* and *vous*). A lesson on several verbs has one board per verb.
- An error spotter replaces exactly one token. A missing word (a missing `ne`) is not an error-spotter item.

## 3. The exam

- **2–4 pages**, each with **one item type** (typed gap, typed pronoun forms or word order), one instruction and its own countdown.
- At least **10 scored units** in total (about 12).
- **Every rule** of the brief is examined.
- **Fresh sentences**: no exam sentence repeats an explanation example or a practice sentence (validated).
- Typed gaps in the exam have no hint.
- Countdown: about 1.5 × the page estimate, set in the brief and copied into the content.

## 4. Length rules

The first samples were too short (two minutes of clicking), and a first rewrite too long (24–27 minutes). The current rules:

| Rule | Value |
|---|---|
| Teaching blocks | 2–4 |
| Exercises per block | 2–4 |
| Items per exercise | 4–8 (a person matching board or a pronoun item counts its rows; such exercises have 1–2 items) |
| Scored practice units | at least 22 (about 22–35) |
| Exam | 2–4 pages, at least 10 units, every rule covered |
| Page estimate per unit | 6–40 s; guide: 10 s per choice or matching row, 15 s per typed unit, 25 s per word order or error spotter |
| Explanation page | 45–240 s (guide 60–180 s) |
| Exam countdown | about 1.5 × the page estimate |
| Whole lesson | at most 15 minutes |

```typescript
export const GRAMMAR_LENGTH = {
  minPracticeUnits: 22,
  minExamUnits: 10,
  examPages: [2, 4],
  exercisesPerBlock: [2, 4],
  secondsPerUnit: [6, 40],
  explanationSeconds: [45, 240],
} as const;
```

These are a quality gate for new lessons, not a condition to play one.

## 5. Data a grammar lesson needs

### 5.1 Brief

| Field | Type | Rule |
|---|---|---|
| envelope | see [README.md](README.md#2-the-shared-envelope) | `kind: "grammar"`, `topic` from the outline (no `theme`) |
| `scopeBoundaries` | support | What the lesson does not cover. |
| `prerequisites` | support[0–4] | |
| `rules[1–12]` | `{ id, summary (support) }` | Every rule is taught in a block and examined. |
| `blocks[2–4]` | see below | |
| `newVerbs[0–12]` | `{ infinitive (course), translations (native) }` | Verbs no earlier vocabulary lesson taught. |
| `feedbackPlaceholder` | `{ estimatedDurationS }` | |
| `exam.pages[]` | `{ pageId, type, itemCount, ruleIds, estimatedDurationS, timeLimitS }` | `type`: `grammar_gap_typing`, `grammar_pronoun_form_typing` or `grammar_word_order`. |
| `scoring` | `{ 35, 65, 0.5 }` | Fixed. |

Each **block**: `id`, `title` (support label), `ruleIds`, `explanationPlan` (support, long), `explanationDurationS`, `examples[1–8]` (`{ text (course), translation (native) }`), `pitfalls[0–4]` (support) and `exercises[1–4]`: `{ id, type, itemCount, ruleIds, estimatedDurationS }`.

### 5.2 Content (rendered by the frontend)

```
steps[6–20]: { id, role, blockId | null, label (support), pages[] }
  per block: one "explanation" step, then one "exercise" step per planned exercise
  then one "feedback" step (the placeholder), then one "exam" step
page: { pageId, estimatedDurationS, timeLimitS | null, instructions (support), items[1–12] }

item types:
  grammar_explanation             { ruleIds, heading, text (restricted Markdown), formTable[0–12]: { subject, form, example | null }, examples[0–8] }
  production_feedback_placeholder { }
  grammar_person_matching         { ruleIds, mode: translation | forms, rows[3–6]: { person, pronoun | null, native | null, answer, answerExplanation } }
  grammar_pronoun_form_match      { ruleIds, tokens[2–12], rows[1–8]: { rowId, pronoun, validForms[], answerExplanation } }
  grammar_pronoun_form_typing     { ruleIds, rows[1–8]: { rowId, pronoun, accepted, answerExplanation } }
  grammar_gap_choice              { ruleIds, before, after, choices[4], answerChoiceId, hint | null, answerExplanation }
  grammar_gap_typing              { ruleIds, before, after, accepted, hint | null, answerExplanation }
  grammar_word_order              { ruleIds, tokens[2–16], acceptedOrders[1–4], answerExplanation }
  grammar_error_spotter           { ruleIds, tokens[2–16], faultyTokenId, correction: { mode: type | select, accepted, choices[0–4] }, answerExplanation }
```

Content stores the canonical order of choices, tokens and matching boxes. The session shuffles them with a seed saved in the session, so a resume and the results show the same order.

### 5.3 Validation rules (a failure makes the lesson invalid)

**Brief**
- Rule, block, exercise and exam page IDs are unique; every rule ID exists.
- An exercise assesses only rules of its block. A person matching board may also review rules of earlier blocks.
- Every rule is taught in a block and examined on an exam page.
- Pronoun types appear only for `pronouns`, `verbs_morphology` and `verb_usage`; `pronouns` and `verbs_morphology` lessons have a person matching board.
- `estimatedMinutes` equals the explanation, exercise, placeholder and exam estimates, summed and rounded.

**Content against the brief**
- The steps follow the brief exactly: per block one explanation step, then one step per planned exercise; then feedback; then exam.
- An exercise step has exactly the planned number of items, of the planned type, and they cover exactly the planned rules. A person matching board has a page of its own.
- Explanation items cite only rules of their block.
- Only exam pages have a countdown; each exam page matches its brief page (type, item count, rules, `timeLimitS`).
- No exam sentence repeats a sentence of the explanations or of practice.

**Items**
- Gap choice: four distinct choices, the answer is one of them, no cue in parentheses inside the sentence.
- Exam gaps have no hint.
- Word order: each accepted order uses every token exactly once.
- Error spotter: the faulty token exists and the correction differs from it; select mode has 2–4 choices including an accepted answer, type mode none.
- Person matching: rows are the three singular persons, the three plural persons, or all six, in that order; `translation` rows have a native prompt and no pronoun, `forms` rows a pronoun and no native prompt; prompts unique.
- Every scored item (every row) has an explanation; explanations about accents name the mark.
- Explanation text passes the restricted-Markdown check, with the same blocks and forms in en/fr/de.

### 5.4 Zod schema

From [src/schemas/grammar.ts](../../src/schemas/grammar.ts). The building blocks are in [README.md](README.md#shared-zod-building-blocks).

```typescript
export const GRAMMAR_EXERCISE_TYPES = [
  'grammar_person_matching',
  'grammar_pronoun_form_match',
  'grammar_pronoun_form_typing',
  'grammar_gap_choice',
  'grammar_gap_typing',
  'grammar_word_order',
  'grammar_error_spotter',
] as const;
export const GrammarExerciseTypeSchema = z.enum(GRAMMAR_EXERCISE_TYPES);

export const PRONOUN_FORM_TYPES = ['grammar_person_matching', 'grammar_pronoun_form_match', 'grammar_pronoun_form_typing'];
export const PRONOUN_FORM_TOPICS = ['pronouns', 'verbs_morphology', 'verb_usage'] as const;
export const PERSON_MATCHING_TOPICS = ['pronouns', 'verbs_morphology'] as const;
export const PERSON_MATCHING_EXEMPT = ['fr-imperative-mood'] as const;

export const PERSONS = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'] as const;
export const PersonSchema = z.enum(PERSONS);

/** Final exams use written production only. */
export const GRAMMAR_EXAM_TYPES = ['grammar_gap_typing', 'grammar_pronoun_form_typing', 'grammar_word_order'] as const;

/* =================================================================== brief */

export const exampleSchema = (lang: string) => z.strictObject({ text: LearningTextSchema, translation: nativeTextSchema(lang) });

export const grammarBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('grammar'),
    topic: TopicSchema,
    scopeBoundaries: LocalizedTextSchema,
    prerequisites: z.array(LocalizedTextSchema).max(4),
    rules: z.array(z.strictObject({ id: NestedIdSchema, summary: LocalizedTextSchema })).min(1).max(12),
    blocks: z.array(z.strictObject({
      id: NestedIdSchema,
      title: LocalizedLabelSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      explanationPlan: LocalizedLongTextSchema,
      explanationDurationS: DurationSecondsSchema,
      examples: z.array(exampleSchema(lang)).min(1).max(8),
      pitfalls: z.array(LocalizedTextSchema).max(4),
      exercises: z.array(z.strictObject({
        id: NestedIdSchema,
        type: GrammarExerciseTypeSchema,
        itemCount: z.number().int().min(1).max(12),
        ruleIds: z.array(NestedIdSchema).min(1),
        estimatedDurationS: DurationSecondsSchema,
      })).min(1).max(4),
    })).min(2).max(4),
    newVerbs: z.array(z.strictObject({ infinitive: LearningTextSchema, translations: nativeTextSchema(lang) })).max(12),
    feedbackPlaceholder: z.strictObject({ estimatedDurationS: DurationSecondsSchema }),
    exam: z.strictObject({
      pages: z.array(z.strictObject({
        pageId: NestedIdSchema,
        type: z.enum(GRAMMAR_EXAM_TYPES),
        itemCount: z.number().int().min(1).max(12),
        ruleIds: z.array(NestedIdSchema).min(1),
        estimatedDurationS: DurationSecondsSchema,
        timeLimitS: TimeLimitSecondsSchema,
      })).min(1).max(20),
    }),
    scoring: ScoringPolicySchema,
  });

/* ================================================================= content */

const TokenSchema = z.strictObject({ tokenId: NestedIdSchema, text: LearningTextSchema });
const scored = { ruleIds: z.array(NestedIdSchema).min(1), answerExplanation: LocalizedTextSchema };

export const grammarItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('grammar_explanation'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      heading: LocalizedLabelSchema,
      text: LocalizedLongTextSchema,                  // restricted Markdown
      formTable: z.array(z.strictObject({ subject: LearningTextSchema, form: LearningTextSchema, example: LearningTextSchema.nullable() })).max(12),
      examples: z.array(exampleSchema(lang)).max(8),
    }),
    z.strictObject({ type: z.literal('production_feedback_placeholder'), itemId: NestedIdSchema }),
    z.strictObject({
      type: z.literal('grammar_person_matching'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      mode: z.enum(['translation', 'forms']),
      rows: z.array(z.strictObject({
        person: PersonSchema,
        pronoun: LearningTextSchema.nullable(),        // forms mode
        native: nativeTextSchema(lang).nullable(),     // translation mode
        answer: LearningTextSchema,                    // the French box on the right
        answerExplanation: LocalizedTextSchema,
      })).min(3).max(6),
    }),
    z.strictObject({
      type: z.literal('grammar_pronoun_form_match'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      tokens: z.array(TokenSchema).min(2).max(12),
      rows: z.array(z.strictObject({ rowId: NestedIdSchema, pronoun: LearningTextSchema, validForms: z.array(LearningTextSchema).min(1), answerExplanation: LocalizedTextSchema })).min(1).max(8),
    }),
    z.strictObject({
      type: z.literal('grammar_pronoun_form_typing'),
      itemId: NestedIdSchema,
      ruleIds: z.array(NestedIdSchema).min(1),
      rows: z.array(z.strictObject({ rowId: NestedIdSchema, pronoun: LearningTextSchema, accepted: AcceptedAnswersSchema, answerExplanation: LocalizedTextSchema })).min(1).max(8),
    }),
    z.strictObject({
      type: z.literal('grammar_gap_choice'),
      itemId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      choices: z.array(z.strictObject({ choiceId: NestedIdSchema, text: LearningTextSchema })).length(4),
      answerChoiceId: NestedIdSchema,
      hint: LocalizedTextSchema.nullable(),
      ...scored,
    }),
    z.strictObject({
      type: z.literal('grammar_gap_typing'),
      itemId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      accepted: AcceptedAnswersSchema,
      hint: LocalizedTextSchema.nullable(),            // null on exam pages
      ...scored,
    }),
    z.strictObject({
      type: z.literal('grammar_word_order'),
      itemId: NestedIdSchema,
      tokens: z.array(TokenSchema).min(2).max(16),
      acceptedOrders: z.array(z.array(NestedIdSchema).min(2)).min(1).max(4),
      ...scored,
    }),
    z.strictObject({
      type: z.literal('grammar_error_spotter'),
      itemId: NestedIdSchema,
      tokens: z.array(TokenSchema).min(2).max(16),
      faultyTokenId: NestedIdSchema,
      correction: z.strictObject({
        mode: z.enum(['type', 'select']),
        accepted: AcceptedAnswersSchema,
        choices: z.array(LearningTextSchema).max(4),
      }),
      ...scored,
    }),
  ]);

const pageSchema = (lang: string) =>
  z.strictObject({
    pageId: NestedIdSchema,
    estimatedDurationS: DurationSecondsSchema,
    timeLimitS: TimeLimitSecondsSchema.nullable(),
    instructions: LocalizedTextSchema,
    items: z.array(grammarItemSchema(lang)).min(1).max(12),
  });

export const grammarContentSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('grammar'),
    topic: TopicSchema,
    steps: z.array(z.strictObject({
      id: NestedIdSchema,
      role: z.enum(['explanation', 'exercise', 'feedback', 'exam']),
      blockId: NestedIdSchema.nullable(),
      label: LocalizedLabelSchema,
      pages: z.array(pageSchema(lang)).min(1).max(20),
    })).min(6).max(20),
  });
```

## 6. Example (`fr-verb-etre-present`, excerpt)

Full files: [brief](../../content/briefs/fr-verb-etre-present.json) and [lesson content](../../content/lessons/fr-verb-etre-present.json).

**The plan in the brief** (support text in English only here):

| Block | Rules | Exercises |
|---|---|---|
| Singular forms: je, tu, il, elle, on | `rule-singular-forms` | 3 multiple-choice gaps, 3 typed gaps, 4 error spotters |
| Plural forms and liaisons | `rule-plural-forms`, `rule-liaison-pronunciation` | 1 person matching board (6 rows, also reviews the singular), 2 pronoun typing items, 4 multiple-choice gaps, 4 typed gaps |
| Exam | all three rules | page 1: 2 pronoun typing items (140 s), page 2: 3 typed gaps (70 s), page 3: 3 typed gaps (70 s) |

```json
{
  "kind": "grammar",
  "topic": "verbs_morphology",
  "estimatedMinutes": 15,
  "rules": [
    { "id": "rule-singular-forms", "summary": { "en": "Singular forms of être: je suis, tu es, il/elle/on est.", "fr": "…", "de": "…" } },
    { "id": "rule-plural-forms", "summary": { "en": "Plural forms of être: nous sommes, vous êtes, ils/elles sont.", "fr": "…", "de": "…" } },
    { "id": "rule-liaison-pronunciation", "summary": { "en": "Pronounce obligatory liaisons with vous êtes [vu zɛt] and ils sont vs ils ont.", "fr": "…", "de": "…" } }
  ],
  "newVerbs": [{ "infinitive": "être", "translations": { "en": "to be", "de": "sein" } }],
  "feedbackPlaceholder": { "estimatedDurationS": 30 },
  "exam": {
    "pages": [
      { "pageId": "exam-forms", "type": "grammar_pronoun_form_typing", "itemCount": 2, "ruleIds": ["rule-singular-forms", "rule-plural-forms"], "estimatedDurationS": 90, "timeLimitS": 140 },
      { "pageId": "exam-singular", "type": "grammar_gap_typing", "itemCount": 3, "ruleIds": ["rule-singular-forms"], "estimatedDurationS": 45, "timeLimitS": 70 },
      { "pageId": "exam-plural", "type": "grammar_gap_typing", "itemCount": 3, "ruleIds": ["rule-plural-forms", "rule-liaison-pronunciation"], "estimatedDurationS": 45, "timeLimitS": 70 }
    ]
  }
}
```

**One item of each kind from the lesson content:**

```json
[
  {
    "type": "grammar_explanation",
    "itemId": "block-singular-explanation",
    "ruleIds": ["rule-singular-forms"],
    "heading": { "en": "être in the singular", "fr": "…", "de": "…" },
    "text": {
      "en": "`être` (to be) is **irregular**: learn its forms by heart. In the singular you say `je suis`, `tu es` and `il/elle/on est`.\n\nUse `être` for nationality, job or how you feel: `Je suis étudiant.` `Elle est française.`\n\n- `tu es` and `il est` sound the same, but `tu es` ends in -s and `il est` in -t.\n- Before a job there is no article: `Il est médecin.`",
      "fr": "…",
      "de": "…"
    },
    "formTable": [
      { "subject": "je", "form": "suis", "example": "Je suis étudiant." },
      { "subject": "tu", "form": "es", "example": "Tu es fatigué ?" },
      { "subject": "il / elle / on", "form": "est", "example": "Elle est française." }
    ],
    "examples": [{ "text": "Je suis étudiant.", "translation": { "en": "I am a student.", "de": "Ich bin Student." } }]
  },
  {
    "type": "grammar_gap_choice",
    "itemId": "ex-sg-choice-1",
    "ruleIds": ["rule-singular-forms"],
    "before": "Je",
    "after": "étudiant.",
    "choices": [
      { "choiceId": "c-1", "text": "sommes" },
      { "choiceId": "c-2", "text": "suis" },
      { "choiceId": "c-3", "text": "est" },
      { "choiceId": "c-4", "text": "es" }
    ],
    "answerChoiceId": "c-2",
    "hint": null,
    "answerExplanation": { "en": "With je, être is suis.", "fr": "Avec je, être devient suis.", "de": "Zu je gehört die Form suis." }
  },
  {
    "type": "grammar_gap_typing",
    "itemId": "ex-sg-typing-1",
    "ruleIds": ["rule-singular-forms"],
    "before": "Je",
    "after": "canadienne.",
    "accepted": { "answers": ["suis"] },
    "hint": { "en": "être, 1st person singular", "fr": "être, 1re personne du singulier", "de": "être, 1. Person Singular" },
    "answerExplanation": { "en": "With je, être is suis.", "fr": "Avec je, être devient suis.", "de": "Zu je gehört die Form suis." }
  },
  {
    "type": "grammar_error_spotter",
    "itemId": "ex-sg-spot-1",
    "ruleIds": ["rule-singular-forms"],
    "tokens": [
      { "tokenId": "t-1", "text": "Je" },
      { "tokenId": "t-2", "text": "es" },
      { "tokenId": "t-3", "text": "fatigué" }
    ],
    "faultyTokenId": "t-2",
    "correction": { "mode": "type", "accepted": { "answers": ["suis"] }, "choices": [] },
    "answerExplanation": { "en": "Je takes suis, not es: je suis.", "fr": "Avec je, on dit suis et non es : je suis.", "de": "Zu je gehört suis, nicht es: je suis." }
  },
  {
    "type": "grammar_person_matching",
    "itemId": "ex-pl-persons-1",
    "ruleIds": ["rule-singular-forms", "rule-plural-forms"],
    "mode": "forms",
    "rows": [
      { "person": "1sg", "pronoun": "je", "native": null, "answer": "suis", "answerExplanation": { "en": "With je, être is suis.", "fr": "…", "de": "…" } },
      { "person": "2sg", "pronoun": "tu", "native": null, "answer": "es", "answerExplanation": { "en": "With tu, être is es.", "fr": "…", "de": "…" } },
      { "person": "3sg", "pronoun": "il / elle / on", "native": null, "answer": "est", "answerExplanation": { "en": "With il, elle, on, être is est.", "fr": "…", "de": "…" } },
      { "person": "1pl", "pronoun": "nous", "native": null, "answer": "sommes", "answerExplanation": { "en": "With nous, être is sommes.", "fr": "…", "de": "…" } },
      { "person": "2pl", "pronoun": "vous", "native": null, "answer": "êtes", "answerExplanation": { "en": "With vous, être is êtes, with an accent circonflexe on the first e.", "fr": "…", "de": "…" } },
      { "person": "3pl", "pronoun": "ils / elles", "native": null, "answer": "sont", "answerExplanation": { "en": "With ils, elles, être is sont.", "fr": "…", "de": "…" } }
    ]
  },
  {
    "type": "grammar_pronoun_form_typing",
    "itemId": "ex-pl-typing-1",
    "ruleIds": ["rule-plural-forms"],
    "rows": [
      { "rowId": "r-1", "pronoun": "nous", "accepted": { "answers": ["sommes"] }, "answerExplanation": { "en": "With nous, être is sommes.", "fr": "…", "de": "…" } },
      { "rowId": "r-2", "pronoun": "vous", "accepted": { "answers": ["êtes"] }, "answerExplanation": { "en": "With vous, être is êtes, with an accent circonflexe on the first e.", "fr": "…", "de": "…" } },
      { "rowId": "r-3", "pronoun": "ils", "accepted": { "answers": ["sont"] }, "answerExplanation": { "en": "With ils, elles, être is sont.", "fr": "…", "de": "…" } }
    ]
  },
  {
    "type": "grammar_word_order",
    "itemId": "ex-pref-order-1",
    "ruleIds": ["rule-def-preference"],
    "tokens": [
      { "tokenId": "t-1", "text": "J’aime" },
      { "tokenId": "t-4", "text": "noir" },
      { "tokenId": "t-3", "text": "chocolat" },
      { "tokenId": "t-2", "text": "le" }
    ],
    "acceptedOrders": [["t-1", "t-2", "t-3", "t-4"]],
    "answerExplanation": { "en": "After aimer the noun takes the definite article (general taste): le chocolat noir.", "fr": "…", "de": "…" }
  }
]
```

The word-order item comes from [fr-definite-articles-and-elision](../../content/lessons/fr-definite-articles-and-elision.json), because the être lesson has none. `…` marks text left out here; the files have every locale.

## 7. Mockups (PlantUML Salt)

In [docs/mockups/04-grammar-lesson/](../mockups/04-grammar-lesson/); previews with the [mockup guide](../mockups/README.md).

| Screen | Mockup |
|---|---|
| Lesson start | [lesson-start.puml](../mockups/04-grammar-lesson/01-startpage/lesson-start.puml) |
| Explanation | [singular-forms.puml](../mockups/04-grammar-lesson/02-00-explanation/singular-forms.puml) |
| Pronoun/form match | [pronoun-match.puml](../mockups/04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.puml) |
| Pronoun/form typing | [pronoun-typing.puml](../mockups/04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.puml) |
| Multiple-choice gap | [gap-choice.puml](../mockups/04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.puml) |
| Typed gap and its correction | [gap-typing.puml](../mockups/04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.puml), [feedback.puml](../mockups/04-grammar-lesson/02-04-exercise-gap-typing/feedback.puml) |
| Word order | [word-order.puml](../mockups/04-grammar-lesson/02-05-exercise-word-order/word-order.puml) |
| Error spotter | [error-spotter.puml](../mockups/04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.puml) |
| Feedback placeholder | [feedback-placeholder.puml](../mockups/04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.puml) |
| Exam | [mixed-exam.puml](../mockups/04-grammar-lesson/04-exam/mixed-exam.puml) |
| Results | [exam-results.puml](../mockups/04-grammar-lesson/05-results/exam-results.puml) |

Person matching uses the vocabulary matching board ([matching.puml](../mockups/03-vocabulary-lesson/04-matching/matching.puml)) with the persons as rows.

## 8. For ft_transcendence

Components of their own (besides the shared ones of [README.md](README.md#4-components-to-build-once)): the explanation page with its form table, the pronoun/form drag board, the pronoun typing rows, the error spotter and the feedback placeholder.

Today a grammar draft in ft_transcendence is `{ objective, points[2–6], examples[3–8], pitfalls[1–4] }` in the course language. It maps roughly onto the prototype's plan, but it has no blocks, no exercises and no exam:

| ft_transcendence today | Prototype |
|---|---|
| `objective` | `objective` (en/fr/de) |
| `points[2–6]` | `rules[1–12]` with IDs, grouped into `blocks[2–4]` |
| `examples[3–8]` | `blocks[].examples` with translations |
| `pitfalls[1–4]` | `blocks[].pitfalls` |
| – | `blocks[].exercises`, `exam.pages`, `newVerbs`, and the whole lesson content |

Points to decide for grammar:

1. Fifteen minutes or ten? Ten minutes means 2 blocks with 2 exercises each and an exam of 2 pages.
2. Keep the feedback placeholder, or drop it until individual feedback exists?
3. The pronoun types assume persons (je, tu…): they fit French and German; check them for English.
