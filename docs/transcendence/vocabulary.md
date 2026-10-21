# Vocabulary lessons

Design: **meet the words, then use them**. A vocabulary lesson teaches 8 words (9 when few are nouns) in two groups. The learner reads a short introduction per group, turns flashcards, matches the words with their meanings, chooses the gender of the nouns, types each word into a sentence and recognises it by ear. The exam asks for every word twice: translated from the mother tongue, then written from dictation.

A vocabulary lesson is **only a brief**. The brief holds the words and every exercise text, and the application builds the pages with the same rules for every lesson. So there is no lesson content file, and the generator writes one artifact.

Shared rules (envelope, languages, Check/Continue, free-text scoring, 35 / 65 weights, exam countdown, results) are in [README.md](README.md). Source: [SPEC.md section 6](../SPEC.md#6-vocabulary-learning-flow), [src/schemas/vocabulary.ts](../../src/schemas/vocabulary.ts), [src/domain/vocabularyLesson.ts](../../src/domain/vocabularyLesson.ts).

---

## 1. What the learner sees

Every vocabulary lesson has the same six stages. Times are for `fr-classroom-objects`: 8 nouns in 2 groups of 4.

| # | Stage | ≈ Time | What the learner does | Counts for |
|---|---|---|---|---|
| 1 | **Introduction** | 1 min | One page per group: a short formatted text (lead sentence, the words as a list, one tip). Each introduction is followed directly by its flashcards. | – |
| 2 | **Flashcards** | 1 min 20 | One page per group with every card. The front shows the meaning in the mother tongue; the flip button turns the card to the French side: the word with its article, a speaker button, the gender, and a context sentence with its own speaker. **Continue** opens once every card was turned. | – |
| 3 | **Matching** | 1 min 20 | Mother-tongue meanings on the left, French words on the right, both shuffled. Click one, then its partner; a curve joins them. After **Check**, every French box slides into the row of its right meaning; all right → green flash and the next page. At most 6 pairs per page. | practice, 1 per word |
| 4 | **Gender** | 1 min | Every noun on one page, **without** its article, with masculine / feminine pills. After Check the same page shows the word with its article, its meaning, and green or red borders. Left out when the lesson has no nouns. | practice, 1 per noun |
| 5a | **Typed gaps** | 2 min 40 | One page per word: four reference cards (the lesson's words, not clickable) above a sentence with a gap. "Choose the right word and type it", **without** the article. | practice, 1 per word |
| 5b | **Listening choice** | 2 min | One page per word: the word is spoken, the learner picks it among four written options (preferably similar-sounding). | practice, 1 per word |
| 6 | **Exam** | 4 min 40 | Exam info page, then translation pages (mother-tongue prompt → French with the indefinite article), then dictation pages (hear the word, write it with its article). | exam, 2 per word |

Total: about 14 minutes for 8 words. Results follow (see [README.md](README.md#results)): the exam has two parts, **Translation** and **Dictation**; the practice entries are Matching, Gender, Typed gaps and Listening.

## 2. Exercises: fixed and varying parts

| Fixed in every lesson | Varies from lesson to lesson |
|---|---|
| The six stages, in this order | The words, their groups and the group introductions |
| Every word takes part in every exercise | Which words are nouns (the gender page exists only with nouns) |
| Two groups of about 4 words (3 groups only when the topic needs them) | The context sentence and the gap sentence of each word |
| Matching pages of at most 6 pairs, balanced (7 → 4 + 3) | The three other reference words of each gap and the three other listening options |
| Exam: translation, then dictation, at most 6 words per page | The exam prompt when the first translation is ambiguous |
| Page estimates and countdowns from fixed rules (section 4) | – |

The standard is **8 words per lesson, 9 when few are nouns**, so every lesson stays under 15 minutes. A large inventory (numbers, the alphabet) is taught through its most useful words. One word or one fixed phrase is one target (`un livre`, `s'il vous plaît`).

## 3. The exam

- Translation pages first, then dictation pages with the same words. Each page holds the words of one group (at most 6).
- **Translation**: the mother-tongue prompt; the learner writes the French word **with its indefinite article** (`un livre`, `une table`, `des ciseaux`). Each prompt carries a small *with article* / *without article* badge. The badge turns red while the answer has one word less than an article-bearing answer and does not start with an article. Pressing Continue in that state shows, once, a red box "Type the indefinite article (un, une or des) before the word"; pressing Continue again submits the page as it is.
- **Plurals**: a noun must be answered in the singular, a plural is wrong; a noun taught with `des` (a plurale tantum) must be answered in the plural. As soon as a field holds `des` + a word, a masculine / feminine choice appears after it, because `des` hides the gender.
- **Dictation**: the words in a random order fixed by the session, so the lesson order does not give the answer away. Each field plays its word (replayable until the page locks). The learner writes it with its article.
- Accepted answers in both: the word's `examForms`, plus its gender variants when the prompt does not say which gender is meant. A definite article (`le livre`) or a bare noun (`livre`) is wrong.

## 4. Page rules (how the lesson is built from the brief)

| Stage | Pages | Estimate | Exam countdown |
|---|---|---|---|
| 1 Introduction | one per group | 20 s + 3 s per word | – |
| 2 Flashcards | one per group | 10 s per word | – |
| 3 Matching | the words in group order, cut into balanced pages of at most 6 | 10 s per word | – |
| 4 Gender | one page with every noun (none without nouns) | 20 s + 5 s per noun | – |
| 5a Typed gaps | one per word | 20 s per page | – |
| 5b Listening choice | one per word | 15 s per page | – |
| 6 Translation | one page per group (at most 6 words) | 15 s per word | 20 s per word |
| 6 Dictation | one page per group (at most 6 words) | 20 s per word | 30 s per word |

`estimatedMinutes` must equal the sum of these estimates, rounded to minutes. The exam info page is an application page and is not counted.

```typescript
export const VOCABULARY_TIMING = {
  introductionBase: 20, introductionPerWord: 3,
  flashcardsPerWord: 10,
  matchingPerWord: 10, matchingGroupSize: 6,
  genderBase: 20, genderPerWord: 5,
  gapPage: 20, listeningPage: 15,
  examPageSize: 6,
  translationPerWord: 15, translationLimitPerWord: 20,
  dictationPerWord: 20, dictationLimitPerWord: 30,
} as const;
```

Which text is shown where:

| Text of the brief | Shown in |
|---|---|
| `groups[].introduction` | Introduction page |
| `translations` (first variant) or `matchingLabel` | Flashcard front, matching label |
| `teachingForm`, `pronunciation`, `context` | Flashcard back (audio speaks `teachingForm`) |
| `explanation` | Correction of matching, listening choice, translation and dictation |
| `genderExplanation` | Correction of the gender row (results) |
| `gap` | Typed-gap page and its correction |
| `examPrompt` (or the first translation) | Translation prompt |

## 5. Data a vocabulary lesson needs

### 5.1 Brief

| Field | Type | Rule |
|---|---|---|
| envelope | see [README.md](README.md#2-the-shared-envelope) | `kind: "vocabulary"`, `theme` from the outline |
| `coverageNotes` | support (long) | How the words cover the outline intent. |
| `targetCount` | int 1–60 | Equals the number of targets (standard 8–9). |
| `countRationale`, `difficultyBalance` | support | Why this many words, and the mix of easy and harder ones. |
| `prerequisites` | support[0–4] | |
| `groups[1–6]` | `{ id, label, targetIds, introduction }` | Every target in exactly one group. `introduction` is restricted Markdown in en/fr/de. |
| `targets[1–60]` | see below | |
| `scoring` | `{ 35, 65, 0.5 }` | Fixed. |

Each **target**:

| Field | Type | Rule |
|---|---|---|
| `id` | id | |
| `term` | course | The base term **without** article (`livre`): the gender page shows it. |
| `translations` | native, 1–6 variants per mother tongue | The first variant is the display form. |
| `wordClass` | enum | `noun`, `verb`, `adjective`, `adverb`, `pronoun`, `numeral`, `letter`, `preposition`, `conjunction`, `interjection`, `phrase`, `other` |
| `genders` | `masculine` / `feminine` / `neuter`[] | Nouns: at least one. Other classes: empty. |
| `number` | `singular` / `plural` / null | Nouns only. |
| `teachingForm` | course | The displayed form, with the indefinite article for nouns (`un livre`). Must be one of the `examForms`. |
| `examForms[1–4]` | course | Full accepted exam answers, article included (`un livre`). |
| `articleException` | support / null | Why a noun has no indefinite form (countries, proper names, set phrases). Then `examForms` use no `un`/`une`/`des`. |
| `genderVariants[0–4]` | course | The other gender or number (`espagnole`), accepted when the prompt does not disambiguate. |
| `pronunciation` | course | IPA, shown to learners and reviewers. Audio speaks `teachingForm`, not the IPA. |
| `difficulty` | `core` / `demanding` | |
| `context` | `{ sentence (course), translation (native) }` | The flashcard example. |
| `ambiguityNote` | support / null | When a translation has several valid answers. |
| `explanation` | support | Why the French form means this word. |
| `genderExplanation` | support / null | Nouns only: the gender and its article. |
| `matchingLabel` | native / null | A disambiguated label when two words of one matching page share a translation. |
| `examPrompt` | native / null | A prompt that says which gender or number is meant (`student (female)`). |
| `gap` | `{ before, after, accepted, referenceTargetIds[4], explanation }` | The typed-gap sentence; answers without article. |
| `listeningOptionTargetIds[4]` | id | Four distinct words of the lesson, including this one. |

### 5.2 Content (built by the application, never stored)

```
steps[6–7]: { id, stage, role, label (support), pages[] }
  stage: introduction | flashcards | matching | overview (gender) | practice | exam
  // stage "practice" has two steps: typed gaps, then listening
page: { pageId, estimatedDurationS, timeLimitS | null, instructions (support), items[1–12] }

item types:
  vocabulary_introduction      { targetIds, text (support, long) }
  vocabulary_flashcards        { targetIds }
  vocabulary_matching          { pairs[2–12]: { targetId, nativeLabel | null, answerExplanation } }
  vocabulary_gender_select     { targetIds, rows: { targetId, answerExplanation } }
  vocabulary_typed_gap         { targetId, before, after, referenceTargetIds[4], accepted, answerExplanation }
  vocabulary_listening_choice  { targetId, optionTargetIds[4], answerExplanation }
  vocabulary_translation_exam  { targetId, prompt (native), accepted, answerExplanation }
  vocabulary_listening_dictation { targetId, accepted, answerExplanation }
```

### 5.3 Validation rules (a failure makes the brief invalid)

**Words and groups**
- Target IDs are unique; `targetCount` equals the number of targets; every target is in exactly one group.
- A noun has at least one gender and a number; any other word has none, and no `articleException`.
- A noun's `term` has no article (`le`, `la`, `les`, `un`, `une`, `des`, `l'`).

**Article policy (French)**
- Without `articleException`, the teaching form, every exam form and every gender variant of a noun start with the indefinite article that agrees: `un` / `une` for the noun's genders in the singular, `des` in the plural. `le père` is taught and examined as `un père`.
- With `articleException`, no exam form uses an indefinite article.
- The teaching form is one of the exam forms (or an adjective's pair `espagnol, espagnole`).

**Exercises**
- Gap: four distinct reference words including the word; answers without article; no other reference word fits the gap.
- Listening: four distinct options including the word.
- `genderExplanation` is set for nouns and only for nouns.
- On each derived matching page, the labels are unique in every mother tongue (set `matchingLabel` otherwise).
- When a word has gender variants and an `examPrompt`, the prompt differs from the first translation in every mother tongue.
- Explanations about accents name the mark ("accent aigu"), not just the character.
- Every introduction passes the restricted-Markdown check, with the same blocks and forms in en/fr/de.

**Timing**
- `estimatedMinutes` equals the derived page estimates, rounded to minutes.

### 5.4 Zod schema

From [src/schemas/vocabulary.ts](../../src/schemas/vocabulary.ts). The building blocks are in [README.md](README.md#shared-zod-building-blocks).

```typescript
export const WORD_CLASSES = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral', 'letter',
  'preposition', 'conjunction', 'interjection', 'phrase', 'other',
] as const;
export const GENDERS = ['masculine', 'feminine', 'neuter'] as const;
export const GenderSchema = z.enum(GENDERS);

/* =================================================================== brief */

export const vocabularyTargetSchema = (lang: string) =>
  z.strictObject({
    id: NestedIdSchema,
    term: LearningTextSchema,                         // without article: livre
    translations: nativeTranslationsSchema(lang),
    wordClass: z.enum(WORD_CLASSES),
    genders: z.array(GenderSchema).max(3),            // nouns only
    number: z.enum(['singular', 'plural']).nullable(),
    teachingForm: LearningTextSchema,                 // un livre
    examForms: z.array(LearningTextSchema).min(1).max(4),
    articleException: LocalizedTextSchema.nullable(),
    genderVariants: z.array(LearningTextSchema).max(4),
    pronunciation: LearningTextSchema,                // IPA
    difficulty: z.enum(['core', 'demanding']),
    context: z.strictObject({ sentence: LearningTextSchema, translation: nativeTextSchema(lang) }),
    ambiguityNote: LocalizedTextSchema.nullable(),
    explanation: LocalizedTextSchema,
    genderExplanation: LocalizedTextSchema.nullable(),
    matchingLabel: nativeTextSchema(lang).nullable(),
    examPrompt: nativeTextSchema(lang).nullable(),
    gap: z.strictObject({
      before: z.string().max(200),
      after: z.string().max(200),
      accepted: AcceptedAnswersSchema,                // article-free
      referenceTargetIds: z.array(NestedIdSchema).length(4),
      explanation: LocalizedTextSchema,
    }),
    listeningOptionTargetIds: z.array(NestedIdSchema).length(4),
  });

export const vocabularyGroupSchema = z.strictObject({
  id: NestedIdSchema,
  label: LocalizedLabelSchema,
  targetIds: z.array(NestedIdSchema).min(1).max(16),
  introduction: LocalizedLongTextSchema,              // restricted Markdown
});

export const vocabularyBriefSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('vocabulary'),
    theme: ThemeSchema,
    coverageNotes: LocalizedLongTextSchema,
    targetCount: z.number().int().min(1).max(60),
    countRationale: LocalizedTextSchema,
    difficultyBalance: LocalizedTextSchema,
    prerequisites: z.array(LocalizedTextSchema).max(4),
    groups: z.array(vocabularyGroupSchema).min(1).max(6),
    targets: z.array(vocabularyTargetSchema(lang)).min(1).max(60),
    scoring: ScoringPolicySchema,
  });

/* ================================================================= content */
/* Never stored: built from the brief by vocabularyLesson(brief).             */

const unit = { answerExplanation: LocalizedTextSchema };

const vocabularyItemSchema = (lang: string) =>
  z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('vocabulary_introduction'), itemId: NestedIdSchema, targetIds: z.array(NestedIdSchema).min(1), text: LocalizedLongTextSchema }),
    z.strictObject({ type: z.literal('vocabulary_flashcards'), itemId: NestedIdSchema, targetIds: z.array(NestedIdSchema).min(1) }),
    z.strictObject({
      type: z.literal('vocabulary_matching'),
      itemId: NestedIdSchema,
      pairs: z.array(z.strictObject({ targetId: NestedIdSchema, nativeLabel: nativeTextSchema(lang).nullable(), ...unit })).min(2).max(12),
    }),
    z.strictObject({
      type: z.literal('vocabulary_gender_select'),
      itemId: NestedIdSchema,
      targetIds: z.array(NestedIdSchema).min(1),
      rows: z.array(z.strictObject({ targetId: NestedIdSchema, ...unit })).min(1),
    }),
    z.strictObject({
      type: z.literal('vocabulary_typed_gap'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      before: z.string().max(200),
      after: z.string().max(200),
      referenceTargetIds: z.array(NestedIdSchema).length(4),
      accepted: AcceptedAnswersSchema,
      ...unit,
    }),
    z.strictObject({
      type: z.literal('vocabulary_listening_choice'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      optionTargetIds: z.array(NestedIdSchema).length(4),
      ...unit,
    }),
    z.strictObject({
      type: z.literal('vocabulary_translation_exam'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      prompt: nativeTextSchema(lang),
      accepted: AcceptedAnswersSchema,
      ...unit,
    }),
    z.strictObject({
      type: z.literal('vocabulary_listening_dictation'),
      itemId: NestedIdSchema,
      targetId: NestedIdSchema,
      accepted: AcceptedAnswersSchema,
      ...unit,
    }),
  ]);

export const VOCABULARY_STAGES = ['introduction', 'flashcards', 'matching', 'overview', 'practice', 'exam'] as const;

const pageSchema = (lang: string) =>
  z.strictObject({
    pageId: NestedIdSchema,
    estimatedDurationS: DurationSecondsSchema,
    timeLimitS: TimeLimitSecondsSchema.nullable(),
    instructions: LocalizedTextSchema,
    items: z.array(vocabularyItemSchema(lang)).min(1).max(12),
  });

export const vocabularyContentSchema = (lang: string) =>
  z.strictObject({
    ...envelopeShape,
    kind: z.literal('vocabulary'),
    theme: ThemeSchema,
    steps: z.array(z.strictObject({
      id: NestedIdSchema,
      stage: z.enum(VOCABULARY_STAGES),
      role: z.enum(['introduction', 'exercise', 'overview', 'exam']),
      label: LocalizedLabelSchema,
      pages: z.array(pageSchema(lang)).min(1).max(60),
    })).min(6).max(7),
  });
```

## 6. Example (`fr-classroom-objects`, excerpt)

The full brief is [content/briefs/fr-classroom-objects.json](../../content/briefs/fr-classroom-objects.json): 8 nouns (`un livre`, `un cahier`, `un stylo`, `un crayon`, `une table`, `une chaise`, `une règle`, `une gomme`) in two groups. Below: the first group and its first word. `objective`, `coverageNotes`, `difficultyBalance`, `prerequisites`, `provenance` and the other words are left out.

```json
{
  "schemaVersion": 2,
  "id": "fr-classroom-objects",
  "kind": "vocabulary",
  "lang": "fr",
  "level": "A1",
  "locales": ["en", "fr", "de"],
  "theme": "education",
  "title": "Les objets de la classe",
  "estimatedMinutes": 14,
  "targetCount": 8,
  "countRationale": {
    "en": "8 items, four masculine and four feminine, keep the lesson within 15 minutes.",
    "fr": "8 objets, quatre masculins et quatre féminins, gardent la leçon sous 15 minutes.",
    "de": "8 Gegenstände, vier maskuline und vier feminine, halten die Lektion unter 15 Minuten."
  },
  "groups": [
    {
      "id": "group-masculine",
      "label": { "en": "Masculine objects", "fr": "Objets masculins", "de": "Männliche Gegenstände" },
      "targetIds": ["un-livre", "un-cahier", "un-stylo", "un-crayon"],
      "introduction": {
        "en": "These four classroom objects are **masculine**: they take the indefinite article `un`.\n\n- `un livre`\n- `un cahier`\n- `un stylo`\n- `un crayon`\n\nLearn each word together with its article – the article tells you the gender.",
        "fr": "Ces quatre objets de la classe sont **masculins** : ils prennent l'article indéfini `un`.\n\n- `un livre`\n- `un cahier`\n- `un stylo`\n- `un crayon`\n\nApprenez chaque mot avec son article – l'article indique le genre.",
        "de": "Diese vier Gegenstände aus dem Klassenzimmer sind **maskulin**: Sie haben den unbestimmten Artikel `un`.\n\n- `un livre`\n- `un cahier`\n- `un stylo`\n- `un crayon`\n\nLerne jedes Wort mit seinem Artikel – der Artikel zeigt das Genus."
      }
    }
  ],
  "targets": [
    {
      "id": "un-livre",
      "term": "livre",
      "translations": { "en": ["a book"], "de": ["ein Buch"] },
      "wordClass": "noun",
      "genders": ["masculine"],
      "number": "singular",
      "teachingForm": "un livre",
      "examForms": ["un livre"],
      "articleException": null,
      "genderVariants": [],
      "pronunciation": "/œ̃ livʁ/",
      "difficulty": "core",
      "context": {
        "sentence": "J'ai un livre de français.",
        "translation": { "en": "I have a French book.", "de": "Ich habe ein Französischbuch." }
      },
      "ambiguityNote": null,
      "explanation": {
        "en": "A book is un livre; livre is masculine, so use un.",
        "fr": "« a book » se dit un livre ; livre est masculin, donc un.",
        "de": "Ein Buch heißt un livre; livre ist maskulin, also un."
      },
      "genderExplanation": {
        "en": "Livre is masculine, so its indefinite article is un: un livre.",
        "fr": "Livre est masculin, donc l’article indéfini est un : un livre.",
        "de": "Livre ist maskulin, der unbestimmte Artikel ist un: un livre."
      },
      "matchingLabel": null,
      "examPrompt": null,
      "gap": {
        "before": "J’ouvre un",
        "after": "de français.",
        "accepted": { "answers": ["livre"] },
        "referenceTargetIds": ["un-livre", "un-cahier", "un-stylo", "un-crayon"],
        "explanation": {
          "en": "The sentence describes a book: un livre. Type the word without its article.",
          "fr": "La phrase décrit un livre. Écrivez le mot sans l’article.",
          "de": "Der Satz beschreibt ein Buch: un livre. Schreib das Wort ohne Artikel."
        }
      },
      "listeningOptionTargetIds": ["un-livre", "un-cahier", "un-stylo", "un-crayon"]
    }
  ],
  "scoring": { "practiceWeight": 35, "examWeight": 65, "orthographyCredit": 0.5 }
}
```

## 7. Mockups (PlantUML Salt)

In [docs/mockups/03-vocabulary-lesson/](../mockups/03-vocabulary-lesson/); previews with the [mockup guide](../mockups/README.md).

| Screen | Mockup |
|---|---|
| Lesson start | [lesson-start.puml](../mockups/03-vocabulary-lesson/01-startpage/lesson-start.puml) |
| Introduction | [introduction.puml](../mockups/03-vocabulary-lesson/02-introduction/introduction.puml) |
| Flashcards, front and turned | [front.puml](../mockups/03-vocabulary-lesson/03-flashcards/front.puml), [revealed.puml](../mockups/03-vocabulary-lesson/03-flashcards/revealed.puml) |
| Matching | [matching.puml](../mockups/03-vocabulary-lesson/04-matching/matching.puml) |
| Gender, before and after Check | [gender-select.puml](../mockups/03-vocabulary-lesson/05-gender-overview/gender-select.puml), [reviewed-overview.puml](../mockups/03-vocabulary-lesson/05-gender-overview/reviewed-overview.puml) |
| Typed gap and its correction | [answer.puml](../mockups/03-vocabulary-lesson/06-typed-gaps/answer.puml), [feedback.puml](../mockups/03-vocabulary-lesson/06-typed-gaps/feedback.puml) |
| Listening choice, no-voice help | [listening-choice.puml](../mockups/03-vocabulary-lesson/06-listening/listening-choice.puml), [no-voice-help.puml](../mockups/03-vocabulary-lesson/06-listening/no-voice-help.puml) |
| Exam: translation, dictation | [exam-page.puml](../mockups/03-vocabulary-lesson/07-exam/exam-page.puml), [listening-dictation.puml](../mockups/03-vocabulary-lesson/07-exam/listening-dictation.puml) |
| Results, gender results | [exam-results.puml](../mockups/03-vocabulary-lesson/08-results/exam-results.puml), [gender-results.puml](../mockups/03-vocabulary-lesson/08-results/gender-results.puml) |

## 8. For ft_transcendence

Components of their own (besides the shared ones of [README.md](README.md#4-components-to-build-once)): the introduction page (restricted Markdown), the typed gap with reference cards, the listening choice, the dictation page, the article badge of the translation exam, and the no-voice help page.

Today a vocabulary draft in ft_transcendence is `brief.vocabulary[6–15]: { term, gloss }`, all in the course language, plus `objective`, `points`, `examples` and `pitfalls`. The prototype brief replaces it:

| ft_transcendence today | Prototype |
|---|---|
| `vocabulary[6–15]: { term, gloss }` | `targets[8–9]` with article, gender, number, exam forms, IPA, translations and the exercise texts |
| `gloss` in the course language ("a gloss defines, it never translates") | `translations` in each mother tongue |
| `points`, `examples`, `pitfalls` | `groups[].introduction`, `context`, `explanation` |
| No exercises | Every exercise text in the brief; pages built by fixed rules |

Points to decide for vocabulary:

1. 8–9 words take 14–15 minutes. Ten minutes means about 5–6 words, or dropping one stage (for example listening choice).
2. Glosses in the course language (ft_transcendence) or translations (prototype)? The flashcard front, the matching and the translation exam need a mother-tongue meaning.
3. The indefinite-article policy (D39) is French. German and English courses need their own rule (`ein`/`eine`, `a`/`an`).
