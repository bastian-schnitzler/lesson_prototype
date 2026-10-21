# Reading lessons

Design: **prepare, then read**. A reading lesson teaches 4–6 key words of a text, lets the learner skim a real-looking document under a countdown, then read it for detail and structure, and ends with a short exam on a second document of the same kind.

A reading lesson has two artifacts: the **brief** plans the key words, both documents and the questions; the **lesson content** holds both documents once and the six steps that show them. Every document uses one layout whatever its genre, and every exercise reuses a control of vocabulary, grammar or functions. Reading adds only two pieces of its own: the **document view** and the **skim phase**.

Shared rules (envelope, languages, Check/Continue, scoring, 35 / 65 weights, exam countdown, results) are in [README.md](README.md). Reading started from the requirement in ft_transcendence #115; [section 8](#8-differences-from-the-115-requirement) lists where the prototype differs from it.

> The reading code is not on `main` yet: it is in the PR stack #106 → #107 → #108. The links below point to the branch [`P5-04-reading-renderers`](https://github.com/bastian-schnitzler/lesson_prototype/tree/P5-04-reading-renderers). Source: SPEC section 9, [src/schemas/reading.ts](https://github.com/bastian-schnitzler/lesson_prototype/blob/P5-04-reading-renderers/src/schemas/reading.ts), [src/domain/readingLesson.ts](https://github.com/bastian-schnitzler/lesson_prototype/blob/P5-04-reading-renderers/src/domain/readingLesson.ts), [src/validation/reading.ts](https://github.com/bastian-schnitzler/lesson_prototype/blob/P5-04-reading-renderers/src/validation/reading.ts).

---

## 1. What the learner sees

Every reading lesson has the same five stages, from A1 to C2. Times are for `fr-reading-a-text-message` (A1, 5 key words, 4 detail questions): 8 minutes.

| # | Stage | ≈ Time | What the learner does | Counts for |
|---|---|---|---|---|
| 1a | **Flashcards** | 50 s | The vocabulary flashcards: the mother-tongue meaning in front; the key word with a speaker and a short explanation behind. Every card must be turned. | – |
| 1b | **Matching** | 50 s | The vocabulary matching board: meaning ↔ key word. | practice, 1 per key word |
| 2 | **Skim** | 1 min 05 | The main document with its key words highlighted, under a countdown box **Time to skim** (45 s at A1 for this text). When the time is up, or when the learner presses **I've finished reading**, the document is put away (no blur: nothing of it stays on screen) and **one global question** opens under **Answer from memory**: what kind of document it is, who wrote it, or why. **Check**, then the document comes back with the correction. | practice, 1 |
| 3 | **Detail** | 2 min | 3–4 questions (multiple choice or true / false) with the document open beside them (side by side from 1100 px, stacked below). | practice, 1 per question |
| 4 | **Structure** | 45 s | 3–6 pieces of information to put in the order the text gives them, on the word-order control (phrases instead of words). The document stays open. | practice, 1 |
| 5 | **Exam** | 2 min 25 | Exam info page, then a **second, shorter document of the same genre** with **5 questions on one page** and a countdown. No highlighting, no help, no feedback until the results. | exam, 1 per question |

