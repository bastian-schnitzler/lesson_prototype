# Reading lessons: requirement and prototype spec

For ft_transcendence #115 (design reading lessons) and #117 (lesson prototype and final lesson brief).
Design name: **Hybrid 1, prepare then read**. This file complements [SPEC.md](SPEC.md); the general
rules there (envelope, statuses, session host, scoring by points, Makefile workflow) apply unless a
section below says otherwise.

> **Origin.** Reading was designed and first built in a separate rebuild of the prototype. It was
> ported here on 2026-10-14: the design, the stages, the scoring, the evidence and the validation rules
> are unchanged; the data were adapted to this repository's contracts and every screen now runs on the
> shared session host and controls (section 5).

Playable lessons (route `#/lesson/<id>/play`, details at `#/lesson/<id>`; the outline entries come
from `content/outlines/fr-a1.json` and, for A2–C2, from the fr outlines of ft_transcendence copied
verbatim):

| Id | Level | Genre | Words (main + exam) | Skim focus | Structure task | Exam pages | Not stated | Minutes |
|---|---|---|---|---|---|---|---|---|
| `fr-reading-a-party-invitation` | A1 | other | 64 + 27 | purpose | order_parts | 1 | – | 9 |
| `fr-reading-a-restaurant-menu` | A1 | menu | 58 + 29 | genre | heading_matching | 1 | – | 9 |
| `fr-reading-a-text-message` | A1 | text_message | 55 + 31 | purpose | order_information | 1 | – | 9 |
| `fr-reading-public-signs` | A1 | sign | 46 + 22 | genre | heading_matching | 1 | – | 9 |
| `fr-reading-a-friends-email-with-news` | A2 | letter | 95 + 55 | author | order_information | 1 | – | 10 |
| `fr-reading-a-recipe` | A2 | recipe | 108 + 57 | genre | order_information | 1 | – | 10 |
| `fr-reading-a-company-memo` | B1 | letter | 161 + 77 | purpose | order_information | 2 | yes | 12 |
| `fr-reading-a-parenting-forum` | B1 | forum_post | 198 + 80 | genre | heading_matching | 2 | yes | 12 |
| `fr-reading-an-article-on-la-bise` | B1 | article | 206 + 85 | purpose | heading_matching | 2 | yes | 12 |
| `fr-reading-a-fable` | B2 | poem | 297 + 140 | genre | heading_matching | 2 | yes | 13 |
| `fr-reading-an-editorial` | B2 | article | 257 + 134 | purpose | order_parts | 2 | yes | 13 |
| `fr-reading-a-press-release` | C1 | article | 423 + 212 | author | order_parts | 2 | yes | 15 |
| `fr-reading-an-employment-contract` | C1 | contract | 452 + 228 | genre | heading_matching | 2 | yes | 15 |
| `fr-reading-dictionary-entries` | C1 | dictionary_entry | 407 + 208 | genre | heading_matching | 2 | yes | 15 |
| `fr-reading-a-comic-monologue` | C2 | speech | 500 + 261 | genre | order_parts | 2 | yes | 17 |
| `fr-reading-a-courtroom-plea` | C2 | speech | 522 + 260 | purpose | heading_matching | 2 | yes | 17 |

Every lesson uses all three question types (multiple choice, true/false, short answer). The text
message, menu, la bise and contract lessons were ported with their texts and questions unchanged.
All texts are original except the two fables of `fr-reading-a-fable` (Jean de La Fontaine, 1668,
public domain, quoted verbatim). The comic monologues are original texts *in the manner of* Raymond
Devos; no text by Devos is reproduced.

---

## 1. What the learner sees

Every reading lesson has the same five stages, from A1 to C2. The document is always shown in its
**genre skin** (section 4.4).

