# Proposed GitHub issues

Status: draft backlog for [SPEC.md](SPEC.md), version 0.14. Target repository: `bastian-schnitzler/lesson_prototype`.

These are issue bodies ready for refinement; they have not yet been published. Publish after the phase 0 specification review, replacing logical dependency IDs with actual GitHub issue links. Check for existing equivalents before creating issues. Each issue should link to the agreed specification version/commit and retain its acceptance criteria. Phase identifiers in titles provide organization without requiring repository labels or milestones to exist.

## Ongoing GitHub synchronization

Once these issues are published, every change to `docs/SPEC.md` or `docs/ISSUES.md` must also refresh GitHub issues in the same change workflow. Update affected titles, scope, acceptance criteria, dependencies, Mermaid diagrams, and mockup assets, and refresh specification version/commit links across the published backlog. Preserve issue numbers/URLs and record mappings for new issues. Verify the remote updates before reporting the change complete; explicitly report pending synchronization if GitHub access is unavailable. See [the specification's synchronization rule](SPEC.md#keep-github-issues-synchronized).

## Branch naming

Use `phase<phase-number>-issue<GitHub-issue-number>-<short-description>`, matching the current `phase0-issue0-create-spec` branch. Descriptions use lowercase words separated by hyphens. After publication, use each issue's actual GitHub number rather than its logical draft ID (`P1-01`, etc.). An illustrative phase 1 branch is `phase1-issue12-build-lesson-index`. Keep the existing phase 0 specification branch's bootstrap number 0.

## Phase 0 — specification and issue creation

### P0-01 — Refine the lesson prototype specification

Problem: the draft schemas and runtime/hosting requirements do not yet form an agreed implementation contract.

Scope: refine `docs/SPEC.md` with the user in several iterations, retain Mermaid flows and PlantUML Salt mockups, and record the final decisions.

Acceptance:

- Record the confirmed requirements source, Pages entry point, offline generation, English native language, 65% exam / 35% practice weights, 50% accent/case-only credit, browser speech, and production-feedback placeholder; review filters and persistence.
- Record the confirmed larger-inventory/longer-duration exceptions, ordinary vocabulary average near 12, around 8 for demanding lessons, and mixed difficulty within each topic where possible.
- Agree phases 0–5 and the content review gates.
- Remove provisional assumptions or identify expressly deferred scope.

Dependencies: none.

### P0-02 — Publish the agreed specification as a GitHub issue backlog

Scope: create the agreed phase 0–3 issues and phase 4/5 requirements placeholders in the repository; link specification and dependencies.

Acceptance:

- Existing issues are checked to avoid duplication.
- Every implementation issue has scope, acceptance criteria, phase, and dependencies.
- Document the agreed branch naming pattern and map draft IDs to actual issue numbers; work branches use `phase<no>-issue<GitHub-no>-<short-description>`.
- The specification and this index link to actual issue URLs.
- After publication, every subsequent SPEC.md/ISSUES.md change refreshes the GitHub backlog and its specification references; affected scope, acceptance criteria, dependencies, diagrams, and mockups match the latest specification.
- Remote issue updates and links are verified as part of completing each documentation change; any blocked synchronization is reported explicitly.
- Relevant issue bodies include fenced Mermaid flows and embedded rendered Salt mockups, with editable source links pinned to the spec commit; verify rendering on GitHub and use repository/attachment URLs, never local paths.
- Functions/reading implementation remains blocked on requirements instead of speculative exercise definitions.

Dependencies: P0-01.

## Phase 1 — skeleton and general application

### P1-01 — Build React skeleton and ordered lesson index

Scope: initialize the React/TypeScript module app, shared visual tokens, outline loading, hash routing, and four category filters.

Acceptance:

- All 120 outline entries appear in original order with stable 1-based ordinals and `workingTitle`.
- Voc/Grammar/Reading/Function buttons follow the agreed filter behavior; empty/error/loading states work.
- Each row has exactly one Content button labeled Outline, Draft, or Content for the highest artifact available to the combined detail page; Actions has only Start lesson and only when outline/draft/content are valid, current, and supported.
- Score on last try starts blank, updates to the latest completed weighted total (including zero), survives app navigation, and clears on full reload; it is never hydrated from browser storage.
- The combined detail page renders the shared `OutlineSummary` for every category, showing the original title/intent, ordinal, category, language/level, and topic/theme. Its header contains Lesson overview and Start lesson when available.
- A typed component registry provides category-specific Draft/Content views as implemented in P1-05/P1-07. Cards, tables, and previews are the primary interface; optional raw JSON is collapsed. Missing/invalid artifacts remain inspectable with readiness explanations.
- The browser reads static files only; no generation controls, generating states, or generation animations appear.
- Functions/reading show pending requirements and do not generate content.
- Responsive layout, labeled actions, and visible focus are present. All pages use the same results-inspired dark background, light text, muted labels, subtle slate dividers/surfaces, and indigo controls. Shared design tokens also define green correct answers, red errors, and amber accent/case-only credit across practice, review, and results.

Dependencies: P0-02.

### P1-02 — Build dist output and verify GitHub Pages deployment

Scope: reproducible build, content copying/manifest, project base path, CI validation, and Pages deployment workflow.

Acceptance:

- `npm run build` produces `dist/index.html` as the Pages entry point, module assets, outline, generated content, and derived availability manifest; React reads the deployed JSON files.
- Deployed assets/content resolve under the repository Pages path; hash routes refresh correctly.
- Verify actual Pages settings and record the working URL with an HTTP smoke check.
- Missing content produces a clear state in the static demo.
- `.env` and generator secrets are absent from deployment output.

Dependencies: P1-01. Extend deployment checks with sample artifacts after P1-05/P1-07.

### P1-03 — Define executable vocabulary/grammar briefs and lesson schemas

Scope: redesign `LessonBriefSchema` as category-specific contracts; add renderable lesson/item contracts and resolve shared imports.

Acceptance:

- Vocabulary planning includes bilingual targets, word class, gender/number/article applicability, exam forms, contexts, and six-stage coverage; count/difficulty rationale follows the agreed average near 12, around 8 for demanding lessons, and mixed difficulty. Explicit counts support full inventories beyond 15/32, grouping, and longer duration estimates where needed.
- Grammar planning includes 2–4 teaching blocks, rule references, targeted exercise plans, the fixed production-feedback placeholder stage, and mixed exam blueprint; no individualized feedback-analysis catalogue is required.
- Every scored answer unit has a required pre-generated short English explanation of why its correct answer is right, including accent/case and noun-gender corrections.
- Orthography correction explanations name the actual mark: French accent aigu/grave/circonflexe, cédille, or tréma as applicable. Avoid character-only wording such as “written with é”; future German feedback uses “written with umlaut ä/ö/ü.” Apply this consistently to practice, results, and artifact previews during prompt design and content review.
- Vocabulary noun-gender selectors and reviewed overview are a scored stage-4 interaction with conditional applicability and preserved row results.
- Content schemas model ordered payloads, six grammar interaction types, vocabulary interactions, and mixed exams; concrete pages have positive estimated durations, and each exam page has its brief-defined positive time limit.
- Typed answer outcomes distinguish fully correct, accent/case-only (half credit), incorrect, and unanswered while preserving the original response.
- Strict validation enforces outline metadata, unique IDs, reference integrity, answer validity, and category sequence.
- Missing `language.ts` is resolved; shared enums are reused without retaining competing active contracts.
- Fixtures demonstrate normal noun vocabulary, non-noun targets, conjugation grammar, and non-conjugation grammar.

Dependencies: P0-02.

### P1-04 — Implement offline Gemini brief generation and environment setup

Scope: offline CLI generator, `.env.example`, Gemini structured-output adapter, category brief prompts, validation, and file writes. No browser generation endpoint.

Acceptance:

- Model and API key are read from local `.env`; the example contains placeholders and `.env` is ignored.
- Outline-selected IDs determine canonical `content/briefs/<id>.json` paths.
- Generated responses pass structural, Zod, and semantic validation before atomic save.
- Valid existing briefs are reused; stale/invalid artifacts have explicit errors/regeneration actions.
- Bounded retries, CLI diagnostics, per-ID deduplication, provenance, and outline hashes work.
- Fake-adapter tests verify success, reuse, malformed output, repair exhaustion, and safe failure.

Dependencies: P1-03.

### P1-05 — Generate first-ten category briefs and extend the combined detail page

Scope: generate the first ten grammar and first ten vocabulary briefs in outline order; add `VocabularyBriefView` and `GrammarBriefView` to the existing combined detail page, using typed React cards, tables, and lesson-plan components.

Acceptance:

- The exact twenty IDs in SPEC section 9 have valid individual brief files.
- Vocabulary Draft renders objective/duration, target inventory with translations and applicable gender/articles, difficulty balance/count rationale, six-stage plan, and individual exam-page limits.
- Grammar Draft renders objective/coverage, 2–4 teaching blocks with rules, examples, pitfalls and exercise plans, plus mixed-exam coverage and individual page limits.
- Both use the same Outline component and header; complete arrays remain browsable. Review is usable with raw JSON collapsed, with category-specific mockups matching SPEC section 8.
- Invalid/missing files have distinct states; rebuilding the manifest after offline generation updates Content labels and Start availability.
- Present concrete samples to the user and record review changes and acceptance before content generation; check target counts, the ordinary average excluding exceptions, and the balance of easier/harder targets within each topic.

Dependencies: P1-01, P1-04.

### P1-06 — Implement offline lesson content generation and validation

Scope: category-specific content prompts/schemas, validated lesson saves, and offline CLI brief-to-lesson preparation for single IDs and ordered batches.

Acceptance:

- Content generation uses outline plus validated brief and the content schema for the selected category.
- Save to `content/lessons/<id>.json`; validate step order, references, coverage, answer keys, provenance hashes, page-duration estimates, and preservation of the brief's exam time limits.
- Both existing stages avoid model calls; missing brief is prepared before content.
- Content failure preserves a valid brief; retry resumes the failed stage.
- CLI failures handle invalid/stale files, model/network errors, and exhausted retries explicitly.
- No lesson starts with invalid content or unsupported renderers; browser readiness errors do not call Gemini or a generator endpoint.

Dependencies: P1-04, P1-05 brief review gate.

### P1-07 — Generate first-ten category lessons and extend combined content review

Scope: generate twenty sample lesson files from approved briefs and add `VocabularyContentView` and `GrammarContentView` to the combined detail page, alongside the shared Outline and category-specific Draft views.

Acceptance:

- All twenty sample IDs have validated briefs and lessons with current input hashes.
- Vocabulary Content uses ordered stage cards, flashcard sides, matching pairs, noun-gender/overview tables, gap prompts with reference words, and translation-exam previews.
- Grammar Content uses explanation/form-table cards and previews for all six exercise types, the production-feedback placeholder, and the mixed exam.
- Both expose every generated prompt, accepted answer, point unit, explanation, page-duration estimate, and countdown limit using semantic HTML; raw JSON stays optional. Only Lesson overview and eligible Start lesson appear in header navigation.
- Previews are read-only: no attempt creation, scoring, running countdown, or active-session mutations. These phase 1 review components work before phase 2/3 interactive renderers; shared presentation can be reused later.
- User review checks pedagogy, A1 suitability, full intent coverage, duration, and grading ambiguity.
- Accepted changes are reflected in schemas/prompts and regenerated affected samples before expansion.

Dependencies: P1-01, P1-06.

### P1-08 — Build session host, progress, single Continue flow, timed exams, and results

Scope: start/resume page, session schema/reducer, exercise shell/renderer registry, persistence, duration-weighted progress/live score header, practice confirmation/explanations, timed exams, final exam/practice results menu, and ephemeral index last-try scores.

Acceptance:

- Readiness-validated Start leads to a start/resume page, then sequential pages hosted by typed renderers; browser generation is absent.
- Shared session supports unscored screens, multi-unit tasks, and mixed exam items.
- Continue locks practice answers and shows visual feedback/correct answers and pre-generated explanations; a second Continue confirms and advances, with no Check button or required correction retry. Locked points are immutable.
- Typing earns 1 for fully correct accents/case, 0.5 for accent/case-only errors, and 0 for incorrect/unanswered; totals apply **35% practice / 65% exam** once.
- Header progress weights completed concrete pages by estimated duration, without double-counting containers; show accumulated weighted credit against 100 possible points.
- Exam countdowns use each brief-defined page limit, persist absolute deadlines, submit drafts or unanswered units at expiry, and handle timeout/Continue races once.
- Per-answer exam feedback and score changes are hidden until the entire exam finishes; then show every task, original learner answer, correct answer, points/classification, and timeout marker on the final results page, with the exam selected by default and a menu to inspect every prior exercise result.
- Final results show each exercise's score, practice aggregate, exam sections/aggregate, applied weights, and weighted total; review-only exercises show completion in the menu.
- Render final exam and selected practice results using the screenshot-style dark flat answer list: icon/prompt, muted answer labels, red incorrect answers, green accepted answers/corrections, thin dividers, and generated correction explanations. Accent/case-only answers have amber half-credit labels; timeout/unanswered status is visible. Avoid repeating an identical correct-answer line.
- Reload/resume, restart, content-hash incompatibility, and storage failure are handled; last-try index scores remain in memory only and reset on full reload without resetting persisted active sessions.
- Results selection preserves immutable responses/scores and never starts exercise timers or changes progress.
- Unit/integration tests cover Continue lock/confirm, half credit, duration-weighted progress, sealed exam scores, fake-clock timeouts/races/reload, and answer review using fixtures; 80% practice and 60% exam produce 67% total regardless of item counts.

Dependencies: P1-01, P1-03. Full preparation integration: P1-06.

### P1-09 — Review shared vocabulary/grammar contracts before category implementation

Scope: assess shared structures against the twenty sample plans and adjust domain/UI contracts before vocabulary work.

Acceptance:

- Confirm the host supports vocabulary stages and grammar blocks/placeholder/mixed exams, timed page plans, weighted progress, single-Continue practice feedback, and final results with an exam/practice review menu.
- Shared matching, typing, token, audio, and result needs are identified with clear ownership.
- Avoid one oversized base class; use composition and pure scorers where appropriate.
- Update schemas/session fixtures and tests for material gaps before phase 2.

Dependencies: P1-07 sample review gate, P1-08.

## Phase 2 — vocabulary

### P2-01 — Review vocabulary renderer composition and answer contracts

Scope: derive common vocabulary item presentation, target references, audio/gender handling, typing comparison, and grading from the shared host.

Acceptance:

- Shared components serve actual common behavior without hiding interaction differences.
- Non-nouns, plural targets, translations with multiple valid answers, and article exceptions have explicit content-driven policies; large inventories use smaller groups within the same six-stage lesson.
- Six-stage completion and scored/unscored roles match the agreed requirements.

Dependencies: P1-09.

### P2-02 — Implement vocabulary introduction, flashcards, and matching

Scope: target introduction, native-front/French-back flashcards, and grouped native/French matching.

Acceptance:

- Introduction/flashcard back show translation, French pronunciation control, and applicable gender.
- Flashcard front does not expose the target answer; review progress persists.
- Matching shuffles sides independently, supports pointer/keyboard use, and scores locked pairs on Continue with visual feedback before confirmation.
- Displayed target forms preserve the agreed article/gender rules.
- Checks cover repeated display text, shuffled identity, audio availability, and completion transitions.

Dependencies: P2-01.

### P2-03 — Implement noun-gender overview, typed gaps, and translation exam

Scope: all-target noun-gender select exercise integrated into the reviewed overview, typed gaps with four noninteractive reference choices, timed translation exam, and final-results menu integration.

Acceptance:

- All vocabulary appears on one stage-4 page; nouns have unanswered gender select boxes, non-nouns have none. Hide noun articles/gender/audio clues while answering.
- Continue locks/scores noun choices once; the same page reveals the full overview with learner/correct genders, right/wrong states, translations/audio, and generated explanations for errors. A second Continue advances.
- Noun-gender units contribute to the existing 35% practice share, appear in final-results review, and are excluded when no nouns apply; non-noun lessons retain plain overview.
- Gap choices cannot be selected; the learner types the article-free answer.
- Noun exam prompts require accepted full forms including applicable indefinite articles; other target forms follow their explicit policy.
- Practice Continue locks the answer, displays correctness, the correct form, and its pre-generated explanation when needed, then confirms/advances without a separate Check action.
- Each exam page uses its brief-defined countdown and hides gender, French audio, answer corrections, and live exam-score changes until the full exam completes.
- Final results default to exam task/learner/correct answers; a button menu offers previous exercise results including Gender; free-text accents/case-only errors receive 50% under the common scorer.

Dependencies: P2-02.

### P2-04 — Integrate complete vocabulary sessions and end-to-end validation

Scope: wire all six stages for the twenty-sample set's ten vocabulary lessons and verify realistic complete sessions.

Acceptance:

- Every approved sample vocabulary lesson can complete all six stages and show accurate scores.
- End-to-end tests cover noun/non-noun lessons, large-inventory groups, noun-gender selectors/review, correction explanations, results menu, transient last-try score reset, practice confirmation, half credit, weighted progress, timed exam/timeout, deferred results, reload/resume, and restart.
- No reference-choice clicking, exam answer leaks, or false gender tags occur.
- Review remaining outline intents for compatibility with the generator; document gaps rather than claiming the full course is covered by ten samples.

Dependencies: P2-03, P1-02.

## Phase 3 — grammar

### P3-01 — Review grammar renderer composition and mixed exam support

Scope: validate grammar exercise contracts and shared controls using conjugation, article, adverb, and syntax samples.

Acceptance:

- All six practice types fit the host/result model.
- Exam containers can mix typed gaps, typed pronoun forms, and word order without separate grading rules.
- Duplicate form text, alternative valid forms/orders, rule coverage, and item-level correction feedback are supported.
- Pronoun matching/typing is selected only for appropriate objectives.

Dependencies: P1-09, P2-04.

### P3-02 — Implement pronoun/form matching and typing with tests

Scope: drag/drop or click/keyboard assignment to pronoun rows and exact typing of forms.

Acceptance:

- Generated pronoun rows and form inventories render correctly without hardcoded six-row assumptions.
- Duplicate equivalent forms and shared valid answers grade by grammatical validity.
- Partial credit is per row; first submissions remain immutable.
- Tests cover reassignment, missing rows, repeated forms, valid alternatives, and typed normalization.

Dependencies: P3-01.

### P3-03 — Implement multiple-choice gaps and exact-typing phrase gaps

Scope: four-choice grammar sentence gaps and typed missing-text exercises with optional practice hints.

Acceptance:

- Four unique choices shuffle without changing answer identity.
- Typed gaps support content-defined accepted answers and hints.
- Common three-way text scorers/result records work in practice and exam roles; Continue confirmation and delayed exam feedback follow the shared host.
- Checks cover accent-sensitive answers, blank responses, answer reveal policy, and scoring.

Dependencies: P3-01.

### P3-04 — Implement word order and grammar error spotter

Scope: token-based sentence ordering and error selection followed by correction.

Acceptance:

- Word order supports pointer/touch/keyboard reordering, repeated tokens, punctuation, and valid alternative sequences.
- Error spotter accepts the intended token and correction according to content.
- Whole-sentence scoring and rule-level error tags feed shared results.
- Tests cover duplicate words, alternative order, detection without correct repair, and accessible operation.

Dependencies: P3-01.

### P3-05 — Implement production-feedback placeholder, timed mixed exams, and answer review

Scope: an unscored production-feedback placeholder after teaching blocks, followed by brief-timed mixed exam pages and final results with an exam/practice review menu.

Acceptance:

- The screen displays “Individual feedback would be here on production.” and a Continue to final exam action.
- It appears after the last teaching block for all grammar sessions, adds no score, and requires no individual analysis or runtime Gemini call.
- Exam covers taught rule IDs with fresh content and appropriate interaction types.
- Practice hints/corrections and running score changes do not leak exam correctness; each page has its brief-defined countdown.
- After the complete exam, show every task, original learner answer, correct answer, correctness/half-credit class, and timeout markers on final results, selected by default with a button menu for previous exercise results.
- Mixed exam scores aggregate once and appear correctly in final results, with earlier grammar exercises available through the menu.
- Tests cover placeholder sequencing, unscored progression, mixed-type timed exams, half credit, expiry, and deferred answer review.

Dependencies: P3-02, P3-03, P3-04.

### P3-06 — Complete all grammar lessons and end-to-end course validation

Scope: integrate explanation/practice blocks, correction explanations, production placeholder, timed exam, and final-results menu; generate/validate the remaining grammar content for the 48-entry outline.

Acceptance:

- All 48 grammar lessons have valid playable content, appropriate 2–4 blocks, and complete exam coverage.
- Audit all artifacts for supported renderer types, valid IDs/references/answers, and current hashes.
- Pedagogical review samples different topics and irregular forms; resolve flagged generation issues.
- End-to-end tests cover conjugation, article/gap, syntax/word-order, the production placeholder, practice confirmation, weighted progress, timed mixed exam, post-exam review, deadline persistence, and accurate final scores.
- Rebuild/deploy the updated static content and verify representative Pages journeys.

Dependencies: P3-05, P1-02.

## Phase 4 — functions (requirements pending)

### P4-01 — Define functions requirements and implementation backlog

Scope: agree lesson sequence, communicative goals, dialogue/exercise types, audio, grading, feedback, exam, and content review criteria for the 14 function outlines.

Acceptance:

- User-reviewed function requirements and Salt mockups are added to SPEC.
- Brief/content schemas and shared-host extensions are planned.
- Create separate issues for generation, interaction implementation, reviewed content, and end-to-end validation only after this review.

Dependencies: function requirements from the user; P1 shared architecture. Category implementation begins after phase 3 under the requested roadmap.

## Phase 5 — reading (requirements pending)

### P5-01 — Define reading requirements and implementation backlog

Scope: agree passage presentation, question sequence, comprehension interactions, passage visibility during assessment, audio, grading, feedback, and exam for the 10 reading outlines.

Acceptance:

- User-reviewed reading requirements and Salt mockups are added to SPEC.
- Brief/content schemas and shared-host extensions are planned.
- Create separate generation, renderer, reviewed content, and end-to-end issues after review.

Dependencies: reading requirements from the user; P1 shared architecture. Phase 5 follows phase 4 under the proposed allocation.

## Assets to include when publishing applicable issues

Use fenced Mermaid directly in the GitHub body. Embed the rendered PNG using a verified repository or attachment URL; link the SVG and editable Salt source at the agreed spec commit. This table identifies relevant assets, not extra implementation tasks.

| Issues | Mermaid flow | Mockups |
| --- | --- | --- |
| P1-01 | Static browser discovery, SPEC section 3 | [Index](mockups/01-lesson-overview/index/lesson-index.png), [vocabulary artifacts](mockups/02-artifact-view/vocabulary/lesson-detail.png), [grammar artifacts](mockups/02-artifact-view/grammar/lesson-detail.png) |
| P1-04, P1-06 | Offline authoring, SPEC section 3 | Category artifact views where generated files are reviewed |
| P1-05, P1-07 | Artifact validation/generation, SPEC section 3 | [Vocabulary artifacts](mockups/02-artifact-view/vocabulary/lesson-detail.png), [grammar artifacts](mockups/02-artifact-view/grammar/lesson-detail.png) |
| P1-08, P1-09 | Session lock/confirm and exam/results, SPEC section 5 | [Practice](mockups/03-vocabulary-lesson/06-typed-gaps/answer.png), [correction](mockups/03-vocabulary-lesson/06-typed-gaps/feedback.png), [exam](mockups/03-vocabulary-lesson/07-exam/exam-page.png), [final results](mockups/03-vocabulary-lesson/08-results/exam-results.png) |
| P2-02 | Vocabulary progression, SPEC section 6 | [Introduction](mockups/03-vocabulary-lesson/02-introduction/introduction.png), [flashcard](mockups/03-vocabulary-lesson/03-flashcards/front.png), [revealed card](mockups/03-vocabulary-lesson/03-flashcards/revealed.png), [matching](mockups/03-vocabulary-lesson/04-matching/matching.png) |
| P2-03, P2-04 | Vocabulary progression, SPEC section 6; shared session flow, section 5 | [Gender exercise](mockups/03-vocabulary-lesson/05-gender-overview/gender-select.png), [reviewed overview](mockups/03-vocabulary-lesson/05-gender-overview/reviewed-overview.png), [previous results](mockups/03-vocabulary-lesson/08-results/gender-results.png); relevant stage 05/06 screens |
| P3-02 | Grammar blocks, SPEC section 7; practice flow, section 5 | [Pronoun matching](mockups/04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match.png), [pronoun typing](mockups/04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing.png) |
| P3-03 | Grammar blocks, SPEC section 7; practice flow, section 5 | [Choice gap](mockups/04-grammar-lesson/02-03-exercise-gap-choice/gap-choice.png), [typed gap](mockups/04-grammar-lesson/02-04-exercise-gap-typing/gap-typing.png), [feedback](mockups/04-grammar-lesson/02-04-exercise-gap-typing/feedback.png) |
| P3-04 | Grammar blocks, SPEC section 7 | [Word order](mockups/04-grammar-lesson/02-05-exercise-word-order/word-order.png), [error spotter](mockups/04-grammar-lesson/02-06-exercise-error-spotter/error-spotter.png) |
| P3-05, P3-06 | Grammar blocks, placeholder, exam/results, SPEC section 7 | [Placeholder](mockups/04-grammar-lesson/03-feedback-placeholder/feedback-placeholder.png), [mixed exam](mockups/04-grammar-lesson/04-exam/mixed-exam.png), [grammar results](mockups/04-grammar-lesson/05-results/exam-results.png) |

Browse sources and SVGs using the [organized mockup guide](mockups/README.md). Keep applicable diagrams and rendered mockups in published issue bodies, not only in the linked specification.