Results follow (see [README.md](README.md#results)): the exam has one page, so the **Final exam** entry has no parts; the practice entries are Matching, Skim, Detail and Structure.

On the start page the outline has three sections: **A Key words** (Flashcards, Matching), **B The document** (Skim, Detail, Structure), **C Final exam** ("Answer 5 questions on 1 timed page"). The genre is not shown, since the skim question may ask for it.

## 2. Exercises: fixed and varying parts

| Fixed in every lesson | Varies from lesson to lesson |
|---|---|
| The five stages, their order and roles | The genre: it steers the text the author or the generator writes, not the layout |
| 4–6 key words: flashcards, then matching | The key words |
| One skim question about the whole document | Its focus: `genre`, `author` or `purpose` |
| 3–4 detail questions | Their types and order |
| One structure task: pieces of information in order | The pieces |
| 5 exam questions on one timed page, on a second document of the same genre | Their types |
| One score from 0 to 100, practice 35 % / exam 65 % | Text lengths and skim time, from the level and the actual word count |

**Question types** (skim, detail and exam):

- **Multiple choice**: 3–4 options, exactly one right; options are shuffled from the session seed.
- **True / false**: a statement that the text confirms or contradicts. The options **Vrai** / **Faux** are in the course language like every option, and keep their order.

Left out for now: short typed answers (they need spelling and variant rules), a third answer *not stated* (it needs statements that are plausible yet really absent), and evidence marks (the sentences that prove an answer). Explanations quote the words of the text instead.

### Pages reused and new

| Page | Reused from | New for reading |
|---|---|---|
| Flashcards, matching | Vocabulary flashcards and matching board | – |
| Skim | The exam countdown box (label **Time to skim**), the choice cards of grammar gaps | The document view; the skim phase (countdown on a practice page, document put away) |
| Detail | The choice cards; true / false as two choice cards in fixed order | The document view beside the questions |
| Structure | The grammar word-order control, with pieces as tokens | The document view beside the task |
| Exam info, exam, results | The shared pages | The document view (without highlights) |

### Exceptions to the shared session rules

- **Countdown in practice**: the skim page is the only practice page with a countdown. It has no absolute deadline: a reload before the time is up restarts it. Once put away, the document stays away until the question is checked.
- **Correction view**: pages with a document (skim, detail, structure) always keep their checked view and wait for **Continue**, even when every answer is right: the learner wants to see which facts were right. The skim question is confirmed with **Check**, not by choosing.
- **No typed answers**, so no half points.
- **Audio**: only the key words (flashcards, matching). Documents, questions and answers are not read aloud. A reading lesson has no listening task, so it starts without a voice for the course language.

## 3. The exam

- A **new document of the same genre**, about half as long as the main one, about facts the main document does not give.
- **5 questions** on **one page**, any mix of the brief's question types, numbered, with "n of 5 answered" next to Continue.
- An exam info page comes first, with the row **Questions on the document** and the countdown.
- Countdown: **1.5 × the page estimate, rounded up to 5 s**. It is derived from the page rules, not set in the brief.
- Continue or the countdown submits the page; unanswered questions earn zero.

## 4. Text length, skim time and page rules

Words are whitespace-separated tokens that contain at least one letter or digit, over everything a document shows (title, meta lines, paragraphs): `l'heure` is one word, `15` is one, `€` and `?` are none.

| Level | Main document | Exam document | Skim speed (words per minute) |
|---|---|---|---|
| A1 | 40–80 | 20–40 | 75 |
| A2 | 80–150 | 40–75 | 90 |
| B1 | 150–250 | 75–125 | 110 |
| B2 | 250–400 | 125–200 | 130 |
| C1 | 400–550 | 200–275 | 150 |
| C2 | 550–700 | 275–350 | 170 |

A document outside its range is invalid. **Skim time** = the main document's word count at the skim speed of its level, rounded up to 5 s, at least 15 s (55 words at A1: 45 s). It is stored in the lesson content and may be changed by hand; validation checks only its bounds (15–300 s). The ranges and speeds are starting values, to be tuned after play tests.

| Stage | Pages | Estimate | Exam countdown |
|---|---|---|---|
| 1a Flashcards | one page with every key word | 10 s per key word | – |
| 1b Matching | one board with every key word | 10 s per key word | – |
| 2 Skim | one page | `skimSeconds` + 20 s | – |
| 3 Detail | one page | 30 s per question | – |
| 4 Structure | one page | 15 s per piece | – |
| Exam info | application page, not stored | 20 s | – |
| 5 Exam | one page | reading time of the exam document at the skim speed + 20 s per question | 1.5 × estimate, rounded up to 5 s |

With these rules an A1 lesson takes about 8 minutes and a C2 lesson about 14.

```typescript
export const READING_PAGE_RULES = {
  keywordCardS: 10,
  keywordPairS: 10,
  skimQuestionS: 20,
  detailQuestionS: 30,
  orderPieceS: 15,
  examQuestionS: 20,
  timeLimitFactor: 1.5,
  roundS: 5,                       // skim times and exam limits are rounded up to this step
} as const;

export const READING_SKIM_WPM: Record<Level, number> = { A1: 75, A2: 90, B1: 110, B2: 130, C1: 150, C2: 170 };

const roundUp = (seconds: number) => Math.ceil(seconds / READING_PAGE_RULES.roundS) * READING_PAGE_RULES.roundS;

/** Words of a text: whitespace-separated tokens with at least one letter or digit. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Words of everything a document shows: title, meta lines and paragraphs. */
export function documentWords(doc: Pick<ReadingDocument, 'title' | 'meta' | 'paragraphs'>): number {
  return [doc.title, ...doc.meta, ...doc.paragraphs].reduce((n, text) => n + (text ? countWords(text) : 0), 0);
}

const readingTime = (words: number, level: Level) => (words * 60) / READING_SKIM_WPM[level];

/** Skim time of the main document: rounded up to 5 s, at least 15 s. */
export function readingSkimSeconds(doc: Pick<ReadingDocument, 'title' | 'meta' | 'paragraphs'>, level: Level): number {
  return Math.max(15, roundUp(readingTime(documentWords(doc), level)));
}

/** Countdown of the exam page: 1.5 times its estimate, rounded up to 5 s. */
export const readingTimeLimit = (estimateS: number) => roundUp(estimateS * READING_PAGE_RULES.timeLimitFactor);
```

## 5. Data a reading lesson needs

### 5.1 Brief

| Field | Type | Rule |
|---|---|---|
| envelope | see [README.md](README.md#2-the-shared-envelope) | `kind: "reading"`, `theme` from the outline (never a `topic`) |
| `genre` | enum | `text_message`, `email`, `letter`, `postcard`, `invitation`, `sign`, `notice`, `menu`, `recipe`, `classified_ad`, `profile`, `programme`, `timetable`, `article`, `forum_post`, `review`, `dictionary_entry`, `contract`, `speech`, `poem`, `other`. It steers the text, not the layout: a memo is a `notice`, an editorial an `article`. |
| `situation` | support | Who writes to whom, and why. |
| `readerTask` | support | What the learner must find (from the outline intent). |
| `keywords[4–6]` | `{ id, term, translations, explanation }` | `term` in the course language as taught; `translations` per mother tongue (the flashcard front; the first is the matching label and unique in the lesson); `explanation` (support) on the card's back and in the matching correction. |
| `documents.main`, `documents.exam` | `{ targetWords, contents }` | `targetWords` within the level range; `contents` (support, long) says what the text contains, so the content step writes the planned text. |
| `skim` | `{ focus }` | `genre`, `author` or `purpose`. |
| `detailQuestions[3–4]` | `{ id, type, focus }` | `type`: `reading_choice` or `reading_true_false`; `focus` (support) names the fact checked. |
| `exam` | `{ types[1–2] }` | The question types of the five exam questions. |
| `scoring` | `{ 35, 65, 0.5 }` | Fixed. |

### 5.2 Content (rendered by the frontend)

```
genre                                                // equals the brief
documents[2]: {
  documentId: "main" | "exam",
  title (course) | null,
  meta[0–4] (course),                                // sender, date, byline, address…
  paragraphs[1–12] (course),                         // "\n" inside starts a new line: menu line, verse, timetable row
  highlights[0–24]: { keywordId, text }              // main: every key word; exam: none
}
steps[6]: flashcards, matching, skim, detail, structure, exam
  each: { id, stage, role: exercise | exam, label (support), pages[1] }
page: { pageId, estimatedDurationS, timeLimitS | null, instructions (support), items[1–6] }

item types:
  reading_flashcards         { keywordIds }
  reading_keyword_matching   { keywordIds }                       // labels and explanations come from the brief
  reading_document           { documentId, view: skim | open | exam, skimSeconds | null }   // first item of its page
  reading_skim_choice        { focus, question, options[3–4], answerOptionId, answerExplanation }
  reading_choice             { question, options[3–4], answerOptionId, answerExplanation }
  reading_true_false         { statement, answer: "true" | "false", answerExplanation }
  reading_order              { pieces[3–6], acceptedOrders[1–2], answerExplanation }
```

Both documents are stored once; the pages only refer to them. A paragraph can be prose, a message bubble, a menu section, a sign, a stanza or a contract clause. A timetable or a programme writes one row per line, columns separated by ` · `; there is no table layout and no heading besides the title.

### 5.3 Validation rules (a failure makes the lesson invalid)

**Brief and key words**
- 4–6 key words with unique IDs, unique terms, and unique first translations in each mother tongue.

**Documents**
- Both documents have the brief's genre, and their word counts are in the level's range.
- Every highlight is found word for word in the main document (it may be an inflected form); every key word is highlighted; the exam document has no highlight.

**Steps and pages**
- The six steps in order, one page each, with the page rules and `estimatedMinutes`.
- The main document is on the skim, detail and structure pages and the exam document on the exam page, first on its page, in the view of its stage.
- Flashcards and matching cover every key word.
- Only the exam page has a countdown, equal to the derived limit.

**Questions**
- The skim question has the brief's focus.
- The detail questions are the brief's, in its order, with its types.
- Options are unique, with exactly one right.
- Pieces are unique, and every accepted order uses every piece exactly once.
- The exam page has exactly 5 questions, of the planned types.

### 5.4 Zod schema

From [src/schemas/reading.ts](https://github.com/bastian-schnitzler/lesson_prototype/blob/P5-04-reading-renderers/src/schemas/reading.ts). The building blocks are in [README.md](README.md#shared-zod-building-blocks).

```typescript
export const READING_GENRES = [
  'text_message', 'email', 'letter', 'postcard', 'invitation', 'sign', 'notice', 'menu', 'recipe', 'classified_ad', 'profile',
  'programme', 'timetable', 'article', 'forum_post', 'review', 'dictionary_entry', 'contract', 'speech', 'poem', 'other',
] as const;
export const ReadingGenreSchema = z.enum(READING_GENRES);

/** Words of the main and the exam document per level. Starting values. */
export const READING_WORDS: Record<Level, { main: readonly [number, number]; exam: readonly [number, number] }> = {
  A1: { main: [40, 80], exam: [20, 40] },
  A2: { main: [80, 150], exam: [40, 75] },
  B1: { main: [150, 250], exam: [75, 125] },
  B2: { main: [250, 400], exam: [125, 200] },
  C1: { main: [400, 550], exam: [200, 275] },
  C2: { main: [550, 700], exam: [275, 350] },
};

export const READING_LIMITS = {
  keywords: [4, 6],
  detailQuestions: [3, 4],
  examQuestions: 5,
  options: [3, 4],
  paragraphs: [1, 12],
  orderPieces: [3, 6],
  skimSeconds: [15, 300],
} as const;

export const READING_STAGES = ['flashcards', 'matching', 'skim', 'detail', 'structure', 'exam'] as const;
export const SKIM_FOCUS = ['genre', 'author', 'purpose'] as const;
export const READING_QUESTION_TYPES = ['reading_choice', 'reading_true_false'] as const;

/* =================================================================== brief */

export const readingKeywordSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    term: LearningTextSchema,                         // on se voit
    translations: nativeTranslationsSchema(lang),     // flashcard front; first = matching label
    explanation: LocalizedTextSchema,                 // flashcard back, matching correction
  });

const DocumentPlanSchema = z.strictObject({
  targetWords: z.number().int().min(10).max(1000),
  contents: LocalizedLongTextSchema,                  // what the document says
});

export const readingBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('reading'),
    theme: ThemeSchema,
    genre: ReadingGenreSchema,
    situation: LocalizedTextSchema,
    readerTask: LocalizedTextSchema,
    keywords: z.array(readingKeywordSchema(lang)).min(4).max(6),
    documents: z.strictObject({ main: DocumentPlanSchema, exam: DocumentPlanSchema }),
    skim: z.strictObject({ focus: z.enum(SKIM_FOCUS) }),
    detailQuestions: z
      .array(z.strictObject({ id: NestedIdSchema, type: z.enum(READING_QUESTION_TYPES), focus: LocalizedTextSchema }))
      .min(3)
      .max(4),
    exam: z.strictObject({ types: z.array(z.enum(READING_QUESTION_TYPES)).min(1).max(2) }),
    scoring: ScoringPolicySchema,
  });

/* ================================================================= content */

export const ReadingDocumentSchema = z.strictObject({
  documentId: z.enum(['main', 'exam']),
  title: LearningTextSchema.nullable(),
  meta: z.array(LearningTextSchema).max(4),
  paragraphs: z.array(z.string().trim().min(1).max(TEXT_LIMITS.long)).min(1).max(12),
  highlights: z.array(z.strictObject({ keywordId: NestedIdSchema, text: LearningTextSchema })).max(24),
});

const OptionsSchema = z
  .array(z.strictObject({ optionId: NestedIdSchema, text: LearningTextSchema }))
  .min(3)
  .max(4);

export const readingItemSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('reading_flashcards'), itemId: NestedIdSchema, keywordIds: z.array(NestedIdSchema).min(1) }),
  z.strictObject({ type: z.literal('reading_keyword_matching'), itemId: NestedIdSchema, keywordIds: z.array(NestedIdSchema).min(2) }),
  z.strictObject({
    type: z.literal('reading_document'),
    itemId: NestedIdSchema,
    documentId: z.enum(['main', 'exam']),
    view: z.enum(['skim', 'open', 'exam']),
    skimSeconds: z.number().int().min(15).max(300).nullable(),   // skim view only
  }),
  z.strictObject({
    type: z.literal('reading_skim_choice'),
    itemId: NestedIdSchema,
    focus: z.enum(SKIM_FOCUS),
    question: LearningTextSchema,
    options: OptionsSchema,
    answerOptionId: NestedIdSchema,
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_choice'),
    itemId: NestedIdSchema,
    question: LearningTextSchema,
    options: OptionsSchema,
    answerOptionId: NestedIdSchema,
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_true_false'),
    itemId: NestedIdSchema,
    statement: LearningTextSchema,
    answer: z.enum(['true', 'false']),
    answerExplanation: LocalizedTextSchema,
  }),
  z.strictObject({
    type: z.literal('reading_order'),
    itemId: NestedIdSchema,
    pieces: z.array(z.strictObject({ pieceId: NestedIdSchema, text: LearningTextSchema })).min(3).max(6),
    acceptedOrders: z.array(z.array(NestedIdSchema)).min(1).max(2),
    answerExplanation: LocalizedTextSchema,
  }),
]);

const PageSchema = z.strictObject({
  pageId: NestedIdSchema,
  estimatedDurationS: DurationSecondsSchema,
  timeLimitS: TimeLimitSecondsSchema.nullable(),      // exam page: 1.5 × estimate, rounded up to 5 s
  instructions: LocalizedTextSchema,
  items: z.array(readingItemSchema).min(1).max(6),
});

export const readingContentSchema = (_lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('reading'),
    theme: ThemeSchema,
    genre: ReadingGenreSchema,
    documents: z.array(ReadingDocumentSchema).length(2),
    steps: z.array(z.strictObject({
      id: NestedIdSchema,
      stage: z.enum(READING_STAGES),
      role: z.enum(['exercise', 'exam']),
      label: LocalizedLabelSchema,
      pages: z.array(PageSchema).length(1),
    })).length(6),
  });

/** True / false labels, in the course language like every option. */
export const TRUE_FALSE_LABELS: Record<string, Record<'true' | 'false', string>> = {
  fr: { true: 'Vrai', false: 'Faux' },
  de: { true: 'Richtig', false: 'Falsch' },
  en: { true: 'True', false: 'False' },
};
```

## 6. Example (`fr-reading-a-text-message`)

Full files on the branch: [brief](https://github.com/bastian-schnitzler/lesson_prototype/blob/P5-04-reading-renderers/content/briefs/fr-reading-a-text-message.json) and [lesson content](https://github.com/bastian-schnitzler/lesson_prototype/blob/P5-04-reading-renderers/content/lessons/fr-reading-a-text-message.json). `provenance` is left out, and `…` marks locales left out here.

**Brief** (two of the five key words, all four detail questions):

```json
{
  "schemaVersion": 2,
  "id": "fr-reading-a-text-message",
  "kind": "reading",
  "lang": "fr",
  "level": "A1",
  "locales": ["en", "fr", "de"],
  "theme": "daily_life",
  "title": "Lire un SMS",
  "objective": {
    "en": "Read a short text message from a friend and find the day, the time and the place of the meeting, and what happens first.",
    "fr": "Lire un court SMS d’un ami et retrouver le jour, l’heure et le lieu du rendez-vous, et ce qui se passe en premier.",
    "de": "Eine kurze SMS von einer Freundin lesen und Tag, Uhrzeit und Ort des Treffens finden, und was zuerst passiert."
  },
  "estimatedMinutes": 8,
  "genre": "text_message",
  "situation": { "en": "Léa sends her friend Tom a text message on Thursday evening to plan Saturday.", "fr": "…", "de": "…" },
  "readerTask": { "en": "Find the day, the time and the place of the meeting, and put Saturday’s plans in order.", "fr": "…", "de": "…" },
  "keywords": [
    {
      "id": "samedi",
      "term": "samedi",
      "translations": { "en": ["Saturday"], "de": ["Samstag"] },
      "explanation": {
        "en": "A day of the week. Days take no capital letter in French.",
        "fr": "Un jour de la semaine. Les jours s’écrivent sans majuscule.",
        "de": "Ein Wochentag. Wochentage schreibt man im Französischen klein."
      }
    },
    {
      "id": "on-se-voit",
      "term": "on se voit",
      "translations": { "en": ["we meet", "shall we meet"], "de": ["wir treffen uns", "sehen wir uns"] },
      "explanation": {
        "en": "Friendly way to suggest meeting: on means nous in everyday French.",
        "fr": "Façon amicale de proposer de se retrouver : on veut dire nous à l’oral.",
        "de": "Freundliche Art, ein Treffen vorzuschlagen: on bedeutet im Alltag nous (wir)."
      }
    }
  ],
  "documents": {
    "main": {
      "targetWords": 55,
      "contents": { "en": "Three bubbles from Léa: hello and are you free on Saturday afternoon; the plan (dinner at hers in the evening, but first the station café at 15 h, then the cinema at 17 h); answer before Friday.", "fr": "…", "de": "…" }
    },
    "exam": {
      "targetWords": 31,
      "contents": { "en": "Paul suggests football in the park on Sunday at 10 h at the entrance, then a picnic; Tom brings water.", "fr": "…", "de": "…" }
    }
  },
  "skim": { "focus": "purpose" },
  "detailQuestions": [
    { "id": "q-day", "type": "reading_choice", "focus": { "en": "The day of the meeting", "fr": "…", "de": "…" } },
    { "id": "q-time", "type": "reading_choice", "focus": { "en": "The time of the meeting", "fr": "…", "de": "…" } },
    { "id": "q-place", "type": "reading_choice", "focus": { "en": "The meeting place", "fr": "…", "de": "…" } },
    { "id": "q-dinner", "type": "reading_true_false", "focus": { "en": "Where they eat in the evening", "fr": "…", "de": "…" } }
  ],
  "exam": { "types": ["reading_choice", "reading_true_false"] },
  "scoring": { "practiceWeight": 35, "examWeight": 65, "orthographyCredit": 0.5 }
}
```

**Lesson content: the two documents.**

```json
[
  {
    "documentId": "main",
    "title": null,
    "meta": ["Léa", "Jeudi 18:42"],
    "paragraphs": [
      "Salut Tom ! Tu es libre samedi après-midi ?",
      "Samedi soir, on mange chez moi avec Paul. On fait des crêpes ! Mais avant, on se voit à 15 h au café de la gare ? Après le café, on va au cinéma à 17 h.",
      "Si tu ne peux pas, dis-le-moi avant vendredi. Bisous, Léa"
    ],
    "highlights": [
      { "keywordId": "samedi", "text": "samedi" },
      { "keywordId": "on-se-voit", "text": "on se voit" },
      { "keywordId": "la-gare", "text": "la gare" },
      { "keywordId": "avant", "text": "avant" },
      { "keywordId": "apres", "text": "Après" }
    ]
  },
  {
    "documentId": "exam",
    "title": null,
    "meta": ["Paul", "Vendredi 9:15"],
    "paragraphs": [
      "Salut Tom ! Dimanche matin, on joue au foot au parc Monceau ? Rendez-vous à 10 h devant l’entrée.",
      "Après le match, pique-nique ! Apporte de l’eau, j’ai les sandwichs. Paul"
    ],
    "highlights": []
  }
]
```

**Lesson content: the six steps.**

| Step | Page estimate / countdown | Items |
|---|---|---|
| flashcards | 50 s | `reading_flashcards` (5 key words) |
| matching | 50 s | `reading_keyword_matching` (5 key words) |
| skim | 65 s (45 s skim + 20 s) | `reading_document` (main, `skim`, `skimSeconds: 45`), `reading_skim_choice` |
| detail | 120 s | `reading_document` (main, `open`), 3 × `reading_choice`, 1 × `reading_true_false` |
| structure | 45 s | `reading_document` (main, `open`), `reading_order` (3 pieces) |
| exam | 125 s / 190 s | `reading_document` (exam, `exam`), 4 × `reading_choice`, 1 × `reading_true_false` |

**The skim and structure pages:**

```json
[
  {
    "type": "reading_document",
    "itemId": "skim-document",
    "documentId": "main",
    "view": "skim",
    "skimSeconds": 45
  },
  {
    "type": "reading_skim_choice",
    "itemId": "skim-question",
    "focus": "purpose",
    "question": "Pourquoi Léa écrit-elle à Tom ?",
    "options": [
      { "optionId": "o1", "text": "Pour annuler un rendez-vous" },
      { "optionId": "o2", "text": "Pour dire merci pour un cadeau" },
      { "optionId": "o3", "text": "Pour demander l’heure du train" },
      { "optionId": "o4", "text": "Pour proposer de se voir samedi" }
    ],
    "answerOptionId": "o4",
    "answerExplanation": {
      "en": "Tu es libre samedi ? and on se voit… ? are invitations: Léa suggests meeting.",
      "fr": "Tu es libre samedi ? et on se voit… ? sont des propositions : Léa propose de se voir.",
      "de": "Tu es libre samedi ? und on se voit… ? sind Vorschläge: Léa möchte sich treffen."
    }
  },
  {
    "type": "reading_true_false",
    "itemId": "q-dinner",
    "statement": "Samedi soir, Tom, Léa et Paul mangent au restaurant.",
    "answer": "false",
    "answerExplanation": {
      "en": "False: on mange chez moi means at Léa’s home, not in a restaurant.",
      "fr": "Faux : on mange chez moi veut dire chez Léa, pas au restaurant.",
      "de": "Falsch: on mange chez moi heißt bei Léa zu Hause, nicht im Restaurant."
    }
  },
  {
    "type": "reading_order",
    "itemId": "order",
    "pieces": [
      { "pieceId": "p2", "text": "Ils vont au cinéma." },
      { "pieceId": "p3", "text": "Ils mangent des crêpes chez Léa avec Paul." },
      { "pieceId": "p1", "text": "Tom et Léa se voient au café de la gare." }
    ],
    "acceptedOrders": [["p1", "p2", "p3"]],
    "answerExplanation": {
      "en": "Café at 15 h (Mais avant…), then cinema at 17 h (Après le café…), then dinner in the evening (Samedi soir). The message gives the evening first.",
      "fr": "Café à 15 h (Mais avant…), puis cinéma à 17 h (Après le café…), puis dîner le soir (Samedi soir). Le message parle du soir en premier.",
      "de": "Café um 15 h (Mais avant…), dann Kino um 17 h (Après le café…), dann abends Essen (Samedi soir). Die SMS nennt den Abend zuerst."
    }
  }
]
```

The ten fr/A1 test lessons (written by hand, 5 key words, 4 detail questions, 8 minutes each): online profile, public signs, text message, restaurant menu, flat ad, holiday postcard, event programme, party invitation, train timetable, written directions.

## 7. Mockups (PlantUML Salt)

In [docs/mockups/06-reading-lesson/](../mockups/06-reading-lesson/) (already on `main`); previews with the [mockup guide](../mockups/README.md).

| Screen | Mockup |
|---|---|
| Lesson start | [lesson-start.puml](../mockups/06-reading-lesson/01-startpage/lesson-start.puml) |
| Flashcards, matching | [flashcards.puml](../mockups/06-reading-lesson/02-flashcards/flashcards.puml), [matching.puml](../mockups/06-reading-lesson/02-flashcards/matching.puml) |
| Skim, question from memory, after Check | [skim.puml](../mockups/06-reading-lesson/03-skim/skim.puml), [skim-question.puml](../mockups/06-reading-lesson/03-skim/skim-question.puml), [skim-feedback.puml](../mockups/06-reading-lesson/03-skim/skim-feedback.puml) |
| Detail, after Check | [detail.puml](../mockups/06-reading-lesson/04-detail/detail.puml), [detail-feedback.puml](../mockups/06-reading-lesson/04-detail/detail-feedback.puml) |
| Structure, after Check | [ordering.puml](../mockups/06-reading-lesson/05-structure/ordering.puml), [ordering-feedback.puml](../mockups/06-reading-lesson/05-structure/ordering-feedback.puml) |
| Exam info, exam page | [exam-info.puml](../mockups/06-reading-lesson/06-exam/exam-info.puml), [exam-page.puml](../mockups/06-reading-lesson/06-exam/exam-page.puml) |
| Results | [exam-results.puml](../mockups/06-reading-lesson/07-results/exam-results.puml) |
| Artifact view (brief and content) | [lesson-detail.puml](../mockups/02-artifact-view/reading/lesson-detail.puml) |

## 8. Differences from the #115 requirement

The prototype follows the simplified design of #115 (five stages, one layout, two question types, one exam page, no evidence marks), with the answers of the product-owner review of 2026-10-15:

| Point | #115 | Prototype |
|---|---|---|
| Weights | 30 % practice / 70 % exam | 35 / 65, the same as every kind |
| Skim time | A fixed time per level (45 s at A1) | From the actual word count at a skim speed per level, stored in the content |
| C2 word range | 500–700 (overlaps C1) | 550–700 (exam 275–350) |
| Genres | 16 | 21 (`email`, `invitation`, `notice`, `timetable`, `review` added, to cover the outlines) |
| Key-word meaning | `meaning`: one gloss, in the course language or per learner language | `translations` per mother tongue, like vocabulary |
| Support text | One string | en/fr/de, like every kind |
| Question types | `choice`, `true_false`; `answer: boolean` | `reading_choice`, `reading_true_false`; `answer: "true" \| "false"` |
| Skim time and exam limit | In the brief (`skimSeconds`, `timeLimitS`) | In the content, derived from the page rules |
| Steps | Five stages | Six steps: flashcards and matching are two steps, so two navigation points |
| Lessons | 16 French lessons A1–C2 (reference prototype) | 10 fr/A1 test lessons, four of them reusing its texts |

## 9. For ft_transcendence

Components of their own (besides the shared ones of [README.md](README.md#4-components-to-build-once)): the **document view** (title, meta line, paragraphs, highlighted key words) and the **skim phase** (countdown on a practice page, the document put away, the question from memory).

Today `LessonBriefSchema` has nothing for reading: `examples` and `pitfalls` make no sense here, and `vocabulary` needs 6–15 entries where reading has 4–6 key words. It needs the genre, the document plan, the skim focus, the detail questions and the exam types; the content needs a place for the two documents and the questions.

Points to decide for reading:

1. Lesson length: 8 minutes at A1, about 14 at C2. Within ten minutes for every level, or longer for B2–C2?
2. Are the word ranges and skim speeds right as starting values?
3. Evidence marks, short typed answers and *not stated*: bring them back later, for example from B1?
4. Generation: the ten test lessons were written by hand. The generator does not support reading yet: Gemini, Jules or by hand (#83)?
5. Which version is the reference for the team: this one or the #115 text? Section 8 lists every difference.
