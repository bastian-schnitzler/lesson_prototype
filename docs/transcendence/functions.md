# Function lessons

Design: **learn the phrases of one situation, then hold the conversation**. A function lesson teaches the ready-to-use expressions a learner needs to act in one everyday situation from the outline (greeting someone, ordering at a café, asking the way). The learner sees them on flashcards and in a model dialogue, practises them in matching, dialogue gaps, word order and listening, and is examined in new dialogues.

A function lesson has two artifacts: the **brief** holds the situation, the two roles, and the expressions and words with example sentences; the **lesson content** holds the model dialogue, every exercise and the exam.

Shared rules (envelope, languages, Check/Continue, free-text scoring, 35 / 65 weights, exam countdown, results) are in [README.md](README.md). Source: [SPEC.md section 8](../SPEC.md#8-functions-learning-flow), [src/schemas/functions.ts](../../src/schemas/functions.ts), [src/domain/functionsLesson.ts](../../src/domain/functionsLesson.ts).

---

## 1. What the learner sees

The example is `fr-ordering-at-a-cafe`: 4 expressions, 4 words, 17 minutes.

| # | Stage | ≈ Time | What the learner does | Counts for |
|---|---|---|---|---|
| 1 | **Flashcards** | 1 min 30 | The vocabulary flashcards: first a page with the words, then a page with the expressions. Front: the mother-tongue translation. Back: the French word or expression with a speaker, the gender (words) or a short explanation (expressions), and an example sentence with its translation. Every card must be turned. | – |
| 2 | **Model dialogue** | 2 min 20 | 8–14 lines appear one by one (**Next line**), role A on the left, role B on the right, the lesson's expressions highlighted, each line with a speaker and a flip button (translation and a note). After the last line, **Continue**. | – |
| 3 | **Matching** | 1 min 30 | The vocabulary matching board: translation on the left, French expression on the right (at most 6 per page), then the words on their own board. | practice, 1 per pair |
| 3b | **Gender** | 40 s | The vocabulary gender page for the nouns of the lesson. Left out without nouns. | practice, 1 per noun |
| 4 | **Dialogue gaps** | 1 min | One exchange per page: role A's line, then role B's line with a gap and four expressions to choose from. | practice, 1 per gap |
| 5 | **Word order** | 1 min 40 | One sentence per page, built from tokens (tokens may be chunks such as `s'il vous plaît`). | practice, 1 per sentence |
| 5b | **Listening** | 2 min | Role A's line is only heard; four replies of role B are only heard ("Reply 1" to "Reply 4"). The learner picks the reply that fits. The texts appear after Check. | practice, 1 per item |
| 6 | **Exam** | 6 min | Exam info page, then three timed parts: **Translation** of the words, **Replies** (build role B's reply from tokens with distractors), **Dialogue** (a new dialogue with gaps to type). | exam |

Results follow (see [README.md](README.md#results)): the exam has the parts **Translation**, **Replies** and **Dialogue**; the practice entries are Matching, Gender, Dialogue gaps, Word order and Listening.

## 2. Exercises: fixed and varying parts

| Fixed in every lesson | Varies from lesson to lesson |
|---|---|
| The stages, in this order | The situation, the two roles (`le serveur`, `la cliente`), the expressions and the words |
| One item per expression in dialogue gaps, word order and listening | The sentences of every exercise |
| Every expression in the model dialogue, every exercise and the exam | Whether there are words, and nouns among them (translation page, gender page) |
| Exam: translation of every word, then replies, then one dialogue | The number of replies (4–8) and of dialogue gaps (3–10) |
| Page estimates and countdowns from fixed rules (section 4) | – |

The register (*tu* or *vous*) follows the situation and stays the same within a dialogue. All sentences use only the lesson's expressions and words and what the learner already knows.

## 3. The exam

1. **Translation** (only when the lesson has words): one page with every word, exactly as in the vocabulary exam (mother-tongue prompt, French with the indefinite article, article badge, gender choice after `des`).
2. **Replies**: role A's line (with a speaker: it is not the answer), then role B's reply to build from tokens. The bank holds the reply's tokens plus 0–3 distractors ("Not every word fits."), for example a wrong person or a wrong article. Exactly one order is right, and the distractors must stay in the bank. At most 4 replies per page.
3. **Dialogue**: one page with a new dialogue in the same situation, unrolled with **Next line**. A line with a gap has a text field in place of the expression, and every line shows its mother-tongue translation below it, so the learner knows what to write. Fields stay editable until **Continue** or the countdown submits the page. Gaps are graded by the free-text rules (1, 0.5, 0); the accepted answers list every expression that fits.

No exam sentence occurs in the brief's examples or in practice. Each page's countdown is 1.5 × its estimate.

## 4. Page rules

| Stage | Pages | Estimate | Exam countdown |
|---|---|---|---|
| 1 Flashcards | one page for the words (none without words), then one for the expressions | 10 s per word, 12 s per expression | – |
| 2 Model dialogue | one page | 20 s + 12 s per line | – |
| 3 Matching | the expressions in balanced pages of at most 6, then the words on their own page | 12 s per expression, 10 s per word | – |
| 3b Gender | one page with every noun (none without nouns) | 20 s + 5 s per noun | – |
| 4 Dialogue gaps | one per page | 15 s | – |
| 5 Word order | one per page | 25 s | – |
| 5b Listening | one per page | 30 s | – |
| Exam info | application page, not stored | 20 s | – |
| 6a Translation | one page with every word | 15 s per word | 1.5 × estimate |
| 6b Replies | balanced pages of at most 4 | 30 s per reply | 1.5 × estimate |
| 6c Dialogue | one page | 8 s per line + 20 s per gap | 1.5 × estimate |

```typescript
export const FUNCTIONS_LIMITS = {
  expressions: [4, 10],
  words: [0, 6],
  dialogueLines: [8, 14],
  examReplies: [4, 8],
  examGaps: [3, 10],
  distractors: [0, 3],
} as const;

export const FUNCTIONS_PAGE_RULES = {
  expressionCardS: 12, wordCardS: 10,
  dialogueBaseS: 20, dialogueLineS: 12,
  expressionPairS: 12, wordPairS: 10, matchingPageSize: 6,
  genderBaseS: 20, genderWordS: 5,
  wordOrderS: 25, gapChoiceS: 15, listeningS: 30,
  replyS: 30, replyPageSize: 4,
  translationS: 15,
  examLineS: 8, examGapS: 20,
  timeLimitFactor: 1.5,
} as const;
```

With 4 expressions, 4 nouns, a 10-line model dialogue, 4 exam replies and an exam dialogue of about 10 lines with 3–4 gaps, a lesson has 22–24 practice units and 11–12 exam units, and takes 16–17 minutes. With 8 expressions it took about 25 minutes, which is why the standard went down to 4.

## 5. Data a function lesson needs

### 5.1 Brief

| Field | Type | Rule |
|---|---|---|
| envelope | see [README.md](README.md#2-the-shared-envelope) | `kind: "functions"`, `theme` from the outline |
| `situation` | support | One sentence for the start page: who talks to whom, where. |
| `coverageNotes` | support (long) | How the expressions cover the outline intent. |
| `prerequisites` | support[0–4] | |
| `roles[2]` | `{ id, label (course), translation (native) }` | `le serveur`, `la cliente`; used in every dialogue. |
| `expressions[4–10]` | see below | About 4 today. |
| `words[0–6]` | see below | Words the dialogues need that no earlier vocabulary lesson taught. |
| `scoring` | `{ 35, 65, 0.5 }` | Fixed. |

**Expression**: `id`; `text` in French without a trailing ellipsis (`Je voudrais`); `openEnd` (a sentence start, displayed with ` …`, which is never part of an answer); `translations`; `explanation` (support: when and how it is used, *tu* or *vous*); `example` (`{ text (course), translation (native) }`).

**Word**: `id`; `term` without article (`thé`); `teachingForm` with the indefinite article for nouns (`un thé`); `translations`; `wordClass`; `genders` (nouns only); `explanation` (support); `example`.

### 5.2 Content (rendered by the frontend)

```
steps[7–8]: { id, stage, role, label (support), pages[] }
  stage: flashcards | dialogue | matching | gender (only with nouns) | dialogue_gaps | word_order | listening | exam
  role:  presentation (flashcards, dialogue) | exercise | exam
page: { pageId, estimatedDurationS, timeLimitS | null, instructions (support), items[] }

ContextLine = { roleId, text (course) }

item types:
  function_flashcards           { side: expressions | words, ids[] }
  function_dialogue             { lines[8–14]: { lineId, roleId, text, translation (native), note (support), expressionIds[0–4] } }
  function_matching             { side: expressions | words, pairs[2–6]: { id, answerExplanation } }
  function_gender_select        { ids[] }
  function_dialogue_gap_choice  { expressionId, context, roleId, before, after, choiceExpressionIds[4], answerExplanation }
  function_word_order           { expressionId, context | null, roleId | null, tokens[2–16], distractorTokenIds[0–3], acceptedOrders[1–4], answerExplanation }
                                // practice: no context, no role, no distractors; exam reply: role A's line as context
  function_listening_choice     { expressionId, context, roleId, options[4]: { optionId, text }, answerOptionId, answerExplanation }
  function_translation_exam     { wordId, prompt (native), accepted, answerExplanation }
  function_dialogue_gap_typing  { lines[8–14]: { lineId, roleId, before, translation (native), gap | null, after } }
                                // gap: { gapId, expressionId, accepted, answerExplanation }
```

### 5.3 Validation rules (a failure makes the lesson invalid)

**Brief**
- Expression, word and role IDs are unique; expression texts, word forms and role labels are unique.
- An expression is written without a trailing ellipsis (use `openEnd`), and its example sentence contains it.
- A noun has at least one gender and a teaching form with the indefinite article; other words have no gender. A word's `term` has no article, and its example contains it.
- The first translations of the expressions are unique in every mother tongue, and so are those of the words (they are the matching labels).

**Content against the brief**
- The steps are exactly flashcards, dialogue, matching, gender (only when there are nouns), dialogue gaps, word order, listening, exam, with the right roles.
- Flashcards: one page with every word (when there are words), then one page with every expression.
- Model dialogue: one page; the roles alternate; each line contains the expressions it lists; every expression is used.
- Matching: the expressions in balanced pages of at most 6, in brief order, then the words on their own page.
- Gender: one page with every noun, in brief order.
- Dialogue gaps, word order and listening: one item per page and exactly one per expression.
- Dialogue gap: the gap line belongs to the other role; four distinct expressions including the answer; `before` and `after` without surrounding spaces.
- Word order: every accepted order uses every token except the distractors exactly once; distractors are tokens of the item; the sentence contains the expression. Practice items have no context, role or distractors.
- Listening: the reply belongs to the other role; four distinct options; the answer contains the expression.

**Exam**
- When the lesson has words, the first exam page translates every word once, in brief order, and accepts its teaching form.
- Then reply pages (4–8 replies, balanced pages of at most 4), then one page with the exam dialogue.
- Each reply has role A's line as context and belongs to the other role; no reply repeats a sentence of the brief or of practice.
- Exam dialogue: 3–10 gaps; the roles alternate; a line without a gap keeps its whole text in `before`; each gap accepts its expression; no translation contains the French answer; no line repeats a sentence of the brief or of practice.
- Every expression is examined at least once.

**Timing**
- Every page estimate and exam countdown equals the page rules; `estimatedMinutes` equals the sum of the page estimates.

### 5.4 Zod schema

From [src/schemas/functions.ts](../../src/schemas/functions.ts). `GenderSchema` and `WORD_CLASSES` come from [vocabulary.md](vocabulary.md#54-zod-schema); the building blocks are in [README.md](README.md#shared-zod-building-blocks).

```typescript
export const FUNCTIONS_STAGES = ['flashcards', 'dialogue', 'matching', 'gender', 'dialogue_gaps', 'word_order', 'listening', 'exam'] as const;

/* =================================================================== brief */

const exampleSchema = (lang: string) => z.strictObject({ text: LearningTextSchema, translation: nativeTextSchema(lang) });

export const functionsExpressionSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    text: LearningTextSchema,                        // Je voudrais (no ellipsis)
    openEnd: z.boolean(),                            // displayed as "Je voudrais …"
    translations: nativeTranslationsSchema(lang),
    explanation: LocalizedTextSchema,                // when and how, tu/vous
    example: exampleSchema(lang),
  });

export const functionsWordSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    term: LearningTextSchema,                        // thé
    teachingForm: LearningTextSchema,                // un thé
    translations: nativeTranslationsSchema(lang),
    wordClass: z.enum(WORD_CLASSES),
    genders: z.array(GenderSchema).max(3),
    explanation: LocalizedTextSchema,
    example: exampleSchema(lang),
  });

export const functionsRoleSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    label: LearningTextSchema,                       // le serveur
    translation: nativeTextSchema(lang),
  });

export const functionsBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('functions'),
    theme: ThemeSchema,
    situation: LocalizedTextSchema,
    coverageNotes: LocalizedLongTextSchema,
    prerequisites: z.array(LocalizedTextSchema).max(4),
    roles: z.array(functionsRoleSchema(lang)).length(2),
    expressions: z.array(functionsExpressionSchema(lang)).min(4).max(10),
    words: z.array(functionsWordSchema(lang)).max(6),
    scoring: ScoringPolicySchema,
  });

/* ================================================================= content */

const TokenSchema = z.strictObject({ tokenId: NestedIdSchema, text: LearningTextSchema });
const ContextLineSchema = z.strictObject({ roleId: NestedIdSchema, text: LearningTextSchema });

export const functionsItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('function_flashcards'),
      itemId: NestedIdSchema,
      side: z.enum(['expressions', 'words']),
      ids: z.array(NestedIdSchema).min(1).max(10),
    }),
    z.strictObject({
      type: z.literal('function_dialogue'),
      itemId: NestedIdSchema,
      lines: z.array(z.strictObject({
        lineId: NestedIdSchema,
        roleId: NestedIdSchema,
        text: LearningTextSchema,
        translation: nativeTextSchema(lang),
        note: LocalizedTextSchema,
        expressionIds: z.array(NestedIdSchema).max(4),
      })).min(8).max(14),
    }),
    z.strictObject({
      type: z.literal('function_gender_select'),
      itemId: NestedIdSchema,
      ids: z.array(NestedIdSchema).min(1).max(6),
    }),
    z.strictObject({
      type: z.literal('function_matching'),
      itemId: NestedIdSchema,
      side: z.enum(['expressions', 'words']),
      pairs: z.array(z.strictObject({ id: NestedIdSchema, answerExplanation: LocalizedTextSchema })).min(2).max(6),
    }),
    z.strictObject({
      type: z.literal('function_word_order'),
      itemId: NestedIdSchema,
      expressionId: NestedIdSchema,
      context: ContextLineSchema.nullable(),         // exam replies only
      roleId: NestedIdSchema.nullable(),             // exam replies only
      tokens: z.array(TokenSchema).min(2).max(16),
      distractorTokenIds: z.array(NestedIdSchema).max(3),
      acceptedOrders: z.array(z.array(NestedIdSchema).min(2)).min(1).max(4),
      answerExplanation: LocalizedTextSchema,
    }),
    z.strictObject({
      type: z.literal('function_listening_choice'),
      itemId: NestedIdSchema,
      expressionId: NestedIdSchema,
      context: ContextLineSchema,
      roleId: NestedIdSchema,
      options: z.array(z.strictObject({ optionId: NestedIdSchema, text: LearningTextSchema })).length(4),
      answerOptionId: NestedIdSchema,
      answerExplanation: LocalizedTextSchema,
    }),
    z.strictObject({
      type: z.literal('function_dialogue_gap_choice'),
      itemId: NestedIdSchema,
      expressionId: NestedIdSchema,
      context: ContextLineSchema,
      roleId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      choiceExpressionIds: z.array(NestedIdSchema).length(4),
      answerExplanation: LocalizedTextSchema,
    }),
    z.strictObject({
      type: z.literal('function_translation_exam'),
      itemId: NestedIdSchema,
      wordId: NestedIdSchema,
      prompt: nativeTextSchema(lang),
      accepted: AcceptedAnswersSchema,
      answerExplanation: LocalizedTextSchema,
    }),
    z.strictObject({
      type: z.literal('function_dialogue_gap_typing'),
      itemId: NestedIdSchema,
      lines: z.array(z.strictObject({
        lineId: NestedIdSchema,
        roleId: NestedIdSchema,
        before: z.string().max(300),                 // the whole line when it has no gap
        translation: nativeTextSchema(lang),         // tells the learner what to write
        gap: z.strictObject({
          gapId: NestedIdSchema,
          expressionId: NestedIdSchema,
          accepted: AcceptedAnswersSchema,
          answerExplanation: LocalizedTextSchema,
        }).nullable(),
        after: z.string().max(300),
      })).min(8).max(14),
    }),
  ]);

const pageSchema = (lang: string) =>
  z.strictObject({
    pageId: NestedIdSchema,
    estimatedDurationS: DurationSecondsSchema,
    timeLimitS: TimeLimitSecondsSchema.nullable(),   // exam pages: estimate × 1.5
    instructions: LocalizedTextSchema,
    items: z.array(functionsItemSchema(lang)).min(1).max(6),
  });

export const functionsContentSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('functions'),
    theme: ThemeSchema,
    steps: z.array(z.strictObject({
      id: NestedIdSchema,
      stage: z.enum(FUNCTIONS_STAGES),
      role: z.enum(['presentation', 'exercise', 'exam']),
      label: LocalizedLabelSchema,
      pages: z.array(pageSchema(lang)).min(1).max(20),
    })).min(7).max(8),
  });
```

## 6. Example (`fr-ordering-at-a-cafe`, excerpt)

Full files: [brief](../../content/briefs/fr-ordering-at-a-cafe.json) and [lesson content](../../content/lessons/fr-ordering-at-a-cafe.json). The four expressions are `Vous désirez ?`, `Je voudrais …`, `C’est combien ?` and `L’addition, s’il vous plaît.`; the four words `un café`, `un thé`, `un croissant` and `un jus d’orange`.

**Brief** (one expression and one word):

```json
{
  "kind": "functions",
  "theme": "food_and_drink",
  "title": "Commander au café",
  "estimatedMinutes": 17,
  "situation": { "en": "A customer orders at a café counter; the waiter serves her.", "fr": "…", "de": "…" },
  "roles": [
    { "id": "serveur", "label": "le serveur", "translation": { "en": "the waiter", "de": "der Kellner" } },
    { "id": "cliente", "label": "la cliente", "translation": { "en": "the customer", "de": "die Kundin" } }
  ],
  "expressions": [
    {
      "id": "vous-desirez",
      "text": "Vous désirez ?",
      "openEnd": false,
      "translations": { "en": ["What would you like?"], "de": ["Was darf es sein?"] },
      "explanation": {
        "en": "The waiter’s polite question to take your order (vous).",
        "fr": "La question polie du serveur pour prendre la commande (vous).",
        "de": "Die höfliche Frage des Kellners nach Ihrer Bestellung (vous)."
      },
      "example": { "text": "Bonjour, monsieur. Vous désirez ?", "translation": { "en": "Hello, sir. What would you like?", "de": "Guten Tag. Was darf es sein?" } }
    }
  ],
  "words": [
    {
      "id": "cafe",
      "term": "café",
      "teachingForm": "un café",
      "translations": { "en": ["coffee"], "de": ["Kaffee"] },
      "wordClass": "noun",
      "genders": ["masculine"],
      "explanation": { "en": "Masculine noun: un café.", "fr": "Nom masculin : un café.", "de": "Maskulines Nomen: un café." },
      "example": { "text": "Un café, s’il vous plaît.", "translation": { "en": "A coffee, please.", "de": "Einen Kaffee, bitte." } }
    }
  ]
}
```

**The pages of the lesson content:**

| Step | Pages (estimate / countdown) |
|---|---|
| flashcards | `cards-words` 40 s, `cards-expressions` 48 s |
| dialogue | `dialogue` 140 s (10 lines) |
| matching | `match-expressions-1` 48 s, `match-words-1` 40 s |
| gender | `gender` 40 s |
| dialogue-gaps | `gap-1` … `gap-4`, 15 s each |
| word-order | `order-1` … `order-4`, 25 s each |
| listening | `listening-1` … `listening-4`, 30 s each |
| exam | `exam-words` 60 s / 90 s, `exam-replies-1` 120 s / 180 s, `exam-dialogue` 176 s / 264 s |

**One item of each exercise:**

```json
[
  {
    "type": "function_dialogue",
    "itemId": "dialogue",
    "lines": [
      {
        "lineId": "line-1",
        "roleId": "serveur",
        "text": "Bonjour, madame. Vous désirez ?",
        "translation": { "en": "Hello, madam. What would you like?", "de": "Guten Tag. Was darf es sein?" },
        "note": { "en": "The waiter greets you and asks for your order.", "fr": "…", "de": "…" },
        "expressionIds": ["vous-desirez"]
      },
      {
        "lineId": "line-2",
        "roleId": "cliente",
        "text": "Bonjour. Je voudrais un café, s’il vous plaît.",
        "translation": { "en": "Hello. I would like a coffee, please.", "de": "Guten Tag. Ich hätte gern einen Kaffee, bitte." },
        "note": { "en": "Je voudrais + what you want: the polite way to order.", "fr": "…", "de": "…" },
        "expressionIds": ["je-voudrais"]
      }
    ]
  },
  {
    "type": "function_dialogue_gap_choice",
    "itemId": "gap-1",
    "expressionId": "je-voudrais",
    "context": { "roleId": "serveur", "text": "Bonsoir, madame. Vous désirez ?" },
    "roleId": "cliente",
    "before": "",
    "after": "un chocolat chaud, s’il vous plaît.",
    "choiceExpressionIds": ["je-voudrais", "vous-desirez", "cest-combien", "laddition"],
    "answerExplanation": { "en": "The customer orders: Je voudrais + the drink.", "fr": "…", "de": "…" }
  },
  {
    "type": "function_word_order",
    "itemId": "order-1",
    "expressionId": "vous-desirez",
    "context": null,
    "roleId": null,
    "tokens": [
      { "tokenId": "t1", "text": "Bonsoir," },
      { "tokenId": "t2", "text": "monsieur." },
      { "tokenId": "t3", "text": "Vous" },
      { "tokenId": "t4", "text": "désirez" },
      { "tokenId": "t5", "text": "?" }
    ],
    "distractorTokenIds": [],
    "acceptedOrders": [["t1", "t2", "t3", "t4", "t5"]],
    "answerExplanation": { "en": "Greeting first, then the waiter’s question Vous désirez ?", "fr": "…", "de": "…" }
  },
  {
    "type": "function_listening_choice",
    "itemId": "listening-1",
    "expressionId": "je-voudrais",
    "context": { "roleId": "serveur", "text": "Bonjour, madame. Vous désirez ?" },
    "roleId": "cliente",
    "options": [
      { "optionId": "o1", "text": "Je voudrais un thé, s’il vous plaît." },
      { "optionId": "o2", "text": "Et avec ceci ?" },
      { "optionId": "o3", "text": "Sur place ou à emporter ?" },
      { "optionId": "o4", "text": "L’addition, s’il vous plaît." }
    ],
    "answerOptionId": "o1",
    "answerExplanation": { "en": "The waiter asks for the order: she orders with Je voudrais.", "fr": "…", "de": "…" }
  },
  {
    "type": "function_translation_exam",
    "itemId": "word-cafe",
    "wordId": "cafe",
    "prompt": { "en": "coffee", "de": "Kaffee" },
    "accepted": { "answers": ["un café"] },
    "answerExplanation": { "en": "Masculine noun: un café.", "fr": "Nom masculin : un café.", "de": "Maskulines Nomen: un café." }
  },
  {
    "type": "function_word_order",
    "itemId": "reply-1",
    "expressionId": "je-voudrais",
    "context": { "roleId": "serveur", "text": "Madame, vous désirez ?" },
    "roleId": "cliente",
    "tokens": [
      { "tokenId": "t1", "text": "Je" },
      { "tokenId": "t2", "text": "voudrais" },
      { "tokenId": "t3", "text": "une limonade," },
      { "tokenId": "t4", "text": "s’il vous plaît" },
      { "tokenId": "t5", "text": "voudrait" },
      { "tokenId": "t6", "text": "un" }
    ],
    "distractorTokenIds": ["t5", "t6"],
    "acceptedOrders": [["t1", "t2", "t3", "t4"]],
    "answerExplanation": { "en": "Je voudrais (with -s after je) + une limonade (feminine).", "fr": "…", "de": "…" }
  },
  {
    "type": "function_dialogue_gap_typing",
    "itemId": "exam-dialogue",
    "lines": [
      {
        "lineId": "exam-line-1",
        "roleId": "serveur",
        "before": "Bonsoir, madame.",
        "translation": { "en": "Good evening, madam. What would you like?", "de": "Guten Abend. Was darf es sein?" },
        "gap": {
          "gapId": "gap-1",
          "expressionId": "vous-desirez",
          "accepted": { "answers": ["Vous désirez"] },
          "answerExplanation": { "en": "The waiter asks for the order: Vous désirez ?", "fr": "…", "de": "…" }
        },
        "after": "?"
      },
      {
        "lineId": "exam-line-2",
        "roleId": "cliente",
        "before": "Bonsoir.",
        "translation": { "en": "Good evening. I would like a lemonade.", "de": "Guten Abend. Ich hätte gern eine Limonade." },
        "gap": {
          "gapId": "gap-2",
          "expressionId": "je-voudrais",
          "accepted": { "answers": ["Je voudrais", "Je prends"] },
          "answerExplanation": { "en": "She orders: Je voudrais (or Je prends) + the drink.", "fr": "…", "de": "…" }
        },
        "after": "une limonade."
      },
      {
        "lineId": "exam-line-3",
        "roleId": "serveur",
        "before": "Une limonade. Et avec ceci ?",
        "translation": { "en": "A lemonade. Anything else?", "de": "Eine Limonade. Sonst noch etwas?" },
        "gap": null,
        "after": ""
      }
    ]
  }
]
```

`…` marks text left out here; the files have every locale. The exam dialogue is cut after three lines.

## 7. Mockups (PlantUML Salt)

In [docs/mockups/05-function-lesson/](../mockups/05-function-lesson/); previews with the [mockup guide](../mockups/README.md).

| Screen | Mockup |
|---|---|
| Lesson start | [lesson-start.puml](../mockups/05-function-lesson/01-startpage/lesson-start.puml) |
| Expression flashcards | [expression-flashcards.puml](../mockups/05-function-lesson/02-flashcards/expression-flashcards.puml) |
| Model dialogue | [dialogue.puml](../mockups/05-function-lesson/03-dialogue/dialogue.puml) |
| Matching | [expression-matching.puml](../mockups/05-function-lesson/04-matching/expression-matching.puml) |
| Dialogue gap | [dialogue-gap-choice.puml](../mockups/05-function-lesson/05-dialogue-gap-choice/dialogue-gap-choice.puml) |
| Word order | [word-order.puml](../mockups/05-function-lesson/06-word-order/word-order.puml) |
| Listening choice | [listening-choice.puml](../mockups/05-function-lesson/07-listening-choice/listening-choice.puml) |
| Exam: replies, dialogue | [reply-word-order.puml](../mockups/05-function-lesson/08-exam/reply-word-order.puml), [dialogue-gap-typing.puml](../mockups/05-function-lesson/08-exam/dialogue-gap-typing.puml) |

The gender page and the translation exam are the vocabulary ones ([gender-select.puml](../mockups/03-vocabulary-lesson/05-gender-overview/gender-select.puml), [exam-page.puml](../mockups/03-vocabulary-lesson/07-exam/exam-page.puml)).

## 8. For ft_transcendence

Components of their own (besides the shared ones of [README.md](README.md#4-components-to-build-once)): the model dialogue (line cards revealed with **Next line**), the dialogue gap with four expressions, the listening choice with spoken replies, the exam reply (word order with distractors under role A's line), and the exam dialogue with typed gaps.

ft_transcendence has no function-specific fields today: a function draft would be the generic `{ objective, points, examples, pitfalls }`. The prototype brief adds the situation, the roles, the expressions (with `openEnd`) and the words, and the content adds the dialogues and every exercise.

Points to decide for functions:

1. 16–17 minutes with 4 expressions. Ten minutes means 3 expressions, no words, or dropping one practice stage (listening or word order).
2. The prototype wrote the three test lessons by hand (`authoring/functions/<id>.ts`, `node scripts/author-functions.ts <id>`). The generator does not support functions yet: Gemini, Jules or hand writing for the other lessons (#83)?
3. Listening needs a voice for the course language: without one the lesson cannot start. Keep that rule, or let the lesson skip its listening pages?