| # | Stage | ≈ Time (A1) | What the learner does | Assessment |
|---|---|---|---|---|
| 1 | Key words | 1 min 30 | 4–6 key words from the text as cards: the word (course language, with audio), its meaning in the mother tongue and a short explanation. Then the shared word ↔ meaning matching board | practice |
| 2 | Skim | 1 min | The document appears with the key words highlighted and a countdown (45 s at A1). It blurs when time is up, or earlier when the learner presses *I’ve finished reading*. Only then does the global question open: what kind of document, who writes it, or why | practice |
| 3 | Detail | 2 min 30 | 3–4 questions next to the open document (side by side on wide screens, the document stays in view; stacked on phones). After *Check*, the segments that prove each answer are marked in the document | practice |
| 4 | Structure | 1 min | Match a heading to each part, **or** put the parts back in order (document hidden), **or**, for texts without paragraphs, put pieces of information in the order the text sets | practice |
| 5 | Exam | 3 min 30 | The shared exam information page, then a **second, shorter document of the same genre** and 5 questions on 1–2 pages, each with its own countdown. No highlighting, no feedback. Results only after the last page | exam |

Then the shared result screen: the selected part and its score, the lesson total out of 100, and the
results sidebar (Final exam, Key words, Skim, Detail, Structure). A wrong answer shows the right
one, the explanation and **the sentence of the text that proves it** (“In the text: …”).

Progress is saved after every action; a reload offers *Resume lesson* at the same page. A skim
countdown that had not finished restarts; a blurred document stays blurred until the question is
checked, then it is readable again in the correction.

### Fixed and varying parts

