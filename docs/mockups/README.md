# Lesson prototype mockups

One guide for all mockups: 61 screens rendered from the running prototype (index, artifact views and the vocabulary, grammar, function and reading lessons). Each screen is a full-page PNG and a self-contained HTML snapshot (rendered DOM, inlined CSS, no scripts), captured by `make screens` (`scripts/screens.ts`) and shown in [SPEC.md](../SPEC.md) as the PNG linked to the snapshot. This folder holds nothing else besides this README; the PlantUML Salt sources used until P06-00 are retired (their history is in git). See the [issue asset mapping](../ISSUES.md#assets-to-include-when-publishing-applicable-issues).

## Refresh the screens

Run `make screens` (or `make screens ONLY=04-grammar-lesson`) after a change to these pages, then `make mockups-sync`, which writes each SPEC `screen:begin` / `screen:end` block from the screen list in `scripts/screens.ts`. Index and artifact screens open their route; each lesson screen's session state is built with the app's plan and reducer and resumed in headless Chromium with a fixed seed, clock and test French voice, so a run reproduces the same pictures until the app or the content changes. To add or change a screen, edit its entry in `scripts/screens.ts`; never edit a PNG or HTML file by hand. `make mockups-check` fails on a missing PNG or HTML file, a missing or stale SPEC block, a missing README link or any other file in this folder.

All pages follow the [supplied screenshot reference register and visual contract](../SPEC.md#screenshot-reference-register): dark slate surfaces, light primary actions, outlined secondary controls, wide choice cards, indigo progress, and green/red/amber correctness colors. Original screenshot references belong in docs/design-references/, outside this folder. Practice locks/shows feedback and then confirms with Continue; exam pages withhold feedback until the complete exam ends. Accent corrections name the actual mark. Artifact previews are read-only. All headers show independent mother-tongue and interface-language controls; these examples select en/en. Mother tongue is editable only on the index/starting page, where the option equal to the course's learning language (fr for French courses) is disabled; other pages show its option group read-only (muted unselected choices). Interface language remains editable during the whole session. The index displays discovered language/level groups (currently fr/A1 only), followed by multiselect categories. The artifact header toggles Raw JSON / Structured view; the shared tree opens its root, 0–3-child containers and only children, while other larger objects/arrays start collapsed.

Vocabulary folders include the start page, so folders 02–07 represent learning stages 1–6; `06-listening` and `06-typed-gaps` both belong to practice stage 5, and `07-exam` also holds the listening-dictation page. Grammar's 02-00 explanation and 02-01 through 02-06 exercise folders are a component gallery; actual lessons use 2–4 suitable teaching blocks. Function folders `01-startpage` to `07-listening-choice` follow the lesson order; `08-exam` holds both exam parts (P4-01, reordered in the P4-05 review). Reading folders `01-startpage` to `07-results` follow the lesson order; `02-flashcards` holds the flashcards and the matching board, and each document stage has its answering page and its page after Check (P5-01). Keep this root file as the only mockup README.

- [01 — Lesson overview](#lesson-overview)
- [02 — Artifact view](#artifact-view)
- [03 — Vocabulary lesson](#vocabulary-lesson)
- [04 — Grammar lesson](#grammar-lesson)
- [05 — Function lesson](#function-lesson)
- [06 — Reading lesson](#reading-lesson)

<a id="lesson-overview"></a>

## 01 — Lesson overview

Rendered from the prototype with the fr/A1 course (`make screens`).

| Screen folder | Screen | Rendered screen |
| --- | --- | --- |
| `01-lesson-overview/index` | Lesson index | [PNG](01-lesson-overview/index/lesson-index.png) · [HTML snapshot](01-lesson-overview/index/lesson-index.html) · [SPEC preview](../SPEC.md#mockup-01-lesson-overview-index-lesson-index) |

<a id="artifact-view"></a>

## 02 — Artifact view

Rendered from the prototype with the lessons `fr-classroom-objects` (vocabulary and raw JSON), `fr-verb-etre-present` (grammar) and `fr-reading-a-text-message` (reading).

| Screen folder | Screen | Rendered screen |
| --- | --- | --- |
| `02-artifact-view/vocabulary` | Lesson detail | [PNG](02-artifact-view/vocabulary/lesson-detail.png) · [HTML snapshot](02-artifact-view/vocabulary/lesson-detail.html) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-vocabulary-lesson-detail) |
| `02-artifact-view/grammar` | Lesson detail | [PNG](02-artifact-view/grammar/lesson-detail.png) · [HTML snapshot](02-artifact-view/grammar/lesson-detail.html) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-grammar-lesson-detail) |
| `02-artifact-view/reading` | Lesson detail | [PNG](02-artifact-view/reading/lesson-detail.png) · [HTML snapshot](02-artifact-view/reading/lesson-detail.html) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-reading-lesson-detail) |
| `02-artifact-view/raw-json` | Initial JSON tree | [PNG](02-artifact-view/raw-json/json-tree.png) · [HTML snapshot](02-artifact-view/raw-json/json-tree.html) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-raw-json-json-tree) |
| `02-artifact-view/raw-json` | JSON tree with the draft expanded | [PNG](02-artifact-view/raw-json/json-tree-expanded.png) · [HTML snapshot](02-artifact-view/raw-json/json-tree-expanded.html) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-raw-json-json-tree-expanded) |

<a id="phase-1-comparison"></a>

### Phase 1 comparison (P1-12)

Compared on 2026-10-07 against the prototype at `ac00dea` (main after P1-10), with the authored `content/` artifacts, desktop 1280 px and narrow 375 px:

- **Index:** filter bar with toggle chips for learning language, level and categories; the Content column shows the highest available artifact. With the twenty sample lessons, lessons 02–05 show Content and Start lesson, and 01/06 show Outline.
- **Artifact header:** Lesson overview, Raw JSON / Structured view and Start lesson on the left; the Outline, Draft and Content jump buttons on the right.
- **Draft:** target groups (vocabulary) and teaching blocks (grammar) are numbered tabs in the style of the Content outline, with one panel shown at a time. This was changed during this comparison.
- **Content:** a numbered outline of step cards, colour-coded page groups that wrap onto more lines, and one selected page with its prompts, answers, explanations and limits.
- **Raw JSON:** the root is labelled "Combined artifact object"; the outline, draft and content nodes start collapsed and show their key counts.

Differences found:

- **Fixed:** grammar form tables in Content were labelled "Exam answer:"; they are now labelled Subject / Form / Example.
- **Follow-up, P2-01/P3-01:** grammar content repeats the block title as the label of the explanation step and of each exercise step, so the outline, page groups and the results menu show identical labels. SPEC section 5 asks for unique block labels for repeated exercises.
- **Follow-up:** Draft shows rules as "Rule 1", while Content shows rule IDs (`rule-singular-forms`).

<a id="vocabulary-lesson"></a>

## 03 — Vocabulary lesson

Rendered from the prototype with the lesson `fr-classroom-objects` (`make screens`).

| Screen folder | Screen | Rendered screen |
| --- | --- | --- |
| `03-vocabulary-lesson/01-startpage` | Lesson start | [PNG](03-vocabulary-lesson/01-startpage/lesson-start.png) · [HTML snapshot](03-vocabulary-lesson/01-startpage/lesson-start.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-01-startpage-lesson-start) |
| `03-vocabulary-lesson/02-introduction` | Introduction | [PNG](03-vocabulary-lesson/02-introduction/introduction.png) · [HTML snapshot](03-vocabulary-lesson/02-introduction/introduction.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-02-introduction-introduction) |
| `03-vocabulary-lesson/03-flashcards` | Flashcards | [PNG](03-vocabulary-lesson/03-flashcards/front.png) · [HTML snapshot](03-vocabulary-lesson/03-flashcards/front.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-03-flashcards-front) |
| `03-vocabulary-lesson/03-flashcards` | Flashcards turned | [PNG](03-vocabulary-lesson/03-flashcards/revealed.png) · [HTML snapshot](03-vocabulary-lesson/03-flashcards/revealed.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-03-flashcards-revealed) |
| `03-vocabulary-lesson/04-matching` | Matching | [PNG](03-vocabulary-lesson/04-matching/matching.png) · [HTML snapshot](03-vocabulary-lesson/04-matching/matching.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-04-matching-matching) |
| `03-vocabulary-lesson/05-gender-overview` | Gender | [PNG](03-vocabulary-lesson/05-gender-overview/gender-select.png) · [HTML snapshot](03-vocabulary-lesson/05-gender-overview/gender-select.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-05-gender-overview-gender-select) |
| `03-vocabulary-lesson/05-gender-overview` | Gender checked | [PNG](03-vocabulary-lesson/05-gender-overview/reviewed-overview.png) · [HTML snapshot](03-vocabulary-lesson/05-gender-overview/reviewed-overview.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-05-gender-overview-reviewed-overview) |
| `03-vocabulary-lesson/06-typed-gaps` | Typed gap | [PNG](03-vocabulary-lesson/06-typed-gaps/answer.png) · [HTML snapshot](03-vocabulary-lesson/06-typed-gaps/answer.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-typed-gaps-answer) |
| `03-vocabulary-lesson/06-typed-gaps` | Typed gap checked | [PNG](03-vocabulary-lesson/06-typed-gaps/feedback.png) · [HTML snapshot](03-vocabulary-lesson/06-typed-gaps/feedback.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-typed-gaps-feedback) |
| `03-vocabulary-lesson/06-listening` | Listening choice | [PNG](03-vocabulary-lesson/06-listening/listening-choice.png) · [HTML snapshot](03-vocabulary-lesson/06-listening/listening-choice.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-listening-listening-choice) |
| `03-vocabulary-lesson/06-listening` | No French voice | [PNG](03-vocabulary-lesson/06-listening/no-voice-help.png) · [HTML snapshot](03-vocabulary-lesson/06-listening/no-voice-help.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-listening-no-voice-help) |
| `03-vocabulary-lesson/07-exam` | Exam info | [PNG](03-vocabulary-lesson/07-exam/exam-info.png) · [HTML snapshot](03-vocabulary-lesson/07-exam/exam-info.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-07-exam-exam-info) |
| `03-vocabulary-lesson/07-exam` | Translation exam | [PNG](03-vocabulary-lesson/07-exam/exam-page.png) · [HTML snapshot](03-vocabulary-lesson/07-exam/exam-page.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-07-exam-exam-page) |
| `03-vocabulary-lesson/07-exam` | Listening dictation | [PNG](03-vocabulary-lesson/07-exam/listening-dictation.png) · [HTML snapshot](03-vocabulary-lesson/07-exam/listening-dictation.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-07-exam-listening-dictation) |
| `03-vocabulary-lesson/08-results` | Results | [PNG](03-vocabulary-lesson/08-results/exam-results.png) · [HTML snapshot](03-vocabulary-lesson/08-results/exam-results.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-08-results-exam-results) |
| `03-vocabulary-lesson/08-results` | Gender results | [PNG](03-vocabulary-lesson/08-results/gender-results.png) · [HTML snapshot](03-vocabulary-lesson/08-results/gender-results.html) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-08-results-gender-results) |

<a id="grammar-lesson"></a>

## 04 — Grammar lesson

Rendered from the prototype with the lesson `fr-verb-avoir-present` (`make screens`).

| Screen folder | Screen | Rendered screen |
| --- | --- | --- |
| `04-grammar-lesson/01-startpage` | Lesson start | [PNG](04-grammar-lesson/01-startpage/lesson-start.png) · [HTML snapshot](04-grammar-lesson/01-startpage/lesson-start.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-01-startpage-lesson-start) |
| `04-grammar-lesson/02-00-explanation` | Explanation | [PNG](04-grammar-lesson/02-00-explanation/explanation.png) · [HTML snapshot](04-grammar-lesson/02-00-explanation/explanation.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-00-explanation-explanation) |
| `04-grammar-lesson/02-07-exercise-person-matching` | Person matching | [PNG](04-grammar-lesson/02-07-exercise-person-matching/person-matching.png) · [HTML snapshot](04-grammar-lesson/02-07-exercise-person-matching/person-matching.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-07-exercise-person-matching-person-matching) |
| `04-grammar-lesson/02-01-exercise-pronoun-match` | Pronoun matching | [PNG](04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.png) · [HTML snapshot](04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-01-exercise-pronoun-match-pronoun-match) |
| `04-grammar-lesson/02-02-exercise-pronoun-typing` | Pronoun typing | [PNG](04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.png) · [HTML snapshot](04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-02-exercise-pronoun-typing-pronoun-typing) |
| `04-grammar-lesson/02-03-exercise-gap-choice` | Multiple-choice gap | [PNG](04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.png) · [HTML snapshot](04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-03-exercise-gap-choice-gap-choice) |
| `04-grammar-lesson/02-04-exercise-gap-typing` | Typed gap | [PNG](04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.png) · [HTML snapshot](04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-04-exercise-gap-typing-gap-typing) |
| `04-grammar-lesson/02-04-exercise-gap-typing` | Typed gap checked | [PNG](04-grammar-lesson/02-04-exercise-gap-typing/feedback.png) · [HTML snapshot](04-grammar-lesson/02-04-exercise-gap-typing/feedback.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-04-exercise-gap-typing-feedback) |
| `04-grammar-lesson/02-05-exercise-word-order` | Word order | [PNG](04-grammar-lesson/02-05-exercise-word-order/word-order.png) · [HTML snapshot](04-grammar-lesson/02-05-exercise-word-order/word-order.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-05-exercise-word-order-word-order) |
| `04-grammar-lesson/02-06-exercise-error-spotter` | Error spotter | [PNG](04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.png) · [HTML snapshot](04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-06-exercise-error-spotter-error-spotter) |
| `04-grammar-lesson/03-feedback-placeholder` | Feedback placeholder | [PNG](04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.png) · [HTML snapshot](04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-03-feedback-placeholder-feedback-placeholder) |
| `04-grammar-lesson/04-exam` | Exam info | [PNG](04-grammar-lesson/04-exam/exam-info.png) · [HTML snapshot](04-grammar-lesson/04-exam/exam-info.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-04-exam-exam-info) |
| `04-grammar-lesson/04-exam` | Exam page | [PNG](04-grammar-lesson/04-exam/mixed-exam.png) · [HTML snapshot](04-grammar-lesson/04-exam/mixed-exam.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-04-exam-mixed-exam) |
| `04-grammar-lesson/05-results` | Results | [PNG](04-grammar-lesson/05-results/exam-results.png) · [HTML snapshot](04-grammar-lesson/05-results/exam-results.html) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-05-results-exam-results) |

<a id="function-lesson"></a>

## 05 — Function lesson

Rendered from the prototype with the lesson `fr-ordering-at-a-cafe` (`make screens`).

| Screen folder | Screen | Rendered screen |
| --- | --- | --- |
| `05-function-lesson/01-startpage` | Lesson start | [PNG](05-function-lesson/01-startpage/lesson-start.png) · [HTML snapshot](05-function-lesson/01-startpage/lesson-start.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-01-startpage-lesson-start) |
| `05-function-lesson/02-flashcards` | Expression flashcards | [PNG](05-function-lesson/02-flashcards/expression-flashcards.png) · [HTML snapshot](05-function-lesson/02-flashcards/expression-flashcards.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-02-flashcards-expression-flashcards) |
| `05-function-lesson/03-dialogue` | Model dialogue | [PNG](05-function-lesson/03-dialogue/dialogue.png) · [HTML snapshot](05-function-lesson/03-dialogue/dialogue.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-03-dialogue-dialogue) |
| `05-function-lesson/04-matching` | Expression matching | [PNG](05-function-lesson/04-matching/expression-matching.png) · [HTML snapshot](05-function-lesson/04-matching/expression-matching.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-04-matching-expression-matching) |
| `05-function-lesson/04-matching` | Gender | [PNG](05-function-lesson/04-matching/gender.png) · [HTML snapshot](05-function-lesson/04-matching/gender.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-04-matching-gender) |
| `05-function-lesson/05-dialogue-gap-choice` | Dialogue gap | [PNG](05-function-lesson/05-dialogue-gap-choice/dialogue-gap-choice.png) · [HTML snapshot](05-function-lesson/05-dialogue-gap-choice/dialogue-gap-choice.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-05-dialogue-gap-choice-dialogue-gap-choice) |
| `05-function-lesson/06-word-order` | Word order | [PNG](05-function-lesson/06-word-order/word-order.png) · [HTML snapshot](05-function-lesson/06-word-order/word-order.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-06-word-order-word-order) |
| `05-function-lesson/07-listening-choice` | Listening choice | [PNG](05-function-lesson/07-listening-choice/listening-choice.png) · [HTML snapshot](05-function-lesson/07-listening-choice/listening-choice.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-07-listening-choice-listening-choice) |
| `05-function-lesson/08-exam` | Translation exam | [PNG](05-function-lesson/08-exam/translation-exam.png) · [HTML snapshot](05-function-lesson/08-exam/translation-exam.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-08-exam-translation-exam) |
| `05-function-lesson/08-exam` | Exam replies | [PNG](05-function-lesson/08-exam/reply-word-order.png) · [HTML snapshot](05-function-lesson/08-exam/reply-word-order.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-08-exam-reply-word-order) |
| `05-function-lesson/08-exam` | Exam dialogue | [PNG](05-function-lesson/08-exam/dialogue-gap-typing.png) · [HTML snapshot](05-function-lesson/08-exam/dialogue-gap-typing.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-08-exam-dialogue-gap-typing) |
| `05-function-lesson/09-results` | Results | [PNG](05-function-lesson/09-results/exam-results.png) · [HTML snapshot](05-function-lesson/09-results/exam-results.html) · [SPEC preview](../SPEC.md#mockup-05-function-lesson-09-results-exam-results) |

<a id="reading-lesson"></a>

## 06 — Reading lesson

Every page of one reading lesson ([SPEC section 9](../SPEC.md#9-reading-learning-flow)), rendered from the prototype with the lesson `fr-reading-a-text-message` (`make screens`, P06-00). They replace the Salt sources redrawn from captures in P5-08. Flashcards, matching, the exam info page, the countdown, the results and the lesson navigation are the shared screens of the other categories; only the document view and the skim phase are reading's own. The screens show the wide layout at 1280 px with the sidebar; on phones (960 px and narrower) the sidebar gives way to the numbered point strip and the document stacks above the questions (section 5).

| Screen folder | Screen | Rendered screen |
| --- | --- | --- |
| `06-reading-lesson/01-startpage` | Lesson start | [PNG](06-reading-lesson/01-startpage/lesson-start.png) · [HTML snapshot](06-reading-lesson/01-startpage/lesson-start.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-01-startpage-lesson-start) |
| `06-reading-lesson/02-flashcards` | Flashcards | [PNG](06-reading-lesson/02-flashcards/flashcards.png) · [HTML snapshot](06-reading-lesson/02-flashcards/flashcards.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-02-flashcards-flashcards) |
| `06-reading-lesson/02-flashcards` | Matching | [PNG](06-reading-lesson/02-flashcards/matching.png) · [HTML snapshot](06-reading-lesson/02-flashcards/matching.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-02-flashcards-matching) |
| `06-reading-lesson/03-skim` | Skim with countdown | [PNG](06-reading-lesson/03-skim/skim.png) · [HTML snapshot](06-reading-lesson/03-skim/skim.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-03-skim-skim) |
| `06-reading-lesson/03-skim` | Skim question, answered from memory | [PNG](06-reading-lesson/03-skim/skim-question.png) · [HTML snapshot](06-reading-lesson/03-skim/skim-question.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-03-skim-skim-question) |
| `06-reading-lesson/03-skim` | Skim result after Check | [PNG](06-reading-lesson/03-skim/skim-feedback.png) · [HTML snapshot](06-reading-lesson/03-skim/skim-feedback.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-03-skim-skim-feedback) |
| `06-reading-lesson/04-detail` | Detail questions | [PNG](06-reading-lesson/04-detail/detail.png) · [HTML snapshot](06-reading-lesson/04-detail/detail.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-04-detail-detail) |
| `06-reading-lesson/04-detail` | Detail after Check | [PNG](06-reading-lesson/04-detail/detail-feedback.png) · [HTML snapshot](06-reading-lesson/04-detail/detail-feedback.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-04-detail-detail-feedback) |
| `06-reading-lesson/05-structure` | Structure: ordering | [PNG](06-reading-lesson/05-structure/ordering.png) · [HTML snapshot](06-reading-lesson/05-structure/ordering.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-05-structure-ordering) |
| `06-reading-lesson/05-structure` | Structure result after Check | [PNG](06-reading-lesson/05-structure/ordering-feedback.png) · [HTML snapshot](06-reading-lesson/05-structure/ordering-feedback.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-05-structure-ordering-feedback) |
| `06-reading-lesson/06-exam` | Exam info page | [PNG](06-reading-lesson/06-exam/exam-info.png) · [HTML snapshot](06-reading-lesson/06-exam/exam-info.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-06-exam-exam-info) |
| `06-reading-lesson/06-exam` | Exam page | [PNG](06-reading-lesson/06-exam/exam-page.png) · [HTML snapshot](06-reading-lesson/06-exam/exam-page.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-06-exam-exam-page) |
| `06-reading-lesson/07-results` | Results | [PNG](06-reading-lesson/07-results/exam-results.png) · [HTML snapshot](06-reading-lesson/07-results/exam-results.html) · [SPEC preview](../SPEC.md#mockup-06-reading-lesson-07-results-exam-results) |
