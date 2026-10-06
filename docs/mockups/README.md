# Lesson prototype mockups

One guide for all 29 PlantUML Salt screens. Each screen folder contains only its editable `.puml` source; the matching source is embedded in [SPEC.md](../SPEC.md) as a `plantuml` code fence. PNG/SVG copies are not stored here. See the [issue asset mapping](../ISSUES.md#assets-to-include-when-publishing-applicable-issues).

## Make PlantUML rendering work in VS Code

1. Install **PlantUML by jebbs** (`jebbs.plantuml`) from Extensions.
2. Press **Ctrl+Shift+P** (German keyboard: **Strg+Shift+P**) and select **Preferences: Open User Settings (JSON)**.
3. Add these entries to the existing settings object:

```json
{
  "plantuml.server": "https://www.plantuml.com/plantuml",
  "plantuml.render": "PlantUMLServer",
  "plantuml.previewAutoUpdate": true
}
```

Open SPEC.md in Markdown preview (Ctrl+Shift+V) to render its `plantuml` blocks with the extension. For a source-focused preview, put the cursor inside the diagram and press **Alt+D**; the preview updates automatically when the source changes. The server setting selects the endpoint, while the render setting enables server rendering. See the [extension's setup and preview documentation](https://github.com/qjebbs/vscode-plantuml).

GitHub's native Markdown renderer does not render PlantUML fences. Published issues include the source fence and a server-rendered image URL, verified during publication; this keeps the repository source-only. See [GitHub diagram support](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams).

## Keep source and Markdown together

Whenever a `.puml` changes, update its corresponding code fence in SPEC.md and any other Markdown/issue copies in the same change. The .puml is canonical. SPEC blocks have `mockup:begin` / `mockup:end` markers identifying their source path. After the Makefile is introduced in P1-01, use `make mockups-sync` and `make mockups-check`; test-all and CI check parity. Preview temporary exports outside this folder when needed.

All pages follow the [supplied screenshot reference register and visual contract](../SPEC.md#screenshot-reference-register): dark slate surfaces, light primary actions, outlined secondary controls, wide choice cards, indigo progress, and green/red/amber correctness colors. Original screenshot references belong in docs/design-references/, outside this source-only folder. Salt approximates widget styling and shows the exam timer as a ring symbol with seconds; the React visual contract defines final fills, radii, and centered countdown digits. Practice locks/shows feedback and then confirms with Continue; exam pages withhold feedback until the complete exam ends. Accent corrections name the actual mark. Artifact previews are read-only. All headers show independent mother-tongue and interface-language controls; these examples select en/en. Mother tongue is editable only on the index/starting page; other pages show its option group read-only (muted unselected choices). Interface language remains editable during the whole session. The index displays discovered language/level groups (currently fr/A1 only), followed by multiselect categories. The artifact header toggles Raw JSON / Structured view; the shared tree opens its root and 0–3-child containers, while larger objects/arrays start collapsed.

Vocabulary folders include the start page, so folders 02–07 represent learning stages 1–6. Grammar's 02-00 explanation and 02-01 through 02-06 exercise folders are a component gallery; actual lessons use 2–4 suitable teaching blocks. Keep this root file as the only mockup README.

- [01 — Lesson overview](#lesson-overview)
- [02 — Artifact view](#artifact-view)
- [03 — Vocabulary lesson](#vocabulary-lesson)
- [04 — Grammar lesson](#grammar-lesson)

<a id="lesson-overview"></a>

## 01 — Lesson overview

| Screen folder | Screen | Source and embedded preview |
| --- | --- | --- |
| `01-lesson-overview/index` | lesson index | [Salt source](01-lesson-overview/index/lesson-index.puml) · [SPEC preview](../SPEC.md#mockup-01-lesson-overview-index-lesson-index) |

<a id="artifact-view"></a>

## 02 — Artifact view

| Screen folder | Screen | Source and embedded preview |
| --- | --- | --- |
| `02-artifact-view/grammar` | lesson detail | [Salt source](02-artifact-view/grammar/lesson-detail.puml) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-grammar-lesson-detail) |
| `02-artifact-view/raw-json` | initial JSON tree | [Salt source](02-artifact-view/raw-json/json-tree.puml) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-raw-json-json-tree) |
| `02-artifact-view/raw-json` | expanded JSON tree | [Salt source](02-artifact-view/raw-json/json-tree-expanded.puml) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-raw-json-json-tree-expanded) |
| `02-artifact-view/vocabulary` | lesson detail | [Salt source](02-artifact-view/vocabulary/lesson-detail.puml) · [SPEC preview](../SPEC.md#mockup-02-artifact-view-vocabulary-lesson-detail) |

<a id="vocabulary-lesson"></a>

## 03 — Vocabulary lesson

| Screen folder | Screen | Source and embedded preview |
| --- | --- | --- |
| `03-vocabulary-lesson/01-startpage` | lesson start | [Salt source](03-vocabulary-lesson/01-startpage/lesson-start.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-01-startpage-lesson-start) |
| `03-vocabulary-lesson/02-introduction` | introduction | [Salt source](03-vocabulary-lesson/02-introduction/introduction.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-02-introduction-introduction) |
| `03-vocabulary-lesson/03-flashcards` | front | [Salt source](03-vocabulary-lesson/03-flashcards/front.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-03-flashcards-front) |
| `03-vocabulary-lesson/03-flashcards` | revealed | [Salt source](03-vocabulary-lesson/03-flashcards/revealed.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-03-flashcards-revealed) |
| `03-vocabulary-lesson/04-matching` | matching | [Salt source](03-vocabulary-lesson/04-matching/matching.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-04-matching-matching) |
| `03-vocabulary-lesson/05-gender-overview` | gender select | [Salt source](03-vocabulary-lesson/05-gender-overview/gender-select.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-05-gender-overview-gender-select) |
| `03-vocabulary-lesson/05-gender-overview` | reviewed overview | [Salt source](03-vocabulary-lesson/05-gender-overview/reviewed-overview.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-05-gender-overview-reviewed-overview) |
| `03-vocabulary-lesson/06-typed-gaps` | answer | [Salt source](03-vocabulary-lesson/06-typed-gaps/answer.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-typed-gaps-answer) |
| `03-vocabulary-lesson/06-typed-gaps` | feedback | [Salt source](03-vocabulary-lesson/06-typed-gaps/feedback.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-typed-gaps-feedback) |
| `03-vocabulary-lesson/07-exam` | exam page | [Salt source](03-vocabulary-lesson/07-exam/exam-page.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-07-exam-exam-page) |
| `03-vocabulary-lesson/08-results` | exam results | [Salt source](03-vocabulary-lesson/08-results/exam-results.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-08-results-exam-results) |
| `03-vocabulary-lesson/08-results` | gender results | [Salt source](03-vocabulary-lesson/08-results/gender-results.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-08-results-gender-results) |

<a id="grammar-lesson"></a>

## 04 — Grammar lesson

| Screen folder | Screen | Source and embedded preview |
| --- | --- | --- |
| `04-grammar-lesson/01-startpage` | lesson start | [Salt source](04-grammar-lesson/01-startpage/lesson-start.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-01-startpage-lesson-start) |
| `04-grammar-lesson/02-00-explanation` | singular forms | [Salt source](04-grammar-lesson/02-00-explanation/singular-forms.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-00-explanation-singular-forms) |
| `04-grammar-lesson/02-01-exercise-pronoun-match` | pronoun match | [Salt source](04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-01-exercise-pronoun-match-pronoun-match) |
| `04-grammar-lesson/02-02-exercise-pronoun-typing` | pronoun typing | [Salt source](04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-02-exercise-pronoun-typing-pronoun-typing) |
| `04-grammar-lesson/02-03-exercise-gap-choice` | gap choice | [Salt source](04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-03-exercise-gap-choice-gap-choice) |
| `04-grammar-lesson/02-04-exercise-gap-typing` | feedback | [Salt source](04-grammar-lesson/02-04-exercise-gap-typing/feedback.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-04-exercise-gap-typing-feedback) |
| `04-grammar-lesson/02-04-exercise-gap-typing` | gap typing | [Salt source](04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-04-exercise-gap-typing-gap-typing) |
| `04-grammar-lesson/02-05-exercise-word-order` | word order | [Salt source](04-grammar-lesson/02-05-exercise-word-order/word-order.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-05-exercise-word-order-word-order) |
| `04-grammar-lesson/02-06-exercise-error-spotter` | error spotter | [Salt source](04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-02-06-exercise-error-spotter-error-spotter) |
| `04-grammar-lesson/03-feedback-placeholder` | feedback placeholder | [Salt source](04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-03-feedback-placeholder-feedback-placeholder) |
| `04-grammar-lesson/04-exam` | mixed exam | [Salt source](04-grammar-lesson/04-exam/mixed-exam.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-04-exam-mixed-exam) |
| `04-grammar-lesson/05-results` | exam results | [Salt source](04-grammar-lesson/05-results/exam-results.puml) · [SPEC preview](../SPEC.md#mockup-04-grammar-lesson-05-results-exam-results) |