| Fixed in every lesson | Varies from lesson to lesson |
|---|---|
| The five stages, their order and roles | The genre and its skin |
| 4–6 key words, one list and one matching | The key words |
| One skim question about the whole document | Its focus: `genre`, `author` or `purpose` |
| 3–4 detail questions | Their types: multiple choice; true/false (A1–A2); true/false/**not stated** (B1+); short typed answer |
| One structure task | `heading_matching`, `order_parts` or `order_information` |
| 5 exam questions on a second document of the same genre | Their types and the split over 1 or 2 pages |
| Score: practice 30 %, exam 70 % | Text lengths and skim time follow the level |

### The exam

- A new document, same genre, about half as long as the main one, on facts the main one does not give.
- 5 questions (any mix of multiple choice, true/false(/not stated), short answer) on 1–2 pages.
- Each page has its own countdown (about 1.5 × the estimated time); when it runs out the page is
  locked as it stands and the next one opens.
- No key word highlighting, no feedback, no evidence until the result screen.

### Scoring

One score from 0 to 100, as for every kind, with the weights of the brief:
`30 × practice % + 70 × exam %` from `scoring: { practiceWeight: 30, examWeight: 70, orthographyCredit: 0.5 }`.
Vocabulary and grammar keep their fixed 35 / 65 (`ScoringPolicySchema`); the session reads the
weights from `plan.scoring`, so both totals are unchanged (`tests/unit/scoring-weights.test.ts`).
A typed answer that differs only in accents or capitals earns half a point, unless the accent changes
the meaning (`accentSensitive`).

---

## 2. Language rules

| Text | Language |
|---|---|
| The documents, questions, statements, options, accepted answers, headings to match, pieces to order, key words | **Course language only.** Translating them would give the answers away |
| True / false / not stated labels | Course language (`Vrai`, `Faux`, `Pas dans le texte` for French) |
| Instructions, stage labels, answer explanations, key word explanations, objective, situation… | Localized `{ en, fr, de }`, shown in the interface language |
| Key word meanings | Translations by mother tongue (every locale except the course language) |

This mirrors the other kinds and deviates from #115 (“the whole lesson is in the course language”):
see open questions.

---

## 3. Text length and skim time

Words of a document = whitespace-separated tokens with at least one letter or digit, over everything
it shows (title, meta lines, headings, texts, values). `l'heure` is one word, `15` is one, `€`, `–`
and `?` are none. `documentWords` in `src/schemas/reading.ts`, the authoring tool and both prompts
count the same way.

| Level | Main document | Exam document (≈ ½) | Skim time |
|---|---|---|---|
| A1 | 40–80 | 20–40 | 45 s |
| A2 | 80–150 | 40–75 | 60 s |
| B1 | 150–250 | 75–125 | 75 s |
| B2 | 250–400 | 125–200 | 90 s |
| C1 | 400–550 | 200–275 | 120 s |
| C2 | 500–700 | 250–350 | 150 s |

These are **starting values, open to tuning** (`READING_WORDS`, `examWordRange`,
`READING_SKIM_SECONDS`). A document outside its range makes the file `invalid`.

---

## 4. Data model

Same envelope as every artifact (`envelopeShape`: `schemaVersion: 2`, `id`, `lang`, `level`,
`locales`, `title`, `objective`, `estimatedMinutes`, `provenance`). Nested IDs follow
`NestedIdSchema`; localized text, learning text, accepted answers, durations and limits reuse the
shared schemas of `src/schemas/artifactCommon.ts`. Contract: `src/schemas/reading.ts`; cross-checks:
`src/validation/reading.ts` (called from `src/validation/artifacts.ts`).

### 4.1 Brief: `content/briefs/<id>.json`

| Field | Type | Rule |
|---|---|---|
| `kind` | `"reading"` | |
| `theme` | theme | equals the outline; never a `topic` |
| `genre` | one of the genres below | |
| `situation`, `readerTask` | localized | who writes to whom, why; what the learner must find |
| `coverageNotes` | localized long | |
| `prerequisites[]` | localized | 0–4 |
| `keywords[]` | `{ id, term, translations, explanation }` | 4–6; `term` in the course language; `translations` by mother tongue (1–6 each, the first is the matching label and must be unique per locale); `explanation` localized |
| `documents.main`, `documents.exam` | `{ targetWords, partCount, contents }` | `targetWords` within the level range; `contents` (localized long) says what the text contains |
| `stages.keywords` | `{ estimatedDurationS }` | |
| `stages.skim` | `{ focus, skimSeconds, estimatedDurationS }` | `focus`: `genre` / `author` / `purpose`; `skimSeconds` from the table |
| `stages.detail` | `{ questions[{ id, type, focus }], estimatedDurationS }` | 3–4 questions; `type`: `reading_choice` / `reading_true_false` / `reading_short_answer` |
| `stages.structure` | `{ task, estimatedDurationS }` | `heading_matching` / `order_parts` / `order_information`; the first two need ≥ 3 parts |
| `exam.pages[]` | `{ pageId, types[], itemCount, estimatedDurationS, timeLimitS }` | 1–2 pages, 5 questions in total, `timeLimitS ≥ estimatedDurationS` |
| `scoring` | `{ 30, 70, 0.5 }` | `ReadingScoringSchema` |
| `estimatedMinutes` | int | rounded sum of every stage and exam page |

Genres: `text_message`, `sign`, `menu`, `classified_ad`, `postcard`, `profile`, `programme`,
`article`, `letter`, `forum_post`, `dictionary_entry`, `contract`, `recipe`, `speech`, `poem`,
`other`. `recipe`, `speech` and `poem` were added for the A2–C2 lessons (a press release or an
editorial stays an `article`, a memo or an email a `letter`).

### 4.2 Content: `content/lessons/<id>.json`

```
kind: "reading", theme, genre
documents[2]: { documentId: "main" | "exam", genre, title | null, meta[0–4],
                parts[1–12]: { partId, heading | null,
                               segments[1–20]: { segmentId, text, value | null } },
                highlights[]: { keywordId, segmentId, text } }
steps[5]: { id, stage, role: "exercise" | "exam", label (localized),
            pages[1–4]: { pageId, estimatedDurationS, timeLimitS | null,
                          instructions (localized), items[1–8] } }
```

A **segment** is a sentence, a line, a verse or a menu line; questions point at segments. `value` is
a right-aligned value (a price, a quantity). `highlights` mark the key words in the main document;
`text` is copied verbatim from the segment (it may be an inflected form). Documents live once at
lesson level; a `reading_document` item only places one on a page.

Item types (prefix `reading_`):

| Type | Fields | Units scored | Renderer |
|---|---|---|---|
| `reading_keywords` | `keywordIds` | 0 (presentation) | `KeywordsRenderer` (example-card style) |
| `reading_keyword_matching` | `pairs[{ keywordId, answerExplanation }]` | one per pair | shared `MatchingRenderer` |
| `reading_document` | `documentId`, `view: skim / open / exam`, `skimSeconds` (skim only) | 0 | `DocumentRenderer` + `ReadingDocument` |
| `reading_skim_choice` | `focus`, `question`, `options[3–4]`, `answerOptionId`, `answerExplanation` | 1 | `QuestionRenderer` (shared `ChoiceControl`) |
| `reading_choice` | `question`, `options[3–4]`, `answerOptionId`, `evidenceSegmentIds`, `answerExplanation` | 1 | `QuestionRenderer` |
| `reading_true_false` | `statement`, `allowNotStated`, `answer: true / false / not_stated`, `evidenceSegmentIds`, `answerExplanation` | 1 | `QuestionRenderer` (options in order) |
| `reading_short_answer` | `question`, `accepted { answers, accentSensitive }`, `evidenceSegmentIds`, `answerExplanation` | 1 | `QuestionRenderer` (shared `TextControl`) |
| `reading_part_heading_matching` | `headings[{ headingId, text }]`, `pairs[{ partId, headingId, answerExplanation }]` | one per part | shared `MatchingRenderer` |
| `reading_order` | `mode: parts / information`, `pieces[3–6]{ pieceId, text, partId }`, `acceptedOrders[1–2]`, `answerExplanation` | 1 | `OrderRenderer` (shared `OrderControl`) |

The plan (`src/domain/session/readingPlan.ts`) turns these into the shared `PlanUnit`s; a unit with
evidence carries `evidence: { segmentIds, quotes }`, used for the marks after Check and the quotes in
the results.

### 4.3 Checks (a failure makes the file `invalid`)

- Brief: 4–6 key words with unique ids, terms and first meanings; planned lengths in range; skim
  time from the table; 3–4 detail questions; exactly 5 exam questions; minutes = rounded sum.
- Content: two documents (`main`, `exam`) of the brief’s genre with the planned number of parts and
  word counts in range; ids unique across the lesson; every highlight found in its segment, every
  key word highlighted in the main document, none in the exam document.
- Steps: `keywords`, `skim`, `detail`, `structure`, `exam` in this order; the document first on its
  page, in the view of its stage; `skimSeconds` only in the skim view and equal to the brief.
- Keywords: one list and one matching, both covering every key word. Skim: one page, the document then
  one question with the brief’s focus. Detail: the brief’s questions, in order, with their ids and
  types. Structure: the brief’s task; heading matching pairs every part once and the main document
  shows no part headings; ordering parts hides the document.
- Questions: 3–4 unique options with one right; evidence segments exist in the document of the
  stage; evidence is required, except for a “not stated” answer, which has none; `allowNotStated`
  is false at A1–A2 and true from B1.
- Exam pages match the brief (ids, durations, limits, counts, types); only exam pages have a
  countdown; stage durations equal the brief’s.
- Stale detection, hashes and statuses as for every kind (`outlineHash`, `inputHashes.brief`).

### 4.4 Genre skins

`src/components/ReadingDocument.tsx`. A skin is added only where the generic page renders the genre
badly.

| Skin | Genres | Look |
|---|---|---|
| `skin-message` | text_message | phone thread: sender and time centred, bubbles |
| `skin-menu` | menu | centred uppercase title, sections, prices aligned with dotted leaders |
| `skin-article` | article | headline, byline, paragraphs |
| `skin-contract` | contract | centred title, parties, clauses |
| `skin-sign` | sign | each part a plate; the first line in capitals |
| `skin-dictionary` | dictionary_entry | bold headword line, one line per sense, label or example |
| `skin-poem` | poem | one verse per line, stanzas apart |
| `skin-recipe` | recipe | quantities aligned on the right, numbered steps |
| `skin-generic` | all others | title, meta line, numbered paragraphs |

Parts without headings are numbered (circled numbers) so structure tasks can name them; key words
are underlined in indigo, evidence segments get a green dashed frame after Check.

---

## 5. Frontend in this prototype

Reading uses the shared session host (`src/session/views.tsx`), sidebar, progress bar, start page,
exam information page, countdown, results and answer controls; the CSS uses the tokens of
`src/styles.css` (section “reading”).

| Screen | Built on |
|---|---|
| Start page | `StartView`: category badge, objective, minutes and the colour-coded **lesson outline** (one row per stage, its exercise types and minutes), like grammar |
| Key words | Theory point in the sidebar (“Theory · point 1 of 1”); cards in the `example-cards` style with the shared `ListenButton` |
| Key word matching | The vocabulary `MatchingRenderer` (curves, badges, slide after Check); a fully correct board goes straight on |
| Skim | The document with the shared `Countdown` box (“Text blurs in”) and an outlined *I’ve finished reading* button; then `QuestionRenderer` with radio choices |
| Detail | Document and questions in two columns from 1100 px, the document sticky; stacked below. Questions use `ChoiceControl` (true/false not shuffled) and `TextControl`; corrections are the shared `UnitFeedback` cards |
| Structure | `MatchingRenderer` for headings (below the document), `OrderRenderer` with the token bank for ordering |
| Exam | The shared exam info page (“Questions on the document”, “A new document of the same kind, 5 questions.”), countdown box, numbered questions, “n of 5 answered” |
| Results | Shared `ResultsView`; a wrong answer adds “In the text: “…”” |
| Draft view | `ReadingBriefView` with the shared brief parts: summary line, key word table, documents, stage plan, detail questions, exam pages, scoring note |
| Content view | Both documents in their skins, then the shared `ContentReview` with reading lines (document placement, key words, evidence) |

Behaviour that differs from the other kinds, on purpose:

- A page that shows a document always keeps its correction view after Check, even when every answer
  is right, so the evidence can be read (the shared rule skips it only for pages whose items each
  hold one answer; a document holds none). This was already the case in the reading prototype.
- On a page with a document the cursor is not put into the first answer field, so the document is
  not scrolled away.

---

## 6. Mockups

Nine PlantUML Salt screens, drawn from the running prototype, live in `docs/mockups/07-reading-lesson/`
and `docs/mockups/02-artifact-view/reading/`; they are embedded in [SPEC.md](SPEC.md#reading-lesson)
and listed in the [mockup README](mockups/README.md#reading-lesson): lesson start, key words, skim,
skim question after the blur, detail with evidence, structure (heading matching), exam page, exam
results and the combined artifact view.

---

## 7. Mapping onto the main app’s `LessonBriefSchema`

Today (`packages/shared/src/schemas/lesson.ts` at f03431e) a draft is
`{ title, summary, brief: { objective, points[2–6], examples[3–8], pitfalls[1–4], vocabulary?[6–15] } }`,
all one-line text in the course language, plus the outline’s `kind` and `theme`.

| Prototype reading brief | Fits today? | Note |
|---|---|---|
| `title`, `objective` | yes | `objective` is localized in the prototype, one course-language line in the app |
| `keywords[]` | partly | `vocabulary[] { term, gloss }` fits a key word, but needs 6–15 entries (reading has 4–6) and has no mother-tongue translations |
| `situation`, `readerTask` | partly | could be squeezed into `points[]`, losing their meaning |
| `genre` | **no** | new enum |
| `documents.main/exam` (`targetWords`, `partCount`, `contents`) | **no** | |
| `stages.*` (skim focus and time, detail question types, structure task, durations) | **no** | |
| `exam.pages[]` | **no** | |
| `scoring` 30 / 70 | **no** | the app stores one score; the weights are not in the schema |
| `examples`, `pitfalls` | — | no reading equivalent; required by the app (`min 3`, `min 1`) |

The main schema must gain, for reading: a discriminated brief per kind; `genre` and a document plan;
`keywords[4–6]`; the stage plan; the constants (`READING_WORDS`, `READING_SKIM_SECONDS`, count limits,
per-kind score weights); and a place for the content (documents with segments, items, evidence),
which the app does not store yet (#83: generated once and stored, or per learner?).

---

## 8. Authoring and generation

**Hand authoring** (how the sixteen lessons were written; no model calls), like
`scripts/author-grammar.ts`:

1. A definition in `authoring/reading/<id>.ts` (helpers and format in
   `scripts/author-reading-items.ts`): key words, both documents as parts and segments, the skim
   question, detail questions with their focus, the structure task and the exam pages.
2. `make author-reading ID=<id>` (or `ALL=1`) runs `scripts/author-reading.ts`: it numbers the
   segments (`m-s1…`, `x-s1…`), counts words, derives the stage plan, page estimates from a per-level
   table (or the definition’s `durations`), exam limits (1.5 ×), minutes, labels and shared
   instructions (`READING_COPY` in `src/domain/lessonCopy.ts`), provenance and input hashes, validates
   both files and writes them when they changed. `--dry-run` only validates.
3. `make catalog` / `make build` derive the manifest with the statuses.

**Generation** (`make brief` / `make generate ID=<id>`): the brief call adds the reading category text
of `generator/readingPrompts.ts` to the shared brief prompt (`reading-brief-v2`, scoring 30/70); the
content call writes both documents and every question in one section (`reading-content-v2`), and
`generator/content.ts` assembles the five stages with the brief’s durations and limits. v1 were the
stand-alone Markdown prompts of the reading prototype; v2 follow the structure of `brief-v8` and
`content-v5`. Tests replay authored lessons through a fake model (`tests/unit/reading-generator.test.ts`).

---

## 9. Integration points (shared code changed)

| File | Change |
|---|---|
| `src/schemas/artifacts.ts` | `reading` is a supported kind; brief/content unions and schema switches |
| `src/validation/artifacts.ts` | `Issues` exported; reading brief/content checks called |
| `src/domain/session/plan.ts` | `ReadingItem` in the item union, reading units, `evidence` on units, `plan.scoring`, `plan.reading` |
| `src/domain/session/session.ts` | weights from `plan.scoring` (vocabulary/grammar briefs still carry 35/65); `MATCHING_TYPES` shared by the feedback skip and the success pause |
| `src/domain/session/outline.ts` | exam pages with a document are “Questions on the document” |
| `src/domain/courses.ts`, `src/pages/LessonPage.tsx` | reading playable; only functions stays pending |
| `src/session/controls.tsx` | `Countdown` moved here (shared with the skim); `ChoiceControl` `ordered`; order answers of reading read first → last |
| `src/session/vocabularyRenderers.tsx` | `MatchingRenderer` also draws the two reading matchings |
| `src/session/views.tsx` | start-page flow for every non-vocabulary kind, focus rule, exam info lead, evidence quote in results |
| `src/session/renderers.tsx`, `src/artifacts/registry.ts`, `src/artifacts/ContentReview.tsx` | reading renderers and views registered |
| `src/i18n/messages.ts`, `src/styles.css`, `src/domain/lessonCopy.ts` | reading strings (en/fr/de), styles, shared labels and instructions |
| `generator/prompts.ts`, `generator/briefs.ts`, `generator/content.ts` | reading payload, prompt text, prompt versions, assembly |

---

## 10. Open questions for the team

1. **10 minutes vs `estimatedMinutes`.** #115 sets a lesson at 10 minutes. The estimates run from 9
   (A1) to 17 minutes (C2): long C1–C2 texts take longer to read. Cap the length per level, or let
   higher levels run longer?
2. **Course language only vs translations.** #115 says “the whole lesson is in the course language”.
   The prototype localizes instructions and explanations and translates key words, like the other
   kinds. Which rule wins for the final schema?
3. **Length values.** The word ranges and skim times are starting values; C1 dictionary entries
   (407) and the C2 monologue (500) sit near the lower limits. Tune them after play tests (and
   consider basing skim time on the actual word count rather than the level).
4. **Evidence highlighting.** It needs `evidenceSegmentIds` on every question and segment ids in the
   text. Keep it, or drop it to simplify generation?
5. **Tap to answer.** Short answers are typed only. Tapping the answer in the text was left out; add
   it later?
6. **Correction view.** Skim, detail and document-backed structure pages always show their correction
   after *Check*, even when all answers are right (so the evidence can be seen); other kinds skip it
   on all-correct single-answer pages. Keep?
7. **Wide layout with the sidebar.** The lesson sidebar leaves about 720 px for the task: document and
   questions sit side by side only from 1100 px, and heading matching stays below the document. Is
   that the right trade-off, or should the sidebar collapse on reading pages?
8. **Genres.** `recipe`, `speech` and `poem` were added; should the main app’s enum include them?
9. **Generation.** Reading generation runs through the same targets but was only tested with a fake
   model; the first real run should be reviewed like the vocabulary and grammar samples.
