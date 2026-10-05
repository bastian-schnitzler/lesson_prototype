# Lesson prototype mockups

One guide for all 27 PlantUML Salt screens. Each screen folder contains its editable `.puml` source, an SVG preview, and a PNG preview. See [SPEC.md](../SPEC.md) and [issue asset mapping](../ISSUES.md#assets-to-include-when-publishing-applicable-issues).

- [01 — Lesson overview](#lesson-overview)
- [02 — Artifact view](#artifact-view)
- [03 — Vocabulary lesson](#vocabulary-lesson)
- [04 — Grammar lesson](#grammar-lesson)

All 27 pages share the results-inspired dark background, light text, muted supporting labels, indigo controls, and subtle slate dividers. Index, artifact views, lesson starts, explanations, exercises, and exams use the same palette and spacing. Results follow the supplied screenshot with flat separated rows, correctness icons, muted answer labels, and colored answer text. Fully correct answers are green; incorrect answers are red; accent/case-only answers are amber and receive half credit. Corrections and pre-generated explanations appear where needed. Accent corrections name the mark, for example accent aigu, accent grave, or accent circonflexe; future German feedback says “written with umlaut ä/ö/ü.” Score summaries and the menu for previous exercises remain visible.

Artifact views use shared Outline rendering and category-specific Draft/Content cards and tables; raw JSON is collapsed. Artifact previews are read-only and do not create sessions or run timers. Practice has one primary Continue button: lock/show feedback, then confirm/advance. Only exam pages have countdowns, with results withheld until the entire exam ends.

Vocabulary folder numbers include the start page, so folders 02–07 represent the six learning stages 1–6. Grammar's `02-00` explanation and `02-01` through `02-06` exercise examples document the teaching-block components. Their numbering is a gallery order: actual lessons use 2–4 explanation/practice blocks with suitable exercises, rather than requiring all six types in each lesson. Every lesson subfolder is numbered. This root file is the only mockup README.

<a id="lesson-overview"></a>

## 01 — Lesson overview

| Screen folder | Screen | Files |
| --- | --- | --- |
| `01-lesson-overview/index` | lesson index | [SVG](01-lesson-overview/index/lesson-index.svg) · [PNG](01-lesson-overview/index/lesson-index.png) · [Salt](01-lesson-overview/index/lesson-index.puml) |

<a id="artifact-view"></a>

## 02 — Artifact view

| Screen folder | Screen | Files |
| --- | --- | --- |
| `02-artifact-view/grammar` | lesson detail | [SVG](02-artifact-view/grammar/lesson-detail.svg) · [PNG](02-artifact-view/grammar/lesson-detail.png) · [Salt](02-artifact-view/grammar/lesson-detail.puml) |
| `02-artifact-view/vocabulary` | lesson detail | [SVG](02-artifact-view/vocabulary/lesson-detail.svg) · [PNG](02-artifact-view/vocabulary/lesson-detail.png) · [Salt](02-artifact-view/vocabulary/lesson-detail.puml) |

<a id="vocabulary-lesson"></a>

## 03 — Vocabulary lesson

| Screen folder | Screen | Files |
| --- | --- | --- |
| `03-vocabulary-lesson/01-startpage` | lesson start | [SVG](03-vocabulary-lesson/01-startpage/lesson-start.svg) · [PNG](03-vocabulary-lesson/01-startpage/lesson-start.png) · [Salt](03-vocabulary-lesson/01-startpage/lesson-start.puml) |
| `03-vocabulary-lesson/02-introduction` | introduction | [SVG](03-vocabulary-lesson/02-introduction/introduction.svg) · [PNG](03-vocabulary-lesson/02-introduction/introduction.png) · [Salt](03-vocabulary-lesson/02-introduction/introduction.puml) |
| `03-vocabulary-lesson/03-flashcards` | front | [SVG](03-vocabulary-lesson/03-flashcards/front.svg) · [PNG](03-vocabulary-lesson/03-flashcards/front.png) · [Salt](03-vocabulary-lesson/03-flashcards/front.puml) |
| `03-vocabulary-lesson/03-flashcards` | revealed | [SVG](03-vocabulary-lesson/03-flashcards/revealed.svg) · [PNG](03-vocabulary-lesson/03-flashcards/revealed.png) · [Salt](03-vocabulary-lesson/03-flashcards/revealed.puml) |
| `03-vocabulary-lesson/04-matching` | matching | [SVG](03-vocabulary-lesson/04-matching/matching.svg) · [PNG](03-vocabulary-lesson/04-matching/matching.png) · [Salt](03-vocabulary-lesson/04-matching/matching.puml) |
| `03-vocabulary-lesson/05-gender-overview` | gender select | [SVG](03-vocabulary-lesson/05-gender-overview/gender-select.svg) · [PNG](03-vocabulary-lesson/05-gender-overview/gender-select.png) · [Salt](03-vocabulary-lesson/05-gender-overview/gender-select.puml) |
| `03-vocabulary-lesson/05-gender-overview` | reviewed overview | [SVG](03-vocabulary-lesson/05-gender-overview/reviewed-overview.svg) · [PNG](03-vocabulary-lesson/05-gender-overview/reviewed-overview.png) · [Salt](03-vocabulary-lesson/05-gender-overview/reviewed-overview.puml) |
| `03-vocabulary-lesson/06-typed-gaps` | answer | [SVG](03-vocabulary-lesson/06-typed-gaps/answer.svg) · [PNG](03-vocabulary-lesson/06-typed-gaps/answer.png) · [Salt](03-vocabulary-lesson/06-typed-gaps/answer.puml) |
| `03-vocabulary-lesson/06-typed-gaps` | feedback | [SVG](03-vocabulary-lesson/06-typed-gaps/feedback.svg) · [PNG](03-vocabulary-lesson/06-typed-gaps/feedback.png) · [Salt](03-vocabulary-lesson/06-typed-gaps/feedback.puml) |
| `03-vocabulary-lesson/07-exam` | exam page | [SVG](03-vocabulary-lesson/07-exam/exam-page.svg) · [PNG](03-vocabulary-lesson/07-exam/exam-page.png) · [Salt](03-vocabulary-lesson/07-exam/exam-page.puml) |
| `03-vocabulary-lesson/08-results` | exam results | [SVG](03-vocabulary-lesson/08-results/exam-results.svg) · [PNG](03-vocabulary-lesson/08-results/exam-results.png) · [Salt](03-vocabulary-lesson/08-results/exam-results.puml) |
| `03-vocabulary-lesson/08-results` | gender results | [SVG](03-vocabulary-lesson/08-results/gender-results.svg) · [PNG](03-vocabulary-lesson/08-results/gender-results.png) · [Salt](03-vocabulary-lesson/08-results/gender-results.puml) |

<a id="grammar-lesson"></a>

## 04 — Grammar lesson

| Screen folder | Screen | Files |
| --- | --- | --- |
| `04-grammar-lesson/01-startpage` | lesson start | [SVG](04-grammar-lesson/01-startpage/lesson-start.svg) · [PNG](04-grammar-lesson/01-startpage/lesson-start.png) · [Salt](04-grammar-lesson/01-startpage/lesson-start.puml) |
| `04-grammar-lesson/02-00-explanation` | singular forms | [SVG](04-grammar-lesson/02-00-explanation/singular-forms.svg) · [PNG](04-grammar-lesson/02-00-explanation/singular-forms.png) · [Salt](04-grammar-lesson/02-00-explanation/singular-forms.puml) |
| `04-grammar-lesson/02-01-exercise-pronoun-match` | pronoun match | [SVG](04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.svg) · [PNG](04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.png) · [Salt](04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.puml) |
| `04-grammar-lesson/02-02-exercise-pronoun-typing` | pronoun typing | [SVG](04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.svg) · [PNG](04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.png) · [Salt](04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.puml) |
| `04-grammar-lesson/02-03-exercise-gap-choice` | gap choice | [SVG](04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.svg) · [PNG](04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.png) · [Salt](04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.puml) |
| `04-grammar-lesson/02-04-exercise-gap-typing` | feedback | [SVG](04-grammar-lesson/02-04-exercise-gap-typing/feedback.svg) · [PNG](04-grammar-lesson/02-04-exercise-gap-typing/feedback.png) · [Salt](04-grammar-lesson/02-04-exercise-gap-typing/feedback.puml) |
| `04-grammar-lesson/02-04-exercise-gap-typing` | gap typing | [SVG](04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.svg) · [PNG](04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.png) · [Salt](04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.puml) |
| `04-grammar-lesson/02-05-exercise-word-order` | word order | [SVG](04-grammar-lesson/02-05-exercise-word-order/word-order.svg) · [PNG](04-grammar-lesson/02-05-exercise-word-order/word-order.png) · [Salt](04-grammar-lesson/02-05-exercise-word-order/word-order.puml) |
| `04-grammar-lesson/02-06-exercise-error-spotter` | error spotter | [SVG](04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.svg) · [PNG](04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.png) · [Salt](04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.puml) |
| `04-grammar-lesson/03-feedback-placeholder` | feedback placeholder | [SVG](04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.svg) · [PNG](04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.png) · [Salt](04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.puml) |
| `04-grammar-lesson/04-exam` | mixed exam | [SVG](04-grammar-lesson/04-exam/mixed-exam.svg) · [PNG](04-grammar-lesson/04-exam/mixed-exam.png) · [Salt](04-grammar-lesson/04-exam/mixed-exam.puml) |
| `04-grammar-lesson/05-results` | exam results | [SVG](04-grammar-lesson/05-results/exam-results.svg) · [PNG](04-grammar-lesson/05-results/exam-results.png) · [Salt](04-grammar-lesson/05-results/exam-results.puml) |

## Regenerate previews

Use PlantUML 1.2026.8 and Java (Salt does not require Graphviz). Text and controls have explicit colors because Salt does not apply the default font color consistently. Preserve those colors when editing screens; use adjacent spans rather than nested color tags. From the repository root:

```bash
rg --files docs/mockups -g '*.puml' -0 | xargs -0 java -Djava.awt.headless=true -jar /path/to/plantuml.jar -tsvg
rg --files docs/mockups -g '*.puml' -0 | xargs -0 java -Djava.awt.headless=true -jar /path/to/plantuml.jar -tpng
```

When publishing GitHub issues, embed applicable PNGs and link SVGs and Salt sources using verified repository URLs pinned to the agreed specification commit. Keep relevant Mermaid diagrams and mockups in issue bodies.
