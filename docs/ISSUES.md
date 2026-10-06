# GitHub issue backlog

Status: published backlog for [SPEC.md](SPEC.md), version 0.25. Repository: `bastian-schnitzler/lesson_prototype`.

These issue bodies were published to GitHub in P0-04 on 2026-10-06. Each GitHub issue carries this file's scope and acceptance criteria, real dependency links, a link to the specification at the published commit, and its applicable Mermaid flows, PlantUML sources with server-rendered previews, and screenshot references. Titles follow `P<phase>-<two-digit-issue>: <short description>`; every issue belongs to its matching `Phase 0` through `Phase 5` milestone. P0-01 to P0-03 are closed as completed by PRs #1–#3.

## Published issue mapping

| ID | GitHub issue | Title |
| --- | --- | --- |
| P0-01 | [#5](https://github.com/bastian-schnitzler/lesson_prototype/issues/5) | Create and refine the lesson prototype specification |
| P0-02 | [#6](https://github.com/bastian-schnitzler/lesson_prototype/issues/6) | Review the specification with Claude |
| P0-03 | [#7](https://github.com/bastian-schnitzler/lesson_prototype/issues/7) | Remove the superseded requirements summary and its specification references |
| P0-04 | [#8](https://github.com/bastian-schnitzler/lesson_prototype/issues/8) | Publish the agreed specification as a GitHub issue backlog |
| P1-01 | [#9](https://github.com/bastian-schnitzler/lesson_prototype/issues/9) | Build React skeleton, Makefile workflow, and ordered lesson index |
| P1-02 | [#10](https://github.com/bastian-schnitzler/lesson_prototype/issues/10) | Build dist output and verify GitHub Pages deployment |
| P1-03 | [#11](https://github.com/bastian-schnitzler/lesson_prototype/issues/11) | Define executable vocabulary/grammar briefs and lesson schemas |
| P1-04 | [#12](https://github.com/bastian-schnitzler/lesson_prototype/issues/12) | Remove old prompt/schema drafts after executable schema migration |
| P1-05 | [#13](https://github.com/bastian-schnitzler/lesson_prototype/issues/13) | Implement offline Gemini brief generation and environment setup |
| P1-06 | [#14](https://github.com/bastian-schnitzler/lesson_prototype/issues/14) | Generate first-ten category briefs and extend the combined detail page |
| P1-07 | [#15](https://github.com/bastian-schnitzler/lesson_prototype/issues/15) | Implement offline lesson content generation and validation |
| P1-08 | [#16](https://github.com/bastian-schnitzler/lesson_prototype/issues/16) | Generate first-ten category lessons and extend combined content review |
| P1-09 | [#17](https://github.com/bastian-schnitzler/lesson_prototype/issues/17) | Build session host, progress, single Continue flow, timed exams, and results |
| P1-10 | [#18](https://github.com/bastian-schnitzler/lesson_prototype/issues/18) | Review shared vocabulary/grammar contracts before category implementation |
| P1-11 | [#20](https://github.com/bastian-schnitzler/lesson_prototype/issues/20) | Add the vocabulary listening exercise and no-voice help page |
| P1-12 | [#19](https://github.com/bastian-schnitzler/lesson_prototype/issues/19) | Update index and artifact-view mockups from the prototype |
| P2-01 | [#21](https://github.com/bastian-schnitzler/lesson_prototype/issues/21) | Review vocabulary renderer composition and answer contracts |
| P2-02 | [#22](https://github.com/bastian-schnitzler/lesson_prototype/issues/22) | Implement vocabulary introduction, flashcards, and matching |
| P2-03 | [#23](https://github.com/bastian-schnitzler/lesson_prototype/issues/23) | Implement noun-gender overview, typed gaps, and translation exam |
| P2-04 | [#24](https://github.com/bastian-schnitzler/lesson_prototype/issues/24) | Integrate complete vocabulary sessions and end-to-end validation |
| P2-05 | [#25](https://github.com/bastian-schnitzler/lesson_prototype/issues/25) | Update vocabulary lesson mockups from the prototype |
| P3-01 | [#26](https://github.com/bastian-schnitzler/lesson_prototype/issues/26) | Review grammar renderer composition and mixed exam support |
| P3-02 | [#27](https://github.com/bastian-schnitzler/lesson_prototype/issues/27) | Implement pronoun/form matching and typing with tests |
| P3-03 | [#28](https://github.com/bastian-schnitzler/lesson_prototype/issues/28) | Implement multiple-choice gaps and exact-typing phrase gaps |
| P3-04 | [#29](https://github.com/bastian-schnitzler/lesson_prototype/issues/29) | Implement word order and grammar error spotter |
| P3-05 | [#30](https://github.com/bastian-schnitzler/lesson_prototype/issues/30) | Implement production-feedback placeholder, timed mixed exams, and answer review |
| P3-06 | [#31](https://github.com/bastian-schnitzler/lesson_prototype/issues/31) | Complete all grammar lessons and end-to-end course validation |
| P3-07 | [#32](https://github.com/bastian-schnitzler/lesson_prototype/issues/32) | Update grammar lesson mockups from the prototype |
| P4-01 | [#33](https://github.com/bastian-schnitzler/lesson_prototype/issues/33) | Define functions requirements and implementation backlog |
| P4-02 | [#34](https://github.com/bastian-schnitzler/lesson_prototype/issues/34) | Update function lesson mockups from the prototype |
| P5-01 | [#35](https://github.com/bastian-schnitzler/lesson_prototype/issues/35) | Define reading requirements and implementation backlog |
| P5-02 | [#36](https://github.com/bastian-schnitzler/lesson_prototype/issues/36) | Update reading lesson mockups from the prototype |


## Ongoing GitHub synchronization

Once these issues are published, every change to `docs/SPEC.md` or `docs/ISSUES.md` must also refresh GitHub issues in the same change workflow. Update affected titles, scope, acceptance criteria, dependencies, Mermaid diagrams, matching PlantUML source fences, and server-rendered preview URLs, and refresh specification version/commit links across the published backlog. Preserve issue numbers/URLs and record mappings for new issues. Verify the remote updates before reporting the change complete; explicitly report pending synchronization if GitHub access is unavailable. See [the specification's synchronization rule](SPEC.md#keep-github-issues-synchronized).

## GitHub titles and milestones

Use each issue heading below as its GitHub title, including the phase/issue prefix and colon: `P0-01: Create and refine the lesson prototype specification`, etc. The title prefix is the logical roadmap ID; GitHub assigns a separate repository issue number for links; branch names use the logical ID. Existing published issue numbers/URLs stay stable when their titles or scope change.

Create or reuse milestones named exactly **Phase 0**, **Phase 1**, **Phase 2**, **Phase 3**, **Phase 4**, and **Phase 5**. Each phase's issues must be assigned to that milestone, with its description based on the corresponding SPEC deliverables and exit criteria. Check for existing milestones before creating them and verify every issue's assignment. Phase 4/5 review and closing tasks remain requirements-dependent; their detailed implementation backlog follows later.

Each implementation phase ends with a dedicated issue to improve its Salt mockups against the actual running prototype. That mockup-refresh issue is always the **last issue of its milestone**: it has the highest logical ID in its phase and depends, directly or transitively, on every other issue of that phase. When an issue is added to a phase, renumber so the mockup issue stays last; GitHub issue numbers do not change. Compare the real pages against the SPEC visual contract and supplied screenshot references R1–R5, update sources and their matching embedded PlantUML code fences, update the single mockup README and documentation links, and synchronize published GitHub issue assets. These closing issues are part of phase completion.

## Makefile workflow

Create the Makefile in **P1-01**, then use Make targets for every workflow task. Recipes may call package-manager/Node/test tools internally; documentation and CI invoke make. Every subsequent issue adds or extends relevant targets and updates help. Use the [SPEC target table](SPEC.md#makefile-workflow) for generation, run/browser configuration, build, unit/integration/e2e/all tests, and mockup synchronization. Keep the source/Markdown parity check in test-all and CI. Function/reading review issues must plan the extension of existing generation/test targets when those categories become supported.

## Branch naming

Use the issue's logical ID from this file plus a short description: `P<phase>-<two-digit-issue>-<short-description>`, for example `P0-02-claude-spec-review` or `P1-01-build-lesson-index`. Keep the ID uppercase as in the heading; the description uses lowercase words separated by hyphens. The ID does not change at publication, so branch names never use GitHub issue numbers. The merged P0-01 branch `p0-01-create-spec` predates this rule. Before starting any issue, check the current branch: switch to the issue's branch if it exists, otherwise create it from the up-to-date main branch; never start issue work on `main` or another issue's branch.

## Phase 0 — specification and issue creation

### P0-01: Create and refine the lesson prototype specification

GitHub: [#5](https://github.com/bastian-schnitzler/lesson_prototype/issues/5).

Milestone: **Phase 0**.

Problem: the draft schemas and runtime/hosting requirements do not yet form an agreed implementation contract.

Scope: refine `docs/SPEC.md` with the user in several iterations, retain Mermaid flows and PlantUML Salt mockups, and record the final decisions.

Acceptance:

- Record the confirmed requirements source, Pages entry point, offline generation, independent en/fr/de mother tongue and interface language, 65% exam / 35% practice weights, 50% accent/case-only credit, browser speech, and production-feedback placeholder; review filters and persistence.
- Record the confirmed larger-inventory/longer-duration exceptions, ordinary vocabulary average near 12, around 8 for demanding lessons, and mixed difficulty within each topic where possible.
- Agree phases 0–5 and the content review gates.
- Use the supplied screenshot register R1–R5 as the design reference; remove the superseded website link. Preserve all five distinct local originals under docs/design-references/ and embed them in SPEC, including the corrected Deutsch start screenshot R3. Include applicable committed screenshot links in published issue bodies. Keep docs/mockups/ source-only.
- Remove provisional assumptions or identify expressly deferred scope.

Dependencies: none.

### P0-02: Review the specification with Claude

GitHub: [#6](https://github.com/bastian-schnitzler/lesson_prototype/issues/6).

Milestone: **Phase 0**.

Scope: review SPEC, the issue backlog, current outline/schema references, and Salt mockups with Claude after the initial specification refinement.

Acceptance:

- Claude reviews consistency, missing requirements, schema/generation feasibility, scoring/timing behavior, UI flows, phase boundaries, dependencies, and test coverage.
- Record the reviewed specification version, Claude review output, findings, and their disposition in a review record under `docs/reviews/`.
- Resolve accepted findings in SPEC, ISSUES, and affected mockups; record rationale for findings that are deferred or rejected.
- Review material requirement changes with the user. Complete this review before retiring the original requirements summary.

Dependencies: P0-01. Requires access to Claude; do not claim the review complete without an actual Claude review.

### P0-03: Remove the superseded requirements summary and its specification references

GitHub: [#7](https://github.com/bastian-schnitzler/lesson_prototype/issues/7).

Milestone: **Phase 0**.

Scope: retire `old_prompt/requirement_summary.md` after the reviewed specification incorporates its requirements and the user's subsequent decisions.

Acceptance:

- Confirm the vocabulary/grammar requirements remain fully represented in SPEC and the user decisions take precedence where they refine the original summary.
- Remove `old_prompt/requirement_summary.md`.
- Remove all requirements-summary filename/path references from SPEC, including input listings, decision rows, and revision notes. Identify SPEC as the maintained requirements document.
- Update any remaining documentation links to the maintained specification without discarding requirements.
- Update the published backlog if publication has already occurred.

Dependencies: P0-02.

### P0-04: Publish the agreed specification as a GitHub issue backlog

GitHub: [#8](https://github.com/bastian-schnitzler/lesson_prototype/issues/8).

Milestone: **Phase 0**.

Scope: create the agreed phase 0–3 issues and phase 4/5 requirements and future mockup-refresh placeholders in the repository; link specification and dependencies.

Acceptance:

- Existing issues are checked to avoid duplication.
- Every issue has scope, acceptance criteria, phase, and dependencies, and its title starts with `P<phase>-<two-digit-issue>:` (for example `P0-01: Create spec`).
- Create/reuse milestones Phase 0–Phase 5 and assign every issue to its corresponding milestone; verify assignments and phase descriptions.
- Document the agreed branch naming pattern and map logical IDs to actual issue numbers; work branches use `P<phase>-<two-digit-issue>-<short-description>`.
- The specification and this index link to actual issue URLs.
- After publication, every subsequent SPEC.md/ISSUES.md change refreshes the GitHub backlog and its specification references; affected scope, acceptance criteria, dependencies, diagrams, and mockups match the latest specification.
- Remote issue updates and links are verified as part of completing each documentation change; any blocked synchronization is reported explicitly.
- Relevant issue bodies include fenced Mermaid flows and fenced PlantUML/Salt source, with server-rendered image URLs for GitHub display and editable source links pinned to the spec commit. Verify rendering; do not commit PNG/SVG copies or rely on GitHub to render PlantUML code fences natively.
- Functions/reading implementation remains blocked on requirements instead of speculative exercise definitions.

Dependencies: P0-03.

## Phase 1 — skeleton and general application

### P1-01: Build React skeleton, Makefile workflow, and ordered lesson index

GitHub: [#9](https://github.com/bastian-schnitzler/lesson_prototype/issues/9).

Milestone: **Phase 1**.

Scope: initialize the React/TypeScript module app, the Makefile workflow, screenshot-based shared visual tokens, the shared catalog scanner reused later by build and generation, multi-outline discovery, learning-language/level selection, independent native/interface preferences, hash routing, category filters, and the artifact JSON tree toggle.

Acceptance:

- Create the root Makefile as the public workflow entry point. Define BROWSER_CMD and PORT at its top; provide help (default), install, run, test, test-e2e, test-all, mockups-sync, mockups-check, and issues-sync (after publication) with real implementations as the skeleton/test tooling becomes available. Unavailable operations fail clearly, never as successful no-ops.
- `make run` refreshes the current outline catalog using the shared scanner, serves index.html over HTTP, waits for readiness, opens its URL using BROWSER_CMD, and handles interruption/browser-launch errors; browser and port can be overridden.
- mockups-sync/check enforce exact .puml/Markdown parity and the source-only mockup folder policy. Later issues extend targets and help; CI/documented workflows use make.
- Match the SPEC visual contract and screenshot references R1–R5: dark slate surfaces, outlined secondary controls, light primary actions, wide padded choice cards, and responsive header/content widths. Shared lesson headers show progress percentage/score; circular countdowns appear only in exams. Reference-app placement/account/daily-goal features stay outside prototype scope.
- Discover every content/outlines/*.json through the build-derived catalog. Learning-language and available-level option groups precede the independent Voc/Grammar/Func/Reading options in one filter bar above the “Your lessons” heading, each label in front of its options. Select fr initially and A1 when available, with documented fallbacks; preserve per-outline order/ordinals and category selection. fr/A1 still contains 120 rows. Use additional-course fixtures, not invented authored courses, to verify discovery and races.
- Shared headers show mother-tongue en/fr/de single-select options and an independent fr/en/de interface combobox. Localize UI messages in all three languages; translations follow mother tongue and explanations/instructions follow interface language. Defaults are en/en on first visit; both preferences persist in browser storage across full reloads (D45), with storage failures falling back to en/en. The mother-tongue option equal to the course's learning language is disabled with an accessible reason, and a course change that would make them equal selects the first other option in en, fr, de order. Mother tongue is editable only on the starting/index page and other header groups are disabled/read-only. Interface language stays editable everywhere; switches never call Gemini or change target-language answers.
- Voc/Grammar/Func/Reading options follow the agreed filter order and behavior; empty/error/loading states work.
- Each row has exactly one Content button labeled Outline, Draft, or Content for the highest artifact available to the combined detail page; Actions has only Start lesson and only when outline/draft/content are valid, current, and supported.
- Score on last try starts blank, updates to the latest completed weighted total (including zero), survives app navigation, and clears on full reload; it is never hydrated from browser storage.
- The combined detail page renders the shared `OutlineSummary` for every category, showing the original title/intent, ordinal, category, language/level, and topic/theme. Its header contains, directly under the page title and in this order, Lesson overview, Raw JSON / Structured view and Start lesson when available, plus shared language preferences.
- A typed component registry provides category-specific Draft/Content views as implemented in P1-06/P1-08. Cards, tables, and previews are the primary interface; raw JSON uses the header-toggle generic tree with the root expanded, primitive leaves visible, 0–3-child containers and only children expanded, and other larger containers collapsed recursively; user expansion survives mode/locale switches. Preserve original values, diagnostics, keyboard access and structured-view state. Missing/invalid artifacts remain inspectable with readiness explanations.
- The browser reads static files only; no generation controls, generating states, or generation animations appear.
- Functions/reading show pending requirements and do not generate content.
- Responsive layout, labeled actions, and visible focus are present. All pages use the same results-inspired dark background, light text, muted labels, subtle slate dividers/surfaces, and indigo controls. Shared design tokens also define green correct answers, red errors, and amber accent/case-only credit across practice, review, and results.

Dependencies: P0-04.

### P1-02: Build dist output and verify GitHub Pages deployment

GitHub: [#10](https://github.com/bastian-schnitzler/lesson_prototype/issues/10).

Milestone: **Phase 1**.

Scope: reproducible build, content copying/manifest, project base path, CI validation, and Pages deployment workflow.

Acceptance:

- Add `make build` and use it in local/CI deployment workflows; update `make help` with build prerequisites and output.
- `make build` validates all outline files, rejects duplicate language/level courses and globally duplicated lesson IDs, and derives the course catalog with ordered IDs, relative outline URLs, metadata and hashes. Adding a file requires rebuilding, not app source edits.
- `make build` produces `dist/index.html` as the Pages entry point, module assets, outline, generated content, and derived availability manifest; React reads the deployed JSON files.
- Deployed assets/content resolve under the repository Pages path; hash routes refresh correctly.
- Verify actual Pages settings and record the working URL with an HTTP smoke check.
- Missing content produces a clear state in the static demo.
- `.env` and generator secrets are absent from deployment output.

Dependencies: P1-01.

Initial verification uses the outline and available fixtures; later sample deployment coverage is checked in P1-12.

### P1-03: Define executable vocabulary/grammar briefs and lesson schemas

GitHub: [#11](https://github.com/bastian-schnitzler/lesson_prototype/issues/11).

Milestone: **Phase 1**.

Scope: redesign `LessonBriefSchema` as multilingual category-specific contracts; add renderable lesson/item contracts and resolve shared imports.

Acceptance:

- Extend `make test` with schema/contract fixtures and import checks; keep those checks in `make test-all`.
- Vocabulary planning includes required target translations for every available mother tongue (all of en/fr/de except the learning language), word class, gender/number/article applicability, exam forms, contexts, and six-stage coverage; count/difficulty rationale follows the agreed average near 12, around 8 for demanding lessons, and mixed difficulty. Explicit counts support full inventories beyond 15/32, grouping, and longer duration estimates where needed.
- Grammar planning includes 2–4 teaching blocks, rule references, targeted exercise plans, the fixed production-feedback placeholder stage, and mixed exam blueprint; no individualized feedback-analysis catalogue is required.
- Every scored answer unit has a required pre-generated short en/fr/de explanation map of why its correct answer is right, including accent/case and noun-gender corrections.
- Orthography correction explanations name the actual mark: French accent aigu/grave/circonflexe, cédille, or tréma as applicable. Avoid character-only wording such as “written with é”; future German feedback uses “written with umlaut ä/ö/ü.” Apply this consistently to practice, results, and artifact previews during prompt design and content review.
- Vocabulary noun-gender selectors and reviewed overview are a scored stage-4 interaction with conditional applicability and preserved row results.
- Content schemas model ordered payloads, six grammar interaction types, vocabulary interactions, and mixed exams; concrete pages have positive estimated durations, and each exam page has its brief-defined positive time limit.
- Typed answer outcomes distinguish fully correct, accent/case-only (half credit), incorrect, and unanswered while preserving the original response. Ligature/umlaut digraph substitutes (`oe`/`œ`, `ae`/`æ`, `ae`/`ä`, `oe`/`ö`, `ue`/`ü`) are half credit; answers can mark accent-distinguished words (`à`, `où`, `là`, …) accent-sensitive, so those accent errors are incorrect.
- Vocabulary contracts include `vocabulary_listening_choice` (practice) and `vocabulary_listening_dictation` (exam) with brief-planned coverage; noun exam forms use the indefinite article wherever grammatical, with explicit exception forms only where none exists.
- Strict validation enforces outline metadata, unique IDs, reference integrity, answer validity, and category sequence.
- Brief and content schemas require complete strict maps for every native translation (each mother tongue except the learning language) and every en/fr/de localized support field, with shared IDs/answers/durations/timing/scoring. Remove single nativeLanguage from artifact envelopes; store attempt language context in sessions. Bump schema version and reject stale English-only or partial-locale artifacts; locale correctness/equivalence is reviewed separately. Include shared LocalizedTextSchema and NativeTranslationsSchema fixtures.
- Validation also enforces per-locale unique native labels within each matching group/overview, gender/number disambiguation of translation-exam prompts (or acceptance of every valid form), single-token substitution errors for error spotting, and `estimatedMinutes` equal to the rounded sum of page estimates.
- Missing `language.ts` is resolved; shared enums are reused without retaining competing active contracts.
- Fixtures demonstrate normal noun vocabulary, non-noun targets, conjugation grammar, and non-conjugation grammar.

Dependencies: P1-01.

### P1-04: Remove old prompt/schema drafts after executable schema migration

GitHub: [#12](https://github.com/bastian-schnitzler/lesson_prototype/issues/12).

Milestone: **Phase 1**.

Scope: remove `old_prompt/` and its legacy `data_model_draft/item.ts` and `data_model_draft/lesson.ts` once P1-03 supplies executable replacements.

Acceptance:

- Run the applicable `make test` and `make build` checks after cleanup; keep Makefile paths/prerequisites current.
- Preserve the needed enums, language definitions, schema validation, and category contracts in the maintained executable modules before deletion.
- Confirm no application, generator, fixture, build configuration, or test imports the legacy draft files.
- Remove the whole `old_prompt/` directory and its files, including item.ts and lesson.ts.
- Remove all old_prompt and retired draft-file references from SPEC, including input tables, migration notes, and historical entries; keep the current schema contract documented.
- Run the applicable schema/import/build checks to confirm cleanup did not remove required definitions; update documentation and any published GitHub issues accordingly.

Dependencies: P1-03, P1-02, P0-03.

### P1-05: Implement offline Gemini brief generation and environment setup

GitHub: [#13](https://github.com/bastian-schnitzler/lesson_prototype/issues/13).

Milestone: **Phase 1**.

Scope: offline CLI generator, `.env.example`, Gemini structured-output adapter, category brief prompts, validation, and file writes. No browser generation endpoint.

Acceptance:

- Add `make brief ID=<id>` and `make briefs-missing`. Require/validate single IDs, reject unsupported function/reading requests, and batch supported briefs serially in outline order while reporting skipped categories. Extend make test with fake-adapter checks and update help.
- Model and API key are read from local `.env`; the example contains placeholders and `.env` is ignored.
- Resolve IDs across the validated course catalog; prompts require all three locales in one brief file, with complete locale validation before reuse/save.
- Outline-selected IDs determine canonical `content/briefs/<id>.json` paths.
- Generated responses pass structural, Zod, and semantic validation before atomic save.
- Valid existing briefs are reused; stale/invalid artifacts have explicit errors/regeneration actions.
- Bounded retries per generation unit, CLI diagnostics, per-ID deduplication, provenance, and per-entry canonical outline hashes work.
- Fake-adapter tests verify success, reuse, malformed output, repair exhaustion, and safe failure.

Dependencies: P1-03. P1-04 cleanup can proceed in parallel; it must confirm the generator imports no legacy draft file.

### P1-06: Generate first-ten category briefs and extend the combined detail page

GitHub: [#14](https://github.com/bastian-schnitzler/lesson_prototype/issues/14).

Milestone: **Phase 1**.

Scope: generate the first ten grammar and first ten vocabulary briefs in outline order; add `VocabularyBriefView` and `GrammarBriefView` to the existing combined detail page, using typed React cards, tables, and lesson-plan components.

Acceptance:

- Add `make sample-briefs` for the named first-ten grammar/vocabulary set; use it for the phase 1 review batch and update help.
- The exact twenty fr/A1 IDs in SPEC section 9 have valid individual brief files with en/fr/de support and translations. Review all locales for accuracy, aligned meanings and stable shared answers.
- Vocabulary Draft renders objective/duration, target inventory with translations and applicable gender/articles, difficulty balance/count rationale, six-stage plan, and individual exam-page limits.
- Grammar Draft renders objective/coverage, 2–4 teaching blocks with rules, examples, pitfalls and exercise plans, plus mixed-exam coverage and individual page limits.
- Both use the same Outline component and header; complete arrays remain browsable. Review is usable in structured mode with the header raw JSON toggle, with category-specific mockups matching SPEC section 8.
- Invalid/missing files have distinct states; rebuilding the manifest after offline generation updates Content labels and Start availability.
- Present concrete samples to the user and record review changes and acceptance before content generation; check target counts, the ordinary average excluding exceptions, and the balance of easier/harder targets within each topic.

Dependencies: P1-01, P1-05.

### P1-07: Implement offline lesson content generation and validation

GitHub: [#15](https://github.com/bastian-schnitzler/lesson_prototype/issues/15).

Milestone: **Phase 1**.

Scope: category-specific content prompts/schemas, validated lesson saves, and offline CLI brief-to-lesson preparation for single IDs and ordered batches.

Acceptance:

- Add `make generate ID=<id>` and `make generate-missing`: prepare a missing brief first, then missing content, reusing valid existing artifacts. Single unsupported function/reading IDs fail; batch processing skips them until implemented, runs serially, reports failures, preserves successes, and exits nonzero if any supported lesson fails. Update help and make test coverage.
- Content generation uses the selected catalog outline, complete multilingual brief and category schema. Require native translations for every available mother tongue and en/fr/de instructions, teaching explanations and item-level corrections in the same file; reject missing/empty locale keys and preserve aligned IDs, shared answer keys, scoring, durations and limits. Batch generation covers discovered supported-category courses in deterministic course/outline order.
- Content may be generated in separately validated sections and assembled locally; brief-determined parts (flashcards, matching pairs, noun-gender rows) are assembled without model calls. Save one atomic `content/lessons/<id>.json`; validate step order, references, coverage, answer keys, provenance hashes, page-duration estimates, and preservation of the brief's exam time limits.
- Both existing stages avoid model calls; missing brief is prepared before content.
- Content failure preserves a valid brief; retry resumes the failed stage.
- CLI failures handle invalid/stale files, model/network errors, and exhausted retries explicitly.
- No lesson starts with invalid content or unsupported renderers; browser readiness errors do not call Gemini or a generator endpoint.

Dependencies: P1-05, P1-06 brief review gate.

### P1-08: Generate first-ten category lessons and extend combined content review

GitHub: [#16](https://github.com/bastian-schnitzler/lesson_prototype/issues/16).

Milestone: **Phase 1**.

Scope: generate twenty sample lesson files from approved briefs and add `VocabularyContentView` and `GrammarContentView` to the combined detail page, alongside the shared Outline and category-specific Draft views.

Acceptance:

- Add `make sample-lessons` for the approved twenty briefs and update help; this review gate precedes bulk course expansion.
- All twenty sample IDs have validated briefs and lessons with current input hashes.
- Vocabulary Content uses ordered stage cards, flashcard sides, matching pairs, noun-gender/overview tables, gap prompts with reference words, and translation-exam previews.
- Grammar Content uses explanation/form-table cards and previews for all six exercise types, the production-feedback placeholder, and the mixed exam.
- Both expose every generated prompt, accepted answer, point unit, explanation, page-duration estimate, and countdown limit using semantic HTML; the Raw JSON / Structured view toggle exposes every locale in an unchanged generic tree. The header also has Lesson overview, eligible Start lesson and shared language preferences.
- Previews are read-only: no attempt creation, scoring, running countdown, or active-session mutations. These phase 1 review components work before phase 2/3 interactive renderers; shared presentation can be reused later.
- User review checks all en/fr/de variants for pedagogy, A1 suitability, full intent coverage, translation/explanation accuracy, equivalent assessed meaning, duration, and grading ambiguity; switch native/interface settings independently in both structured and raw mode.
- Accepted changes are reflected in schemas/prompts and regenerated affected samples before expansion.

Dependencies: P1-01, P1-07.

### P1-09: Build session host, progress, single Continue flow, timed exams, and results

GitHub: [#17](https://github.com/bastian-schnitzler/lesson_prototype/issues/17).

Milestone: **Phase 1**.

Scope: start/resume page, session schema/reducer, exercise shell/renderer registry, persistence, duration-weighted progress/live score header, practice confirmation/explanations, timed exams, final exam/practice results menu, and ephemeral index last-try scores.

Acceptance:

- Extend make test and make test-e2e with the shared session/timing/result checks; make test-all runs them and the mockup parity check with nonzero failure propagation.
- Readiness-validated Start leads to a start/resume page, then sequential pages hosted by typed renderers; browser generation is absent.
- Shared session supports unscored screens, multi-unit tasks, and mixed exam items.
- Continue locks practice answers and shows visual feedback/correct answers and pre-generated explanations; a second Continue confirms and advances, with no Check button or required correction retry. Locked points are immutable.
- Typing earns 1 for fully correct accents/case, 0.5 for accent/case-only errors, and 0 for incorrect/unanswered; totals apply **35% practice / 65% exam** once.
- Header progress weights completed concrete pages by estimated duration, without double-counting containers; show accumulated weighted credit against 100 possible points.
- Exam countdowns use each brief-defined page limit, persist absolute deadlines, submit drafts or unanswered units at expiry, and handle timeout/Continue races once.
- Per-answer exam feedback and score changes are hidden until the entire exam finishes; then show every task, original learner answer, correct answer, points/classification, and timeout marker on the final results page, with the exam selected by default and a menu to inspect every prior exercise result.
- Final results show each exercise's score, practice aggregate, exam sections/aggregate, applied weights, and weighted total; review-only exercises show completion in the menu.
- Render a large rounded slate summary card with prominent weighted total and separate practice/exam statistics; place the previous-exercise button menu below it and a Lesson overview action at the top right, following R5.
- Render final exam and selected practice results using the screenshot-style dark flat answer list: icon/prompt, muted answer labels, red incorrect answers, green accepted answers/corrections, thin dividers, and generated correction explanations. Accent/case-only answers have amber half-credit labels; timeout/unanswered status is visible. Avoid repeating an identical correct-answer line.
- Reload/resume, restart, content-hash incompatibility, and storage failure are handled; last-try index scores remain in memory only and reset on full reload without resetting persisted active sessions.
- Results selection preserves immutable responses/scores and never starts exercise timers or changes progress.
- Unit/integration tests cover Continue lock/confirm, half credit, duration-weighted progress, sealed exam scores, fake-clock timeouts/races/reload, and answer review using fixtures; 80% practice and 60% exam produce 67% total regardless of item counts.
- Runtime shuffles of matching sides, gap choices, and word-order banks use a session-stored seed so resume and results review keep the same order.
- Record learning language/level, attempt mother tongue and original native prompts with responses. Interface switching preserves drafts, locks, scores, progress and active exam deadlines and never reveals exam feedback. Mother tongue is immutable per attempt, selectable/applied only on the starting/index page, and read-only on artifact/start-confirmation/session/results pages. Returning to that page does not pause a running exam; a new selection affects only new attempts, never resumed/completed ones. Test result-language switching without re-scoring.

Dependencies: P1-01, P1-03. Full preparation integration: P1-07.

### P1-10: Review shared vocabulary/grammar contracts before category implementation

GitHub: [#18](https://github.com/bastian-schnitzler/lesson_prototype/issues/18).

Milestone: **Phase 1**.

Scope: assess shared structures against the twenty sample plans and adjust domain/UI contracts before vocabulary work.

Acceptance:

- Confirm the host supports vocabulary stages including listening pages, and grammar blocks/placeholder/mixed exams, timed page plans, weighted progress, single-Continue practice feedback, and final results with an exam/practice review menu.
- Shared matching, typing, token, audio, and result needs are identified with clear ownership.
- Avoid one oversized base class; use composition and pure scorers where appropriate.
- Update schemas/session fixtures and tests for material gaps before phase 2.

Dependencies: P1-08 sample review gate, P1-09, P1-11.

### P1-11: Add the vocabulary listening exercise and no-voice help page

GitHub: [#20](https://github.com/bastian-schnitzler/lesson_prototype/issues/20).

Milestone: **Phase 1**.

Scope: listening choice for practice and listening dictation for exams, the shared speech-playback control, and the help page shown when no suitable browser voice exists.

Acceptance:

- `vocabulary_listening_choice` plays a target's pronunciation text with browser speech in the learning language; the learner selects one of four distinct written options. One point per item; Continue lock/confirm and correction explanations follow the shared practice flow.
- `vocabulary_listening_dictation` plays a target in a timed exam page; the learner writes the teaching form, including a required article. The shared free-text classifier scores it, and feedback stays hidden until the complete exam ends. Replay is allowed until the page locks; this is the only exam audio exception.
- Briefs plan listening coverage, counts, page durations and exam limits; coverage is required where the outline intent names oral recognition or pronunciation (numbers, alphabet, classroom instructions) and optional otherwise. Content validation checks that options, pronunciation text and accepted answers refer to the same target.
- When no learning-language voice is available, each listening page is replaced by a localized en/fr/de help page explaining browser speech synthesis and voice installation on Windows, macOS and Linux, with a **Skip** button to the next exercise. The help page has no countdown, and an exam countdown starts only when audio can play.
- Skipped listening units are recorded in the session as `skipped_no_voice` only for resume. They are left out of scores, denominators, progress and results review.
- Artifact previews show listening items read-only with their pronunciation text and answers.
- Extend `make test` and `make test-e2e`: voice available/unavailable (mocked `speechSynthesis`), replay, choice scoring, dictation half credit, skip, timer start, resume, and accessible operation.

Dependencies: P1-03, P1-09.

### P1-12: Update index and artifact-view mockups from the prototype

GitHub: [#19](https://github.com/bastian-schnitzler/lesson_prototype/issues/19).

Milestone: **Phase 1**.

Scope: improve the lesson index and category-specific artifact views Salt mockups using the pages actually created in the prototype at the end of this phase.

Acceptance:

- Include catalog language/level/category controls, shared locale headers, Raw JSON / Structured view tree states, and the final index and Outline/Draft/Content views after approved sample artifacts are available; refresh build/deployment checks for those pages through Make targets.
- Inspect the running prototype's lesson index and category-specific artifact views, including relevant responsive layouts and representative ready, answer, feedback, or error states.
- Update the applicable editable `.puml` sources to reflect the implemented layout, controls, content, and behavior while preserving the agreed shared dark design.
- Run `make mockups-sync` and `make mockups-check` to refresh and verify matching Markdown PlantUML code. Inspect the automatic previews against the actual prototype; keep only .puml sources in the mockup folder.
- Update the root mockup README, SPEC references, issue asset mappings, and all affected links; keep a single README for the mockup collection.
- Record the prototype revision used for comparison. Resolve implementation/specification differences or record them as follow-up work; mockup updates must not silently change agreed behavior.
- Refresh applicable published GitHub issues and their diagrams/PlantUML code and server-rendered preview URLs; verify source parity, links, and rendering. This issue is required to close the phase.

Dependencies: P1-02, P1-04, P1-06, P1-08, P1-10, P1-11.

## Phase 2 — vocabulary

### P2-01: Review vocabulary renderer composition and answer contracts

GitHub: [#21](https://github.com/bastian-schnitzler/lesson_prototype/issues/21).

Milestone: **Phase 2**.

Scope: derive common vocabulary item presentation, target references, audio/gender handling, typing comparison, and grading from the shared host.

Acceptance:

- Shared components serve actual common behavior without hiding interaction differences.
- Non-nouns, plural targets, translations with multiple valid answers, and article exceptions have explicit content-driven policies; large inventories use smaller groups within the same six-stage lesson.
- Six-stage completion and scored/unscored roles match the agreed requirements.

Dependencies: P1-12.

### P2-02: Implement vocabulary introduction, flashcards, and matching

GitHub: [#22](https://github.com/bastian-schnitzler/lesson_prototype/issues/22).

Milestone: **Phase 2**.

Scope: target introduction, native-front/French-back flashcards, and grouped native/French matching.

Acceptance:

- Introduction/flashcard back show translation, French pronunciation control, and applicable gender.
- Flashcard front does not expose the target answer; review progress persists.
- Matching shuffles sides independently, supports pointer/keyboard use, and scores locked pairs on Continue with visual feedback before confirmation.
- Displayed target forms preserve the agreed article/gender rules.
- Checks cover repeated display text, shuffled identity, audio availability, and completion transitions.

Dependencies: P2-01.

### P2-03: Implement noun-gender overview, typed gaps, and translation exam

GitHub: [#23](https://github.com/bastian-schnitzler/lesson_prototype/issues/23).

Milestone: **Phase 2**.

Scope: all-target noun-gender select exercise integrated into the reviewed overview, typed gaps with four noninteractive reference choices, P1-11 listening choice in stage 5, timed translation and listening-dictation exam, and final-results menu integration.

Acceptance:

- All vocabulary appears on one stage-4 page; nouns have unanswered gender select boxes, non-nouns have none. Hide noun articles/gender/audio clues while answering.
- Continue locks/scores noun choices once; the same page reveals the full overview with learner/correct genders, right/wrong states, translations/audio, and generated explanations for errors. A second Continue advances.
- Noun-gender units contribute to the existing 35% practice share, appear in final-results review, and are excluded when no nouns apply; non-noun lessons retain plain overview.
- Gap choices cannot be selected; the learner types the article-free answer. Listening-choice pages from P1-11 appear in stage 5 and listening-dictation pages in the exam where the brief plans them, including the no-voice help/skip path.
- Noun exam prompts require accepted full forms including applicable indefinite articles; other target forms follow their explicit policy.
- Practice Continue locks the answer, displays correctness, the correct form, and its pre-generated explanation when needed, then confirms/advances without a separate Check action.
- Each exam page uses its brief-defined countdown and hides gender, French audio, answer corrections, and live exam-score changes until the full exam completes.
- Final results default to exam task/learner/correct answers; a button menu offers previous exercise results including Gender; free-text accents/case-only errors receive 50% under the common scorer.

Dependencies: P2-02.

### P2-04: Integrate complete vocabulary sessions and end-to-end validation

GitHub: [#24](https://github.com/bastian-schnitzler/lesson_prototype/issues/24).

Milestone: **Phase 2**.

Scope: wire all six stages for the ten sample vocabulary lessons, verify realistic complete sessions, then generate, validate and make playable the remaining 38 fr/A1 vocabulary lessons (D44).

Acceptance:

- Every approved sample vocabulary lesson can complete all six stages and show accurate scores.
- End-to-end tests cover noun/non-noun lessons, large-inventory groups, noun-gender selectors/review, correction explanations, results menu, transient last-try score reset, practice confirmation, half credit, weighted progress, timed exam/timeout, deferred results, reload/resume, and restart.
- No reference-choice clicking, exam answer leaks, or false gender tags occur.
- All 48 vocabulary lessons have valid playable content with current hashes. Pedagogical review samples different themes, large inventories, and listening-heavy intents; resolve flagged generation issues.
- Rebuild/deploy the updated static content and verify representative Pages journeys.

Dependencies: P2-03, P1-02.

### P2-05: Update vocabulary lesson mockups from the prototype

GitHub: [#25](https://github.com/bastian-schnitzler/lesson_prototype/issues/25).

Milestone: **Phase 2**.

Scope: improve the vocabulary start page, all six stages, listening choice/dictation and no-voice help, feedback, timed exam, and results Salt mockups using the pages actually created in the prototype at the end of this phase.

Acceptance:

- Inspect the running prototype's vocabulary start page, all six stages, feedback, timed exam, and results, including relevant responsive layouts and representative ready, answer, feedback, or error states.
- Update the applicable editable `.puml` sources to reflect the implemented layout, controls, content, and behavior while preserving the agreed shared dark design.
- Run `make mockups-sync` and `make mockups-check` to refresh and verify matching Markdown PlantUML code. Inspect the automatic previews against the actual prototype; keep only .puml sources in the mockup folder.
- Update the root mockup README, SPEC references, issue asset mappings, and all affected links; keep a single README for the mockup collection.
- Record the prototype revision used for comparison. Resolve implementation/specification differences or record them as follow-up work; mockup updates must not silently change agreed behavior.
- Refresh applicable published GitHub issues and their diagrams/PlantUML code and server-rendered preview URLs; verify source parity, links, and rendering. This issue is required to close the phase.

Dependencies: P2-04.

## Phase 3 — grammar

### P3-01: Review grammar renderer composition and mixed exam support

GitHub: [#26](https://github.com/bastian-schnitzler/lesson_prototype/issues/26).

Milestone: **Phase 3**.

Scope: validate grammar exercise contracts and shared controls using conjugation, article, adverb, and syntax samples.

Acceptance:

- All six practice types fit the host/result model.
- Exam containers can mix typed gaps, typed pronoun forms, and word order without separate grading rules.
- Duplicate form text, alternative valid forms/orders, rule coverage, and item-level correction feedback are supported.
- Pronoun matching/typing is selected only for appropriate objectives.

Dependencies: P1-10, P2-05.

### P3-02: Implement pronoun/form matching and typing with tests

GitHub: [#27](https://github.com/bastian-schnitzler/lesson_prototype/issues/27).

Milestone: **Phase 3**.

Scope: drag/drop or click/keyboard assignment to pronoun rows and exact typing of forms.

Acceptance:

- Generated pronoun rows and form inventories render correctly without hardcoded six-row assumptions.
- Duplicate equivalent forms and shared valid answers grade by grammatical validity.
- Partial credit is per row; first submissions remain immutable.
- Tests cover reassignment, missing rows, repeated forms, valid alternatives, and typed normalization.

Dependencies: P3-01.

### P3-03: Implement multiple-choice gaps and exact-typing phrase gaps

GitHub: [#28](https://github.com/bastian-schnitzler/lesson_prototype/issues/28).

Milestone: **Phase 3**.

Scope: four-choice grammar sentence gaps and typed missing-text exercises with optional practice hints.

Acceptance:

- Four unique choices shuffle without changing answer identity.
- Typed gaps support content-defined accepted answers and hints.
- Common three-way text scorers/result records work in practice and exam roles; Continue confirmation and delayed exam feedback follow the shared host.
- Checks cover accent-sensitive answers, blank responses, answer reveal policy, and scoring.

Dependencies: P3-01.

### P3-04: Implement word order and grammar error spotter

GitHub: [#29](https://github.com/bastian-schnitzler/lesson_prototype/issues/29).

Milestone: **Phase 3**.

Scope: token-based sentence ordering and error selection followed by correction.

Acceptance:

- Word order supports pointer/touch/keyboard reordering, repeated tokens, punctuation, and valid alternative sequences.
- Error spotter accepts the intended token and correction according to content.
- Whole-sentence scoring and rule-level error tags feed shared results.
- Tests cover duplicate words, alternative order, detection without correct repair, and accessible operation.

Dependencies: P3-01.

### P3-05: Implement production-feedback placeholder, timed mixed exams, and answer review

GitHub: [#30](https://github.com/bastian-schnitzler/lesson_prototype/issues/30).

Milestone: **Phase 3**.

Scope: an unscored production-feedback placeholder after teaching blocks, followed by brief-timed mixed exam pages and final results with an exam/practice review menu.

Acceptance:

- The screen displays the fixed placeholder in the selected interface language (en: “Individual feedback would be here on production.”; fr/de per SPEC section 7) and a Continue to final exam action.
- It appears after the last teaching block for all grammar sessions, adds no score, and requires no individual analysis or runtime Gemini call.
- Exam covers taught rule IDs with fresh content and appropriate interaction types.
- Practice hints/corrections and running score changes do not leak exam correctness; each page has its brief-defined countdown.
- After the complete exam, show every task, original learner answer, correct answer, correctness/half-credit class, and timeout markers on final results, selected by default with a button menu for previous exercise results.
- Mixed exam scores aggregate once and appear correctly in final results, with earlier grammar exercises available through the menu.
- Tests cover placeholder sequencing, unscored progression, mixed-type timed exams, half credit, expiry, and deferred answer review.

Dependencies: P3-02, P3-03, P3-04.

### P3-06: Complete all grammar lessons and end-to-end course validation

GitHub: [#31](https://github.com/bastian-schnitzler/lesson_prototype/issues/31).

Milestone: **Phase 3**.

Scope: integrate explanation/practice blocks, correction explanations, production placeholder, timed exam, and final-results menu; generate/validate the remaining grammar content for the 48-entry outline.

Acceptance:

- All 48 grammar lessons have valid playable content, appropriate 2–4 blocks, and complete exam coverage.
- Audit all artifacts for supported renderer types, valid IDs/references/answers, and current hashes.
- Pedagogical review samples different topics and irregular forms; resolve flagged generation issues.
- End-to-end tests cover conjugation, article/gap, syntax/word-order, the production placeholder, practice confirmation, weighted progress, timed mixed exam, post-exam review, deadline persistence, and accurate final scores.
- Rebuild/deploy the updated static content and verify representative Pages journeys.

Dependencies: P3-05, P1-02.

### P3-07: Update grammar lesson mockups from the prototype

GitHub: [#32](https://github.com/bastian-schnitzler/lesson_prototype/issues/32).

Milestone: **Phase 3**.

Scope: improve the grammar start page, teaching blocks, six exercise types, feedback placeholder, timed mixed exam, and results Salt mockups using the pages actually created in the prototype at the end of this phase.

Acceptance:

- Inspect the running prototype's grammar start page, teaching blocks, six exercise types, feedback placeholder, timed mixed exam, and results, including relevant responsive layouts and representative ready, answer, feedback, or error states.
- Update the applicable editable `.puml` sources to reflect the implemented layout, controls, content, and behavior while preserving the agreed shared dark design.
- Run `make mockups-sync` and `make mockups-check` to refresh and verify matching Markdown PlantUML code. Inspect the automatic previews against the actual prototype; keep only .puml sources in the mockup folder.
- Update the root mockup README, SPEC references, issue asset mappings, and all affected links; keep a single README for the mockup collection.
- Record the prototype revision used for comparison. Resolve implementation/specification differences or record them as follow-up work; mockup updates must not silently change agreed behavior.
- Refresh applicable published GitHub issues and their diagrams/PlantUML code and server-rendered preview URLs; verify source parity, links, and rendering. This issue is required to close the phase.

Dependencies: P3-06.

## Phase 4 — functions (requirements pending)

### P4-01: Define functions requirements and implementation backlog

GitHub: [#33](https://github.com/bastian-schnitzler/lesson_prototype/issues/33).

Milestone: **Phase 4**.

Scope: agree lesson sequence, communicative goals, dialogue/exercise types, audio, grading, feedback, exam, and content review criteria for the 14 function outlines.

Acceptance:

- User-reviewed function requirements and Salt mockups are added to SPEC.
- Plan Makefile updates for generation, build, tests/e2e, and mockup synchronization; enable the existing single-ID/batch generation targets for the category only after its implementation is available.
- Brief/content schemas and shared-host extensions are planned.
- Create separate issues for generation, interaction implementation, reviewed content, and end-to-end validation only after this review.

Dependencies: function requirements from the user; P1 shared architecture. Category implementation begins after phase 3 under the requested roadmap.

### P4-02: Update function lesson mockups from the prototype

GitHub: [#34](https://github.com/bastian-schnitzler/lesson_prototype/issues/34).

Milestone: **Phase 4**.

Scope: improve the function lesson pages agreed during the requirements review Salt mockups using the pages actually created in the prototype at the end of this phase.

Acceptance:

- Inspect the running prototype's function lesson pages agreed during the requirements review, including relevant responsive layouts and representative ready, answer, feedback, or error states.
- Update the applicable editable `.puml` sources to reflect the implemented layout, controls, content, and behavior while preserving the agreed shared dark design.
- Run `make mockups-sync` and `make mockups-check` to refresh and verify matching Markdown PlantUML code. Inspect the automatic previews against the actual prototype; keep only .puml sources in the mockup folder.
- Update the root mockup README, SPEC references, issue asset mappings, and all affected links; keep a single README for the mockup collection.
- Record the prototype revision used for comparison. Resolve implementation/specification differences or record them as follow-up work; mockup updates must not silently change agreed behavior.
- Refresh applicable published GitHub issues and their diagrams/PlantUML code and server-rendered preview URLs; verify source parity, links, and rendering. This issue is required to close the phase.
- Keep this task deferred until category requirements and implementation are complete; add concrete screens and dependencies after the requirements review.

Dependencies: P4-01 and the future function implementation/content/end-to-end issues.

## Phase 5 — reading (requirements pending)

### P5-01: Define reading requirements and implementation backlog

GitHub: [#35](https://github.com/bastian-schnitzler/lesson_prototype/issues/35).

Milestone: **Phase 5**.

Scope: agree passage presentation, question sequence, comprehension interactions, passage visibility during assessment, audio, grading, feedback, and exam for the 10 reading outlines.

Acceptance:

- User-reviewed reading requirements and Salt mockups are added to SPEC.
- Plan Makefile updates for generation, build, tests/e2e, and mockup synchronization; enable the existing single-ID/batch generation targets for the category only after its implementation is available.
- Brief/content schemas and shared-host extensions are planned.
- Create separate generation, renderer, reviewed content, and end-to-end issues after review.

Dependencies: reading requirements from the user; P1 shared architecture. Phase 5 follows phase 4 under the proposed allocation.

### P5-02: Update reading lesson mockups from the prototype

GitHub: [#36](https://github.com/bastian-schnitzler/lesson_prototype/issues/36).

Milestone: **Phase 5**.

Scope: improve the reading lesson pages agreed during the requirements review Salt mockups using the pages actually created in the prototype at the end of this phase.

Acceptance:

- Inspect the running prototype's reading lesson pages agreed during the requirements review, including relevant responsive layouts and representative ready, answer, feedback, or error states.
- Update the applicable editable `.puml` sources to reflect the implemented layout, controls, content, and behavior while preserving the agreed shared dark design.
- Run `make mockups-sync` and `make mockups-check` to refresh and verify matching Markdown PlantUML code. Inspect the automatic previews against the actual prototype; keep only .puml sources in the mockup folder.
- Update the root mockup README, SPEC references, issue asset mappings, and all affected links; keep a single README for the mockup collection.
- Record the prototype revision used for comparison. Resolve implementation/specification differences or record them as follow-up work; mockup updates must not silently change agreed behavior.
- Refresh applicable published GitHub issues and their diagrams/PlantUML code and server-rendered preview URLs; verify source parity, links, and rendering. This issue is required to close the phase.
- Keep this task deferred until category requirements and implementation are complete; add concrete screens and dependencies after the requirements review.

Dependencies: P5-01 and the future reading implementation/content/end-to-end issues.

## Assets to include when publishing applicable issues

Use fenced Mermaid and applicable fenced PlantUML source directly in GitHub bodies. Add server-rendered image URLs for PlantUML display on GitHub and link the editable .puml at the agreed spec commit. Keep Markdown copies identical to their source; no PNG/SVG exports are committed in the mockup folder. Include the applicable committed [screenshot references R1–R5](SPEC.md#screenshot-reference-register) with visual implementation issues: R1/R2 for the index and artifact views, R2/R3 for starts, R4 for exercise/exam layouts, and R5 for result pages. Link to the original images under docs/design-references/ and pin references to the agreed spec commit. This table identifies relevant assets, not extra implementation tasks.

| Issues | Mermaid flow | Mockups |
| --- | --- | --- |
| P1-01 | Static browser discovery, SPEC section 3 | [Index](mockups/01-lesson-overview/index/lesson-index.puml), [vocabulary artifacts](mockups/02-artifact-view/vocabulary/lesson-detail.puml), [grammar artifacts](mockups/02-artifact-view/grammar/lesson-detail.puml), [initial JSON tree](mockups/02-artifact-view/raw-json/json-tree.puml), [expanded JSON tree](mockups/02-artifact-view/raw-json/json-tree-expanded.puml) |
| P1-05, P1-07 | Offline authoring, SPEC section 3 | Category artifact views where generated files are reviewed |
| P1-06, P1-08 | Artifact validation/generation, SPEC section 3 | [Vocabulary artifacts](mockups/02-artifact-view/vocabulary/lesson-detail.puml), [grammar artifacts](mockups/02-artifact-view/grammar/lesson-detail.puml), [initial JSON tree](mockups/02-artifact-view/raw-json/json-tree.puml), [expanded JSON tree](mockups/02-artifact-view/raw-json/json-tree-expanded.puml) |
| P1-09, P1-10 | Session lock/confirm and exam/results, SPEC section 5 | [Practice](mockups/03-vocabulary-lesson/06-typed-gaps/answer.puml), [correction](mockups/03-vocabulary-lesson/06-typed-gaps/feedback.puml), [exam](mockups/03-vocabulary-lesson/07-exam/exam-page.puml), [final results](mockups/03-vocabulary-lesson/08-results/exam-results.puml) |
| P1-11 | Vocabulary progression and listening, SPEC section 6 | [Listening choice](mockups/03-vocabulary-lesson/06-listening/listening-choice.puml), [no-voice help](mockups/03-vocabulary-lesson/06-listening/no-voice-help.puml), [listening dictation](mockups/03-vocabulary-lesson/07-exam/listening-dictation.puml) |
| P2-02 | Vocabulary progression, SPEC section 6 | [Introduction](mockups/03-vocabulary-lesson/02-introduction/introduction.puml), [flashcard](mockups/03-vocabulary-lesson/03-flashcards/front.puml), [revealed card](mockups/03-vocabulary-lesson/03-flashcards/revealed.puml), [matching](mockups/03-vocabulary-lesson/04-matching/matching.puml) |
| P2-03, P2-04 | Vocabulary progression, SPEC section 6; shared session flow, section 5 | [Gender exercise](mockups/03-vocabulary-lesson/05-gender-overview/gender-select.puml), [reviewed overview](mockups/03-vocabulary-lesson/05-gender-overview/reviewed-overview.puml), [previous results](mockups/03-vocabulary-lesson/08-results/gender-results.puml), [listening choice](mockups/03-vocabulary-lesson/06-listening/listening-choice.puml), [listening dictation](mockups/03-vocabulary-lesson/07-exam/listening-dictation.puml); relevant stage 05/06 screens |
| P3-02 | Grammar blocks, SPEC section 7; practice flow, section 5 | [Pronoun matching](mockups/04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.puml), [pronoun typing](mockups/04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.puml) |
| P3-03 | Grammar blocks, SPEC section 7; practice flow, section 5 | [Choice gap](mockups/04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.puml), [typed gap](mockups/04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.puml), [feedback](mockups/04-grammar-lesson/02-04-exercise-gap-typing/feedback.puml) |
| P3-04 | Grammar blocks, SPEC section 7 | [Word order](mockups/04-grammar-lesson/02-05-exercise-word-order/word-order.puml), [error spotter](mockups/04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.puml) |
| P3-05, P3-06 | Grammar blocks, placeholder, exam/results, SPEC section 7 | [Placeholder](mockups/04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.puml), [mixed exam](mockups/04-grammar-lesson/04-exam/mixed-exam.puml), [grammar results](mockups/04-grammar-lesson/05-results/exam-results.puml) |

The phase-closing issues P1-12, P2-05, and P3-07 include before/after source changes and PlantUML-enabled previews for their respective index/artifact, vocabulary, and grammar screens from the [root mockup guide](mockups/README.md). P4-02 and P5-02 receive category-specific assets when those pages exist. The Claude review issue P0-02 uses the specification's applicable flows and mockups as review inputs.

Browse sources and embedded SPEC previews using the [organized mockup guide](mockups/README.md). Keep applicable diagrams and rendered mockups in published issue bodies, not only in the linked specification.
