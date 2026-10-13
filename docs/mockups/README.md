# Lesson prototype mockups

One guide for all 37 PlantUML Salt screens. Each screen folder contains only its editable `.puml` source; the matching source is embedded in [SPEC.md](../SPEC.md) as a `plantuml` code fence. PNG/SVG copies are not stored here. See the [issue asset mapping](../ISSUES.md#assets-to-include-when-publishing-applicable-issues).

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

All pages follow the [supplied screenshot reference register and visual contract](../SPEC.md#screenshot-reference-register): dark slate surfaces, light primary actions, outlined secondary controls, wide choice cards, indigo progress, and green/red/amber correctness colors. Original screenshot references belong in docs/design-references/, outside this source-only folder. Salt approximates widget styling and shows the exam timer as a ring symbol with seconds; the React visual contract defines final fills, radii, and centered countdown digits. Practice locks/shows feedback and then confirms with Continue; exam pages withhold feedback until the complete exam ends. Accent corrections name the actual mark. Artifact previews are read-only. All headers show independent mother-tongue and interface-language controls; these examples select en/en. Mother tongue is editable only on the index/starting page, where the option equal to the course's learning language (fr for French courses) is disabled; other pages show its option group read-only (muted unselected choices). Interface language remains editable during the whole session. The index displays discovered language/level groups (currently fr/A1 only), followed by multiselect categories. The artifact header toggles Raw JSON / Structured view; the shared tree opens its root, 0–3-child containers and only children, while other larger objects/arrays start collapsed.

Vocabulary folders include the start page, so folders 02–07 represent learning stages 1–6; `06-listening` and `06-typed-gaps` both belong to practice stage 5, and `07-exam` also holds the listening-dictation page. Grammar's 02-00 explanation and 02-01 through 02-06 exercise folders are a component gallery; actual lessons use 2–4 suitable teaching blocks. Keep this root file as the only mockup README.

- [01 — Lesson overview](#lesson-overview)
- [02 — Artifact view](#artifact-view)
- [03 — Vocabulary lesson](#vocabulary-lesson)
- [04 — Grammar lesson](#grammar-lesson)
- [05 — Lesson navigation](#lesson-navigation)

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
| `03-vocabulary-lesson/06-listening` | listening choice | [Salt source](03-vocabulary-lesson/06-listening/listening-choice.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-listening-listening-choice) |
| `03-vocabulary-lesson/06-listening` | no-voice help | [Salt source](03-vocabulary-lesson/06-listening/no-voice-help.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-06-listening-no-voice-help) |
| `03-vocabulary-lesson/07-exam` | exam page | [Salt source](03-vocabulary-lesson/07-exam/exam-page.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-07-exam-exam-page) |
| `03-vocabulary-lesson/07-exam` | listening dictation | [Salt source](03-vocabulary-lesson/07-exam/listening-dictation.puml) · [SPEC preview](../SPEC.md#mockup-03-vocabulary-lesson-07-exam-listening-dictation) |
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

<a id="lesson-navigation"></a>

## 05 — Lesson navigation

Phase 6 (P6-01, D50): the V2 timeline sidebar in the theory, exam and results journeys, and the compact mobile outline.

| Screen folder | Screen | Source and embedded preview |
| --- | --- | --- |
| `05-lesson-navigation/01-theory` | theory sidebar | [Salt source](05-lesson-navigation/01-theory/theory-sidebar.puml) · [SPEC preview](../SPEC.md#mockup-05-lesson-navigation-01-theory-theory-sidebar) |
| `05-lesson-navigation/02-exam` | exam sidebar | [Salt source](05-lesson-navigation/02-exam/exam-sidebar.puml) · [SPEC preview](../SPEC.md#mockup-05-lesson-navigation-02-exam-exam-sidebar) |
| `05-lesson-navigation/03-results` | results sidebar | [Salt source](05-lesson-navigation/03-results/results-sidebar.puml) · [SPEC preview](../SPEC.md#mockup-05-lesson-navigation-03-results-results-sidebar) |
| `05-lesson-navigation/04-mobile` | mobile outline closed | [Salt source](05-lesson-navigation/04-mobile/mobile-closed.puml) · [SPEC preview](../SPEC.md#mockup-05-lesson-navigation-04-mobile-mobile-closed) |
| `05-lesson-navigation/04-mobile` | mobile outline open | [Salt source](05-lesson-navigation/04-mobile/mobile-open.puml) · [SPEC preview](../SPEC.md#mockup-05-lesson-navigation-04-mobile-mobile-open) |

### Phase 6 comparison (P6-06)

Compared on 2026-10-13 against the working tree of branch `P6-01-lesson-sidebar-navigation` (uncommitted; prototype revision to be recorded when the branch is committed), desktop 1280 px and portrait 375 px:

- **Matches:** timeline design (V2) with a mark and a word per state, exam pages with question counts and limits, results selection by sidebar, compact mobile outline with focus return, no score on theory pages.
- **Salt limits:** the mobile open state shows rows inline; the real outline scrolls inside 60 % of the viewport height and rows are 44 px high.
- **Not yet compared:** the vocabulary and grammar practice mockups keep their phase 3 layout (typed gap now shows the sentence before the reference words; error spotter labels the correction with the selected word); refresh them with the remaining authoring in P2-06/P2-07.
