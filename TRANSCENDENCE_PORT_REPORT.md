# Lesson model port report for ft_transcendence (#117, #135, #83, #136)

Repository `bastian-schnitzler/lesson_prototype`, read on 2026-10-21. Transcendence `main` was read at `66826b5`. Nothing in this repository was changed except this file, which is not committed.

## Summary

1. **Commit to freeze:** `928484d2e65527c1a02341002dfc5f767cf63374`, the tip of `P5-reading-integration`. It is not on `main`; PR #115 is still open. On this commit `make test` passes (699 tests), and so do `make catalog` and `make sample-lessons` (33 lessons valid).
2. **Port size:** 16 source files, 2,506 lines (comments included). zod is the only package they import; no React, DOM or node APIs. The tests are 3 unit test files (525 lines after trimming), the 160 KB fixture folder, and 5 real lessons that the tests read (about 310 KB).
3. **zod 4.4.3 blockers:** none. In a temporary copy using transcendence's toolchain (zod 4.4.3, TypeScript 6.0.3, vitest 4.1.10, the `@ft/tsconfig` CommonJS settings, no `.ts` import extensions), `tsc` is clean, 85 of 85 ported tests pass, and all 33 prototype lessons validate.
4. **Top 3 risks:**
   - **(a)** The length rules are not part of `validateBrief`/`validateContent`. Grammar length lives in two separate functions, and the vocabulary word count (8–9) is not checked anywhere.
   - **(b)** `src/schemas/common.ts` and `outline.ts` export 18 names that `@ft/shared` already exports. A plain copy behind `export *` does not compile, so those files must be rewired, not copied.
   - **(c)** English cannot pass validation today (nouns must have a gender; two "you" pronouns break person boards), and German nouns are not checked at all. #136 blocks every non-French lesson.
5. **Also:** the prototype allows up to 300 characters for `title` and for each `objective` locale, while transcendence's limits are 80 (title) and 200 (summary); the current maximums are 37 and 173. Lessons last 8–17 minutes, while transcendence assumes `LESSON_MINUTES = 10`.

---

## A. The freeze (#117)

### 1. Which commit to port

- **Commit:** `928484d2e65527c1a02341002dfc5f767cf63374` ("Merge pull request #120 … P5-08-issues-sync-count"), branch `P5-reading-integration`.
- `origin/main` (`afcf49b`) is an ancestor of this commit, but it does **not** contain reading (P5-02 to P5-08). Porting `main` would miss `src/schemas/reading.ts`, `src/validation/reading.ts` and `src/domain/readingLesson.ts`.
- Two ways to freeze it:
  - **(a)** Port `928484d` directly.
  - **(b)** Merge PR #115 into `main` and tag the merge commit (for example `lesson-model-v2`). Because `main` is an ancestor, the ported paths in the merge commit would be byte-identical to `928484d`.

  Either way, the tag or the PR merge has to be done by the repository owner. I made no tag, commit or push.
- **Results on `928484d`** (run in this session, clean tree apart from untracked `docs/transcendence/` and `docs/.DS_Store`):
  - `make test`: typecheck, catalog, then vitest: **30 files, 699 tests passed**.
  - `make catalog`: OK, 18 courses.
  - `make sample-lessons`: "All twenty sample lessons …, the three function test lessons and the ten reading test lessons are valid with current input hashes; grammar lessons follow the length rules."
  - `make test-e2e` (Playwright) was **not run**; it doesn't cover the ported files.

### 2. Open work that could still change a schema

Branches not merged into `928484d` that touch `src/schemas`, `src/validation` or `src/domain`:

| Branch | Date | Ported files it touches | Verdict |
|---|---|---|---|
| `origin/P6-01-lesson-sidebar-navigation` (`263c911`) | 2026-10-14 | `schemas/grammar.ts`, `schemas/vocabulary.ts`, `validation/artifacts.ts`, `domain/vocabularyLesson.ts` | Stale: an older form of the sidebar and shorter-lesson work that is already in HEAD (`src/domain/session/outline.ts` exists in HEAD). **Ignore.** |
| `origin/reading-proto` (`b93b976`) | 2026-10-14 | `schemas/reading.ts` (+318), `validation/reading.ts` (+231), others | An earlier reading prototype, replaced by P5-02 (#106, merged). **Ignore.** |
| PR #96 `P6-02-speaker-icon`, PR #97 `P6-02-error-spotter-feedback`, PR #98 `P6-02-visual-grammar-theory` | open | none (`src/session`, CSS, tests, SPEC only) | No schema change. **Ignore.** |

Open issues: #90 (P6-02), #31 (P3-06), #79 (P4-06), #80 (P4-07), and the mockup issues #25, #32, #34, #74. P5-05 (#103) and P5-07 (#105) are closed.

The open items of #90 (`docs/feedback.html`: "Clarification needed" and "Not implemented yet") that could lead to a schema change:

| Item | Topic | Possible schema effect | Transcendence |
|---|---|---|---|
| #28 | Should lessons get longer from A1 to C2, and are 8–9 words enough? | New values for `GRAMMAR_LENGTH` (`src/schemas/grammar.ts:52`), `FUNCTIONS_LIMITS` (`src/schemas/functions.ts:27`), `READING_WORDS` (`src/schemas/reading.ts:36`) and the vocabulary word count (prompt only) | Can ignore: these are constants it owns after the port. Decide lesson length in #83, together with `LESSON_MINUTES` (see E16). |
| #14 | Grammar theory "more visual" | Possibly structured fields on `grammar_explanation`. PR #98 currently only restyles it. | Ignore. Any change would be additive in the prototype, after the freeze. |
| #10 | Typed gap: the accent question in the mother tongue | Possibly a new prompt field on vocabulary targets | Ignore. |
| #18 | A pre-exam feedback step for vocabulary | A new step in the derived vocabulary lesson (`VOCABULARY_STAGES`, `src/domain/vocabularyLesson.ts`), which would change the `estimatedMinutes` that `checkVocabularyBrief` computes | Ignore. If transcendence adopts it later, it must regenerate `estimatedMinutes`. |
| #25 | A listening alternative when the learner can't listen | Possibly an extra exercise text per target | Ignore. |
| #2, #4, #7, #12, #16, #24, #27 | UI | none | Ignore. |

#79 (P4-06) and #31 (P3-06) are about producing lessons, not schemas. **Nothing open needs to be waited for.**

### 3. Are D55 and P4-06 recorded as decided in `docs/SPEC.md`?

**No.** The lines to update:

- `docs/SPEC.md:201` (D55): "**Proposed (P5-07, 2026-10-20; product-owner confirmation pending on #115):** reading lessons are **static files written by hand** … the other 836 reading entries of the outlines … keep no artifacts …". Change "Proposed … pending" to "Confirmed (date)". If transcendence's plan is the decision, add that every other lesson is written in ft_transcendence (#83).
- `docs/SPEC.md:1261` (open points table): "| Generation | **Proposed (P5-07, D55):** hand-written static lessons; …". Mark it decided.
- `docs/SPEC.md:197` (D51): "… Claude first writes three test lessons by hand …; the product owner decides on generation of the remaining eleven after their review." Record the P4-06 decision here.
- `docs/SPEC.md:997` (section 8, "Test lessons first (D51)"): "After their review the product owner decides how the remaining eleven are produced (offline Gemini generation or hand authoring). Until then `make generate` keeps failing explicitly for functions." Same update.
- `docs/SPEC.md:3487` (revision 0.78): "D55 proposed (product-owner confirmation pending)". Add a revision row rather than editing the old one.
- `docs/ISSUES.md`, sections P4-06 (`docs/ISSUES.md:943`) and P5-07 (`docs/ISSUES.md:1112`, whose progress note says "**Open:** the product owner confirms D55").

Related stale text worth fixing in the same change: section 8 still says "bounds 6–10" expressions (`docs/SPEC.md:1047`) and "6–10 expressions" in the review criteria (`docs/SPEC.md:1043`). The schema and D50 say 4–10 (`src/schemas/functions.ts:29-30`, `docs/SPEC.md:196`).

---

## B. The exact port list (#135)

### 4. Files needed, following imports from the three entry points

Walking every `import`/`export … from` transitively from `src/schemas/artifacts.ts`, `src/validation/artifacts.ts` and `src/validation/reading.ts`:

| File | Lines | Imports | Notes |
|---|---|---|---|
| `src/schemas/common.ts` | 63 | zod | Overlaps with transcendence, see B5 |
| `src/schemas/outline.ts` | 56 | zod, common | Overlaps with transcendence, see B5 |
| `src/schemas/artifactCommon.ts` | 104 | zod, common, outline | Envelope, provenance, localized text |
| `src/schemas/artifacts.ts` | 46 | zod (types), common, vocabulary, grammar, functions, reading | Entry point |
| `src/schemas/vocabulary.ts` | 220 | zod, artifactCommon, common | |
| `src/schemas/grammar.ts` | 265 | zod, artifactCommon, common | |
| `src/schemas/functions.ts` | 285 | zod, artifactCommon, common, vocabulary | |
| `src/schemas/reading.ts` | 212 | zod, artifactCommon, common | |
| `src/validation/artifacts.ts` | 697 | zod (types), artifactCommon, artifacts, grammar, outline, vocabulary, functions, domain/richText, domain/vocabularyLesson, domain/functionsLesson, validation/reading | Entry point |
| `src/validation/reading.ts` | 151 | artifactCommon, common, reading, domain/readingLesson, validation/artifacts (type only) | Entry point; type-only cycle with `artifacts.ts`, no runtime cycle |
| `src/domain/richText.ts` | 98 | none | Restricted Markdown (D46) |
| `src/domain/vocabularyLesson.ts` | 106 | artifactCommon, vocabulary (types), lessonCopy, vocabularyAnswers | Derives the vocabulary lesson; needed for its minutes and matching-page checks |
| `src/domain/lessonCopy.ts` | 54 | artifactCommon (type) | en/fr/de step labels and instructions |
| `src/domain/vocabularyAnswers.ts` | 13 | artifactCommon, common (type), vocabulary (type) | Exam answers from `examForms` |
| `src/domain/functionsLesson.ts` | 39 | functions | Page rules |
| `src/domain/readingLesson.ts` | 97 | common (type), reading (type) | Page rules, skim speed |
| **Total** | **2,506** | | **16 files** |

- **React, DOM, node APIs, or packages other than zod: none.** A grep for `window`, `document.`, `localStorage`, `process.`, `node:` and `React` matched only English text in `lessonCopy.ts:50` and a comment in `validation/reading.ts:131`.
- What the code needs at runtime: ES2022 `Array.prototype.at` (`richText.ts:31`, `readingLesson.ts:48`, `validation/artifacts.ts:596`), Unicode property escapes (`\p{L}`, `\p{M}`), and `String.prototype.toLocaleLowerCase('fr')` (`validation/reading.ts:133`, which needs ICU; Node ships full ICU). No `Math.random` and no `Date`.
- **Can be dropped after the port:** `GENERATED_KINDS` / `isGeneratedKind` (`src/schemas/artifacts.ts:21-27`) are about the generator only. `expressionDisplay` / `functionsTerms` (`src/domain/functionsLesson.ts:32-40`) are only used by the player.
- **Two files to read as reference but not port:** `src/catalog/scan.ts:35-58` (`canonicalJson`, `briefInputHash`, `outlineEntryHash`; see C9) and `scripts/catalog.ts:18-20` (`sha256`).

### 5. `common.ts` (and `outline.ts`) compared with what transcendence already has

The comparison is against transcendence `main` at `66826b5`: `packages/shared/src/schemas/{item,lesson,language,locale}.ts`.

| Prototype export | Transcendence equivalent | Same values? | Action |
|---|---|---|---|
| `LOCALES` (`common.ts:6`) | `SUPPORTED_LOCALES` (`locale.ts`) | yes: en, fr, de | Use transcendence's |
| `LocaleSchema`, `Locale` (`common.ts:7-8`; re-exported again at `artifactCommon.ts:104`) | `LocaleSchema`, `Locale` (`locale.ts`) | yes (transcendence adds the error key `profile.invalidLocale`) | Use transcendence's; delete the re-export at `artifactCommon.ts:104` |
| `LanguageSchema` (`common.ts:11`), a two-letter **regex** | `LanguageSchema` (`language.ts`), an **enum** en/fr/de | stricter in transcendence | Use transcendence's. `nativeLocales(lang: string)` and the schema factories take a `string`, so they accept the enum type. |
| `LEVELS`, `LevelSchema`, `Level` (`common.ts:14-16`) | the same names (`item.ts:20-22`) | yes | Use transcendence's |
| `LESSON_KINDS`, `LessonKindSchema`, `LessonKind` (`common.ts:18-20`) | the same names (`lesson.ts`) | same set, **different order** (transcendence: grammar, vocabulary, functions, reading) | Use transcendence's. No ported code depends on the order. |
| `TOPICS`, `TopicSchema`, `Topic` (`common.ts:23-39`) | the same names (`item.ts:29-45`) | yes, the same 13 in the same order | Use transcendence's |
| `THEMES`, `ThemeSchema`, `Theme` (`common.ts:42-59`) | the same names (`lesson.ts`) | yes, the same 14 | Use transcendence's |
| `compareLevels` (`common.ts:61`) | **missing** | n/a | Not needed: only `src/catalog/scan.ts` uses it |
| `LessonIdSchema`, `LESSON_ID_MAX` (`outline.ts:5,9`) | the same names (`lesson.ts`) | transcendence is stricter: the prefix must be `en`, `fr` or `de` | Use transcendence's |
| `LESSON_TITLE_MAX = 80` (`outline.ts:6`) | `LESSON_TITLE_MAX = 80` | yes | Use transcendence's |
| `LESSON_INTENT_MAX = 200` (`outline.ts:7`) | `LESSON_SUMMARY_MAX = 200` | yes | Use transcendence's |
| `OutlineEntrySchema`, `OutlineEntry` (`outline.ts:23,36`) | `LessonOutlineEntrySchema`, `LessonOutlineEntry` | same shape; both check line breaks and invisible characters | Use transcendence's. `OutlineContext.entry` (`validation/artifacts.ts:35`) is typed `OutlineEntry`; retype it as `LessonOutlineEntry`. |
| `OutlineFileSchema`, `OutlineFile` (`outline.ts:38,56`) | `LessonOutlineFileSchema` | same | Use transcendence's. The ported code only uses it as a type. |
| `GenderSchema`, `WORD_CLASSES`, … (in `vocabulary.ts`) | **missing** | n/a | Port |

**Missing in transcendence and needed:** nothing from `common.ts` except possibly `compareLevels`. All of `artifactCommon.ts` and the four kind schemas.

**Collision check:** loading the 16 files next to transcendence's `index.ts` (`export * from './item'`, `'./lesson'`, `'./locale'`, `'./language'`, …) gives 18 duplicate names: `LocaleSchema` (exported twice inside the port too), `Locale`, `LanguageSchema`, `LEVELS`, `LevelSchema`, `Level`, `LESSON_KINDS`, `LessonKindSchema`, `LessonKind`, `TOPICS`, `TopicSchema`, `Topic`, `THEMES`, `ThemeSchema`, `Theme`, `LESSON_ID_MAX`, `LESSON_TITLE_MAX`, `LessonIdSchema`. With `export *`, TypeScript reports TS2308 (an ambiguous re-export). **Recommendation:** don't port `common.ts`/`outline.ts`. Point their importers at the existing modules, and either put the rest under a `lessons/` folder exported by name or export it as a namespace. Generic names such as `chunk`, `COPY`, `Block`, `Inline`, `Issue` and `Issues` will otherwise crowd the barrel.

### 6. Unit tests that cover the ported files

| Test file | Lines | What to keep | What it reads from disk |
|---|---|---|---|
| `tests/unit/artifacts.test.ts` | 316 | Everything except `describe('legacy drafts')` (`:305-316`), which scans the prototype's `src`/`scripts` folders. That leaves 304 lines and 21 validator calls. | `content/outlines/fr-a1.json`; `tests/fixtures/content/briefs/{fr-classroom-objects,fr-classroom-instructions,fr-verb-etre-present,fr-negation-ne-pas,fr-family-members}.json`; `tests/fixtures/content/lessons/{fr-verb-etre-present,fr-negation-ne-pas}.json`; **and the real lessons** `content/{briefs,lessons}/fr-verb-etre-present.json` and `fr-negation-ne-pas.json` (the grammar length tests, `:272-298`) |
| `tests/unit/functions.test.tsx` | 188 | Only `describe('function artifacts')` (`:41-106`). Drop the React imports (`:3`, `:7-9`, `:11-12`) and `afterEach(cleanup)`. Drop `isGeneratedKind` (`:44`) if `GENERATED_KINDS` is not ported. | `content/outlines/fr-a1.json`; **real lessons** `content/{briefs,lessons}/fr-ordering-at-a-cafe.json` and `fr-greetings-and-goodbyes.json` |
| `tests/unit/reading.test.tsx` | 194 | Only `describe('reading artifacts')` (`:41-127`), with the same removals (and `:45` for `isGeneratedKind`). | `content/outlines/fr-a1.json`; **real lesson** `content/{briefs,lessons}/fr-reading-a-text-message.json` |
| `tests/unit/rich-text.test.tsx` | 46 | The first two `it` (`:9-38`, parsing only); the third renders `<RichText>`. | none |

- `vocabularyAnswers.ts` is covered indirectly (`artifacts.test.ts:143`). `lessonCopy.ts` has no test of its own.
- Every other test (contracts, session, the `*-renderers`, `*-course`, content-review, catalog, generator…) exercises the player, the catalog or the generator. Don't port them.
- **Fixtures:**
  - `tests/fixtures/content/` is 160 KB. Copy all of it, because `artifacts.test.ts` reads five of its briefs.
  - `fr-fix-numbers.json` is malformed JSON on purpose (a catalog test fixture). `fr-fix-menu` and `fr-fix-pronouns` are used by the catalog and app tests. These, and `tests/fixtures/content/outlines/{de-a2,fr-b1}.json`, are not needed by the ported tests.
  - **The five real lessons** above (about 312 KB) must go into transcendence **as test fixtures only**, for example `packages/shared/test/fixtures/lessons/`. This doesn't conflict with "no lesson is imported". Change the `ROOT`/`content/` paths in the tests to match.

### 7. zod 4.4.3

zod APIs used by the ported files, with counts: `z.strictObject` (96), `z.array` (73), `z.literal` (48), `z.enum` (33), `z.infer` (30), `z.string` (18), `z.number` (8), `z.discriminatedUnion` (4), `z.ZodType` (3), `z.boolean`, `z.tuple`, `z.iso.datetime`, `z.ZodError` (1 each). Methods: `.min`, `.max`, `.length`, `.int`, `.trim`, `.regex`, `.nullable`, `.optional`, `.refine`, `.superRefine`, `.safeParse`. The tests also use `z.toJSONSchema`.

**None of these is missing from 4.4.3 or behaves differently there.** All of them are zod 4.0 APIs, and transcendence already uses `z.strictObject` and `z.iso.datetime` (`lesson.ts`).

Two behaviours to keep in mind (identical in 4.4.3 and 4.6):
- `.trim()` (`artifactCommon.ts:23`) is a **transform**. `" Titre "` passes, and the *parsed* value is `"Titre"`. Store `result.value`, not the raw file (see E16).
- `schemaIssues` (`validation/artifacts.ts:61-63`) runs `i.path.join('.')`. In zod 4 a path is `PropertyKey[]`; the paths here never contain symbols.

**Test run.** I built a temporary copy outside the repo (`/private/tmp/claude-501/…/scratchpad/port`):
- the 16 files with `.ts` import extensions removed (`sed -E "s/(from '\.[^']*)\.ts'/\1'/"`);
- the trimmed test files from B6, with their fixtures;
- `package.json`: `zod 4.4.3`, `typescript 6.0.3`, `vitest 4.1.10` (transcendence's pins);
- a `tsconfig.json` that reproduces `@ft/tsconfig/base.json` + `library.json`: `target`/`lib` ES2023, `strict`, `module: commonjs`, `isolatedModules`, `declaration`, no `moduleResolution`, so node10 resolution.

Results:
- `tsc -p tsconfig.json`: **0 errors.**
- `vitest run`: **3 files, 85 tests passed.** On the first run 3 tests failed with `ENOENT` until the five real lessons in B6 were copied. That is a fixture-path issue, not a zod one.
- An extra test that validates all 33 prototype lessons (brief, content and grammar length) with the ported code on zod 4.4.3: **33 of 33 passed.**

The prototype itself compiles with TypeScript ^7 and runs vitest ^5; the downgrade to TS 6.0.3 and vitest 4.1.10 also needed no changes.

### 8. The public API transcendence will call

```ts
// src/schemas/artifacts.ts
type SupportedKind = 'vocabulary' | 'grammar' | 'functions' | 'reading';
function isSupportedKind(kind: LessonKind): kind is SupportedKind;                 // :13
function briefSchema(kind: SupportedKind, lang: string): z.ZodType<Brief>;        // :32
function contentSchema(kind: SupportedKind, lang: string): z.ZodType<LessonContent>; // :43
function hasContentFile(kind: LessonKind): boolean;                                // :38, false only for vocabulary
type Brief = VocabularyBrief | GrammarBrief | FunctionsBrief | ReadingBrief;
type LessonContent = VocabularyContent | GrammarContent | FunctionsContent | ReadingContent;

// src/validation/artifacts.ts
interface OutlineContext { entry: OutlineEntry; lang: string; level: string; outlineHash?: string }  // :35
interface ContentContext extends OutlineContext { brief: Brief; briefHash?: string }              // :239
interface Issue { path: string; message: string }                                                // :20
type ArtifactStatus = 'valid' | 'invalid' | 'stale';
interface ValidationResult<T> { status: ArtifactStatus; value?: T; issues: Issue[]; staleReasons: string[] } // :27
function validateBrief(data: unknown, ctx: OutlineContext): ValidationResult<Brief>;              // :220
function validateContent(data: unknown, ctx: ContentContext): ValidationResult<LessonContent>;    // :668
function grammarBriefLengthIssues(b: GrammarBrief): Issue[];                                      // :337
function grammarContentLengthIssues(c: GrammarContent): Issue[];                                  // :351

// src/domain/vocabularyLesson.ts
function vocabularyLesson(brief: VocabularyBrief): VocabularyContent;                             // :47, the derived lesson
```

How they behave:
- `briefSchema`/`contentSchema` are **factories**, because the native-translation maps depend on `lang`: every locale except the course language (`nativeLocales`, `artifactCommon.ts:42`). `contentSchema('vocabulary', lang)` exists, but only describes the derived lesson; `validateContent` rejects a vocabulary content file.
- `validateBrief`/`validateContent`:
  1. First `safeParse`. If zod fails, they return `{ status: 'invalid', issues, staleReasons: [] }` with **no `value`**, and the semantic checks don't run.
  2. If zod succeeds, they run the envelope checks (`checkEnvelope`, `:72`: id, kind, lang, level and topic/theme against the outline) and then the checks for the kind.
  3. If there are issues, `status: 'invalid'` **with** `value` (the parsed object). With none, `'valid'`, or `'stale'` when a hash was passed and differs.
- `validateContent` needs a **parsed, valid** brief in `ctx.brief`: pass `validateBrief(...).value`.
- **Shape of an error:** `{ path, message }`.
  - Schema issues have a dotted zod path, `''` for the root: `targets.3.gap.accepted.answers.0: Too small: expected string to have >=1 characters`.
  - Semantic issues use dotted paths such as `targets.2.examForms`, `steps.4.pages.0.items.1`, `exam.pages.1.ruleIds`, but some are coarse: `steps`, `blocks`, `steps.exam`, `steps.dialogue.lines.3`, `matching.1`, `documents.0.highlights.2`.
- If transcendence passes no `outlineHash`/`briefHash`, the status is never `'stale'`.
- **The grammar length rules are not inside `validateBrief`/`validateContent`.** Call `grammarBriefLengthIssues` and `grammarContentLengthIssues` yourself, as `scripts/sample-lessons.ts`, `scripts/author-grammar.ts:116-120` and the generator do. Otherwise a grammar lesson with 5 exam units passes: the fixture `tests/fixtures/content/briefs/fr-negation-ne-pas.json` is valid but has 5 length issues.

---

## C. What the authoring kit must produce (#83)

### 9. Envelope and `provenance`

Every brief and every content file has these fields (`envelopeShape`, `src/schemas/artifactCommon.ts:84-96`), all required. Every object is `strictObject`, so **unknown keys are rejected**.

| Field | Format | Also checked |
|---|---|---|
| `schemaVersion` | literal `2` | |
| `id` | `^[a-z]{2}-[a-z]+(-[a-z]+)*$`, ≤ 64 characters | equals the outline entry's `id` (`:73`) |
| `kind` | literal for the kind (`'vocabulary'`, …), declared in each kind schema | equals the outline `kind` |
| `lang` | two letters (`common.ts:11`) | equals the course language |
| `level` | `A1`…`C2` | equals the course level |
| `locales` | exactly the tuple `["en","fr","de"]` | |
| `title` | course-language text, trimmed, 1–300 characters (`LearningTextSchema`) | nothing else (see E16) |
| `objective` | `{ en, fr, de }`, each trimmed, 1–300 characters, strict | |
| `estimatedMinutes` | integer 1–120 | equals `max(1, round(Σ page seconds / 60))` (C10) |
| `provenance` | see below | |
| `topic` (grammar) or `theme` (other kinds) | enum | equals the outline (`:77-78`) |
| `scoring` (**briefs only**) | `{ practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 }`, literals (`:98-102`) | |
| `genre` (reading brief and content) | enum of 21 (`reading.ts`) | content genre equals brief genre |

`provenance` (`artifactCommon.ts:73-81`), strict:

```json
"provenance": {
  "generator": "1–80 chars",
  "model": "1–80 chars",
  "promptVersion": "1–40 chars",
  "generatedAt": "2026-10-21T09:30:00.000Z",
  "inputHashes": { "outline": "≥16 chars", "brief": "≥16 chars, optional" }
}
```

- `generatedAt` must pass `z.iso.datetime()`: UTC with `Z`, no offset. `new Date().toISOString()` works.
- `inputHashes.outline` is **required** on every file; `inputHashes.brief` is optional in the schema on every file.
- **The schema only checks that the hashes are strings of at least 16 characters.** Their values are checked only when the caller passes `outlineHash`/`briefHash`: in this repo `src/catalog/scan.ts` and the author scripts do; `validateBrief`/`validateContent` (`:236`, `:693-694`) only then report `stale`. So any string of 16 or more characters passes.
- If transcendence wants real hashes (useful for "the outline entry changed, rewrite this lesson"), use the same definitions so files stay comparable:
  - `outline = sha256Hex(canonicalJson({ entry, lang, level }))`, where `entry` is the outline entry object (`src/catalog/scan.ts:56-58`);
  - `brief = sha256Hex(canonicalJson(briefFileJson))`, the whole brief file as written (`scan.ts:51-53`), stored on content files only;
  - `canonicalJson` (`scan.ts:35-44`) sorts object keys, drops `undefined`, uses `JSON.stringify` for everything else, and adds no whitespace. That's 10 lines to copy.

  Because the outlines are identical, transcendence's hash of an entry would match the prototype's.

### 10. Fields the "complete" step must compute

The rule: the validator requires an **exact** value where a formula exists. The model shouldn't write any of these.

**All kinds**
- `schemaVersion`, `id`, `kind`, `lang`, `level`, `locales`, `topic`/`theme`, `scoring`, `provenance`: copy them from the outline and constants (as `scripts/author-*.ts` do: `author-grammar.ts:70-73`, `author-functions.ts:54-56`, `author-reading.ts:63, 88-89`).
- Nested IDs: `^[a-z0-9][a-z0-9-]{0,47}$` (`artifactCommon.ts:59`). The generator had to normalize model-written IDs (`generator/contentPrompts.ts:77-90`, `normalizeLocalIds`), so assign page and item IDs in the kit.
- Step `label` and page `instructions`: the validator doesn't check them, but the files use the copy in `src/domain/lessonCopy.ts` (`COPY`, `EXERCISE_INSTRUCTIONS`, `FUNCTIONS_COPY`, `READING_COPY`). Grammar exercise labels come from `MESSAGES['exercise.<type>']` in `src/i18n/messages.ts`, which is not ported, numbered when a type repeats (`author-grammar.ts:36-46`).

**Vocabulary** (brief only; the lesson is derived)
- `targetCount = targets.length` (checked at `validation/artifacts.ts:106`).
- `estimatedMinutes = max(1, round(S / 60))`, where `S` sums the pages of `vocabularyLesson(brief)` (`vocabularyMinutes`, `src/domain/vocabularyLesson.ts:104`; check at `validation/artifacts.ts:167`). With `VOCABULARY_TIMING` (`vocabularyLesson.ts:13-29`), N words, G groups and K nouns:
  `S = 20·G + 3·N` (introductions) `+ 10·N` (flashcards) `+ 10·N` (matching) `+ (K > 0 ? 20 + 5·K : 0)` (gender) `+ 20·N` (gaps) `+ 15·N` (listening) `+ 15·N` (translation exam) `+ 20·N` (dictation) `= 20·G + 93·N + (K > 0 ? 20 + 5·K : 0)`.
  Checks: 8 words, 2 groups, 7 nouns gives 839 s, so 14 min (`fr-alphabet-and-accents`). 4 words, 1 group, 4 nouns gives 432 s, so 7 min (fixture `fr-classroom-objects`).
- Exam time limits are derived (20 s and 30 s per word) and not stored. The kit computes this in `generator/vocabulary.ts`; there is no author script for vocabulary.

**Grammar** (`scripts/author-grammar.ts`)
- **Seconds per item:** `SECONDS[type] × units` (`:24-30`), where units are rows for row items and 1 otherwise: gap_choice 10, gap_typing 15, word_order 25, error_spotter 25, pronoun_form_match 10, pronoun_form_typing 15, person_matching 8 per row.
- **Brief:**
  - `exercises[].itemCount = items.length`;
  - `exercises[].ruleIds` = the union of the items' `ruleIds`;
  - `exercises[].estimatedDurationS = Σ seconds(item)` (`:78`);
  - `explanationDurationS = clamp(60…180, default 120)` (`:64`); the validator only requires 45–240;
  - `feedbackPlaceholder.estimatedDurationS = 30` (`:81`);
  - exam pages: `estimatedDurationS = Σ seconds(item)`, `timeLimitS = ceil(1.5 × estimate / 10) × 10` (`:82`);
  - `estimatedMinutes = max(1, round((Σ explanations + Σ exercises + 30 + Σ exam pages) / 60))` (`:84-85`; check at `validation/artifacts.ts:205-211`).
- **Content** (`:89-109`; the same assembly is in `generator/content.ts:30-66`):
  - per block, an explanation step: page `<block>-explanation`, `estimatedDurationS = explanationDurationS`, `timeLimitS: null`;
  - per exercise, a step with **one page per item**: page `<ex>-<n>`, `estimatedDurationS = seconds(item)`, item `itemId = <ex>-<n>`;
  - a feedback step with the single `production_feedback_placeholder`;
  - an exam step whose pages copy the brief's `estimatedDurationS` and `timeLimitS` (checked equal, `validation/artifacts.ts:410`);
  - `estimatedMinutes = max(1, round(Σ page estimates / 60))` (`:109`; check at `validation/artifacts.ts:686`).
- **Length gate:** explanation pages 45–240 s; seconds per scored unit on a page 6–40 (`grammarContentLengthIssues`).

**Functions** (`scripts/author-functions.ts`; rules in `src/domain/functionsLesson.ts`, `FUNCTIONS_PAGE_RULES` at `src/schemas/functions.ts:38-63`)
- **Every page `estimatedDurationS` must equal `functionsPageEstimate(items, isExam)`** (`functionsLesson.ts:9-27`; check at `validation/artifacts.ts:640-645`):
  - flashcards: 12 s per expression, 10 s per word;
  - dialogue: 20 + 12 s per line;
  - gender: 20 + 5 s per noun;
  - matching: 12 s per expression pair, 10 s per word pair;
  - word order: 25 s (practice) or 30 s (exam reply);
  - gap choice 15 s, listening 30 s, word translation 15 s;
  - exam dialogue: 8 s per line + 20 s per gap.
- Exam pages: `timeLimitS = round(1.5 × estimate)` (`functionsTimeLimit`, `:30`). Other pages: `null`.
- `estimatedMinutes = max(1, round(Σ / 60))`, the same value in brief and content (`author-functions.ts:151-156`).
- The page layout is fixed and must be built, not invented:
  - flashcards: one page of words, then one page of expressions;
  - matching: expressions in balanced pages of at most 6 (`chunk`, `vocabularyLesson.ts:33`), then the words on one page;
  - one item per page for word order, gaps and listening;
  - exam: the word-translation page first (when there are words), reply pages balanced at most 4, then the exam dialogue page.

**Reading** (`scripts/author-reading.ts`; rules in `src/domain/readingLesson.ts`)
- `skimSeconds = max(15, ceil(words × 60 / WPM / 5) × 5)` (`readingSkimSeconds`, `:63-65`). WPM per level is 75/90/110/130/150/170 (`:22`). Words are `documentWords`: title + meta + paragraphs, counting whitespace tokens with a letter or digit (`:26-28`, `:55-57`).
  - **The validator does not recompute `skimSeconds`.** It only requires it on the skim view, in 15–300. The author script keeps a value already set (`author-reading.ts:65`).
- **Every page `estimatedDurationS` must equal `readingPageEstimate`** (`:71-92`; check at `validation/reading.ts:142-148`):
  - flashcards: 10 s per key word; matching: 10 s per key word;
  - skim document: `skimSeconds`; exam document: `round(words × 60 / WPM)`; open document: 0;
  - skim question 20 s, detail question 30 s, exam question 20 s, ordering 15 s per piece.
- Exam page `timeLimitS = ceil(1.5 × estimate / 5) × 5` (`readingTimeLimit`, `:97`). Other pages: `null`.
- `estimatedMinutes = max(1, round(Σ / 60))` (`readingMinutes`, `:94`), and the brief's value must equal the content's (`validation/reading.ts:149`).
- Brief: `documents.main.targetWords` and `documents.exam.targetWords` are set to the actual counts (`author-reading.ts:92-93`; only the level range is checked). `exam.types` is the set of question types used (`:97`).
- Content: the six steps, page IDs, flashcard/matching/document items and their `itemId`s, built from the brief (`author-reading.ts:67-86`).

### 11. Checklists per kind

These are what the code enforces. Pedagogical rules that are only *prompts or review criteria* are marked **(review)**. SPEC references: section 4 "Schema design" (`docs/SPEC.md:463-650`, including D46 restricted Markdown at `:589`), section 5 free-text scoring (`:766`), and the sections named below.

**All kinds**
- [ ] Envelope as in C9; IDs, kind, lang, level and topic/theme match the outline.
- [ ] Every localized field has `en`, `fr` and `de`, trimmed and non-empty. Limits: label 120, short 300, long 1200, learning text 300 (`TEXT_LIMITS`, `artifactCommon.ts:21`).
- [ ] Native-translation maps have **exactly** the locales other than the course language (`fr` course: `en`, `de`). Translation variants are 1–6, and the first is the display form.
- [ ] Accepted answers: 1–8 strings. List real alternatives only, never forms without accents or with other capitals; the grader gives those half credit **(review)**.
- [ ] Explanations name the accent mark ("accent aigu"), never "written with é" (`CHARACTER_ONLY`, `validation/artifacts.ts:70`, checked on the `en` text).
- [ ] Restricted Markdown (D46) in vocabulary group introductions and grammar explanation `text` (`checkRichText`, `:254-263`; parser `src/domain/richText.ts`):
  - blocks separated by a blank line;
  - lists `- ` / `1. ` only; inline `**bold**` and `` `learning form` `` only;
  - no headings, quotes, tables, code fences, `*`/`+` bullets, links, HTML or a literal `\n`;
  - **en, fr and de must have the same block structure and the same backticked forms.**

**Vocabulary** (SPEC section 6 `:821`, "Derived vocabulary lesson" `:832`, "Vocabulary brief" `:516`)
- [ ] 1–60 targets, 1–6 groups of 1–16. Every target is in exactly one group. `targetCount` equals the number of targets.
  - **(review/prompt)** 8 targets (9 when few are nouns) in 2 groups of about 4. This is not checked: the valid fixtures have 4 and 12.
- [ ] Nouns: `genders` not empty (`:114`), `number` set, and `genderExplanation` required (`:141`). Other word classes: `genders: []`, `number: null`, `articleException: null`, `genderExplanation: null`.
- [ ] French nouns (D39, `:117-125`, `:132`):
  - `term` has no article;
  - `teachingForm`, every `examForms` entry and every `genderVariants` entry starts with `un`/`une`/`des`, agreeing with gender and number;
  - or else `articleException` is set, and then no exam form uses an indefinite article.
- [ ] `teachingForm` is one of the `examForms`, or the exam forms joined with ", " for an adjective pair (`:134`).
- [ ] Gap: `referenceTargetIds` are 4 distinct IDs that include the word and all exist; French gap answers have no article (except `un` for a numeral); none of the other three references fits the gap (`:142-147`).
- [ ] `listeningOptionTargetIds`: 4 distinct IDs that include the word.
- [ ] When `genderVariants` exist and `examPrompt` is set, the prompt must differ from the first translation in every locale (`:150-152`).
- [ ] Matching labels (`matchingLabel` or the first translation) are unique per locale within each derived matching page of at most 6 (`:160-166`).
- [ ] `estimatedMinutes` as in C10. It is checked only when nothing else failed (`:167`).

**Grammar** (SPEC section 7 `:881`, "Lesson length" `:898`, exercise behaviour `:921`, exam `:933`, "one answer per exam gap" `:949`, "Grammar brief" `:537`)
- [ ] Brief: 1–12 rules; 2–4 blocks; 1–4 exercises per block in the schema (**2–4 in the length gate**); exercise items 1–12; examples 1–8; pitfalls ≤ 4; prerequisites ≤ 4; `newVerbs` ≤ 12 and unique.
- [ ] The IDs of rules, blocks, exercises and exam pages are unique. Every rule is taught in a block and covered by the exam. An exercise uses only rules of its block; a person matching board may also use rules of earlier blocks (`:176-204`).
- [ ] `grammar_person_matching`, `grammar_pronoun_form_match` and `grammar_pronoun_form_typing` only for the topics `pronouns`, `verbs_morphology` and `verb_usage` (`grammar.ts:37-38`). Lessons on `pronouns` and `verbs_morphology` contain at least one person matching board, except `fr-imperative-mood` (`grammar.ts:39-41`).
- [ ] Exam pages: 1–20 in the schema (**2–4 in the length gate**). Types are only `grammar_gap_typing`, `grammar_pronoun_form_typing` and `grammar_word_order`. `timeLimitS` 5–900.
- [ ] **Length gate** (`GRAMMAR_LENGTH`, `grammar.ts:52`; separate functions, B8): at least 22 scored practice units and at least 10 scored exam units, where row items count their rows (and the brief counts at least 3 per row item); explanation pages 45–240 s; 6–40 s per scored unit per page.
- [ ] Content steps exactly as in C10. Each step's items have the planned type and count. Each exercise's or exam page's items assess **exactly** its planned rules, all of them and no others (`checkRuleCoverage`, `:370-375`). Only exam pages have a `timeLimitS`, equal to the brief's.
- [ ] Items (`checkGrammarItem`, `:267-327`):
  - gap choice: 4 choices with unique IDs and texts, the answer among them, and no "(cue)" in the sentence (use `hint`);
  - exam gaps have `hint: null`;
  - word order: every accepted order uses every token once;
  - error spotter: `faultyTokenId` is a token, the correction differs from it, `select` mode has 2–4 choices including an answer, `type` mode has none;
  - person matching: rows are the persons `[1sg,2sg,3sg]`, `[1pl,2pl,3pl]` or all six, in order; translation mode has `native` set and `pronoun` null, forms mode the opposite; prompts or pronouns are unique; one board per page;
  - token IDs unique per item.
- [ ] Fresh exam: no exam sentence (with its answer filled in) repeats an explanation example or a practice sentence (`:425-429`).
- [ ] **(review, P3-06)** One possible answer per exam gap: name the verb in verb lessons, give a deciding context, accept the other correct answer (`docs/SPEC.md:949`).

**Functions** (SPEC section 8 `:953`, "Brief and lesson content" `:974`, "Page rules" `:999`, review criteria `:1041`)
- [ ] Brief: 2 roles; 4–10 expressions; 0–6 words; prerequisites ≤ 4.
  - Expression, word and role IDs are unique across all three lists.
  - Expression texts, word teaching forms and role labels are unique.
  - The first translations are unique per locale, separately for expressions and for words (`:449-473`).
- [ ] An expression has no trailing `...`/`…` (use `openEnd: true`), and its example sentence contains the expression.
- [ ] A word's example contains its term. Nouns have genders, and in French a `un`/`une`/`des` teaching form; French terms have no article.
- [ ] Content: the steps are `flashcards, dialogue, matching, [gender only if there are nouns], dialogue_gaps, word_order, listening, exam`. Roles are `presentation` for flashcards and dialogue, `exam` for the exam, `exercise` otherwise (`:483-492`).
- [ ] Model dialogue: one item; 8–14 lines; roles alternate; each line's `expressionIds` really occur in its text; every expression is used.
- [ ] Gender page: every noun, in brief order, on one page.
- [ ] Word order, dialogue gaps, listening: one item per page and **exactly one per expression**.
  - Practice word order has no context, role or distractors.
  - Gap and listening context comes from the other role; `before`/`after` have no surrounding spaces; 4 distinct choices that include the answer.
  - Listening has 4 options with unique text, and the answer contains the expression.
- [ ] Exam:
  - a word-translation page first (when there are words), with every word in brief order, each accepting its `teachingForm`;
  - then 4–8 word-order replies with context and role (0–3 distractors that belong to no accepted order) in balanced pages of at most 4;
  - then one typed exam dialogue: 8–14 lines, alternating roles, 3–10 gaps; each gap accepts its expression; a line's translation does not contain the answer; a line without a gap has its whole text in `before`;
  - no exam sentence appears in the brief or in practice;
  - every expression is assessed.
- [ ] Page estimates and limits as in C10, checked exactly.
- [ ] **(review)** Exactly one valid reply per exam reply; distractors plausible but wrong; context makes the expected expression clear (`docs/SPEC.md:1043`).

**Reading** (SPEC section 9 `:1057`, "Page rules" `:1124`, "Brief and lesson content" `:1151`, "Language rules" `:1219`, review criteria `:1229`)
- [ ] Brief: 4–6 key words with unique IDs and terms and unique first translations per locale; 3–4 detail questions (`reading_choice` / `reading_true_false`) with unique IDs; `exam.types` unique; skim focus `genre`, `author` or `purpose`.
- [ ] Words per level for main/exam (`READING_WORDS`, `reading.ts:36-43`): A1 40–80 / 20–40; A2 80–150 / 40–75; B1 150–250 / 75–125; B2 250–400 / 125–200; C1 400–550 / 200–275; C2 550–700 / 275–350. Checked on `targetWords` in the brief and on the actual count in the content.
- [ ] Content:
  - two documents, `main` and `exam`; 1–12 paragraphs of at most 1200 characters; meta ≤ 4;
  - highlights only in `main`, copied word for word and occurring as **whole words**; every key word highlighted at least once;
  - genre equal to the brief's.
- [ ] Six steps in order (`flashcards, matching, skim, detail, structure, exam`), each exactly one page.
  - Skim, detail and structure show `main`; the exam shows `exam`, as the first item, in views `skim`/`open`/`open`/`exam`.
  - Flashcards and matching show no document.
  - Only the skim view has `skimSeconds`.
- [ ] Flashcards and matching each contain every key word once.
- [ ] Skim: one `reading_skim_choice` with the brief's focus and 3–4 options.
- [ ] Detail: the brief's questions in order, with the same IDs and types.
- [ ] Structure: one `reading_order` with 3–6 unique pieces; 1–2 accepted orders, each using every piece.
- [ ] Exam: exactly 5 questions of the planned types; none repeats a skim or detail question; the exam document shares no paragraph with the main one.
- [ ] Documents, questions, options and pieces stay in the course language **(review, language rules)**; True/False labels come from `TRUE_FALSE_LABELS` (`reading.ts:208`).
- [ ] Page estimates and limits as in C10, checked exactly; the brief's and content's `estimatedMinutes` are equal.

### 12. What agents got wrong, and the hardest validator errors

The repo has no logs of validator runs, so this comes from the review commits, the review records and the rules added after reviews. Inferences are marked as such.

- **Ambiguous exam gaps** (P3-06 review, `10c9e39`; SPEC 0.70 at `docs/SPEC.md:3479`). In the -er verb lesson the verb wasn't named; pronouns, plurals and adverbs had gaps where a second answer also fits. There was also one *correct* distractor in a subject-pronoun choice, `j’ai` written with a space, and missing full stops after negation gaps. **No validator catches these**; the guides must ask for a deciding context in every gap.
- **The lesson length was wrong both ways** (P3-07, `docs/ISSUES.md:800-821`). The first samples had 11–35 practice units; the first rewrite had 50–68 and took 24–27 minutes; both were redone. Today the length gate is the only guard.
- **Rules added after reviews**, each one a mistake that happened (inference): cues in parentheses inside gap sentences (P3-02, `:276`); exam sentences that repeat practice sentences (P3-05, `:425`); explanations that show the character instead of naming the mark (D28, `:70`); gap `before`/`after` with surrounding spaces (functions, `:542`, `:631`); word-order items with more than one valid order (P4-05 review "unique word orders", `b64e73a`).
- **Model output fixed in code** (the generator, for Gemini): bad nested IDs with capitals, underscores or dots (`normalizeLocalIds`, `generator/contentPrompts.ts:77-90`, and the ID rules in `generator/prompts.ts:53`); literal `\n` and unsupported Markdown in the D46 texts (`RICH_TEXT`, `generator/contentPrompts.ts:10-16`); Gemini rejecting nested array bounds with HTTP 400 (`generator/prompts.ts:16-19`).
- **Probably the hardest errors to repair in a loop** (inference from how the validator is built):
  1. **D46 locale parity.** One differing backticked form across en/fr/de fails the whole text, and the message lists both form sets.
  2. **Exact page estimates** in functions and reading. The message gives the expected seconds, but a model can't compute them reliably, so the "complete" step must compute them (C10).
  3. **Rule coverage** in grammar, because rules must be assessed exactly, in practice and in the exam.
  4. **Coarse paths** (`steps`, `steps.exam`, `blocks`) that don't point at an item.
  5. **Errors that come in waves.** A zod failure hides all semantic checks (B8). `checkFunctionsContent` stops after a wrong step structure (`:493`). `checkReadingContent` stops after a structure error (`validation/reading.ts:101`). The vocabulary minutes check runs only when nothing else failed (`:167`). The runner should allow several repair rounds per file. **Estimate:** 2–4 rounds when structure is wrong.
- **Tips for the guides:**
  - have the model write only the authored parts (texts, items, accepted answers) and let the "complete" step build steps, pages, IDs, durations, limits, minutes, labels, instructions and hashes, as `scripts/author-reading.ts` does with its "short draft" (`author-reading.ts:1-16`);
  - call the length gate in the runner;
  - give the model the brief's planned counts and rule IDs as a checklist;
  - require a deciding context for every exam gap;
  - write the same backticked forms in all three locales.

The vocabulary briefs were generated by Gemini on 2026-10-06 (`generatedAt`) and then reworked in four commits (`216aa7a`, `8c5f9ac`, `0fc42e0`, `2294858`) without updating `provenance`. Their provenance doesn't describe how they were made.

### 13. The smallest complete valid examples

| Kind | Smallest valid example | Size | What it shows | What a guide can cut |
|---|---|---|---|---|
| Vocabulary | `tests/fixtures/content/briefs/fr-classroom-objects.json` (all nouns); `fr-classroom-instructions.json` (no nouns, so no gender step) | 9.6 KB / 8.7 KB | 4 targets in 1 group, all exercise texts, 7 min. Valid, but below the 8-word standard. | Show one target in full and write "… 3 more"; keep one group introduction. A full-size lesson: `content/briefs/fr-classroom-objects.json` (8 targets, 2 groups, 21 KB). |
| Grammar | `tests/fixtures/content/{briefs,lessons}/fr-negation-ne-pas.json` | 4.3 + 14.8 KB | 2 rules, 2 blocks, all step roles, 2 exam pages. Valid, but **fails the length gate** (5 issues). | Show one block with one exercise of each type and one item each, plus the feedback and exam steps. A full-size lesson: `content/{briefs,lessons}/fr-negation-ne-pas.json` (63 KB). |
| Functions | No fixture. Smallest: `content/{briefs,lessons}/fr-greetings-and-goodbyes.json` | 54 KB | 4 expressions, 4 words, all 8 steps | Nothing can be cut and stay valid (at least 8 dialogue lines, one item per expression in three stages, 4+ exam replies). Show one item per step and elide the rest. |
| Reading | `tests/fixtures/content/{briefs,lessons}/fr-fix-menu.json` | 5.8 + 17.3 KB | 5 key words, both documents, all 6 steps, 8 min | Elide paragraphs and 4 of the 5 exam questions. A full-size lesson: `content/…/fr-reading-a-text-message.json` (24 KB), the P5-02 contract fixture. |

---

## D. German and English (#136)

### 14. French assumptions in the ported files

| Location | Assumption | Proposed fix (one line) |
|---|---|---|
| `src/validation/artifacts.ts:114` (vocabulary) and `:463` (function words) | Every noun needs at least one gender | Require genders only where the language has them: `if (hasGender(lang))`, and for `en` require `genders: []`. |
| `src/validation/artifacts.ts:141` | Every noun needs a `genderExplanation` | Same condition: required only for nouns with genders. |
| `src/domain/vocabularyLesson.ts:72` and `src/validation/artifacts.ts:487`, `:509` | A gender step exists when the lesson has nouns | Use "nouns with genders" (`t.genders.length > 0`), so English lessons have no gender step. |
| `src/validation/artifacts.ts:88`, `:94-100` (`FR_INDEFINITE`, `frArticleIssue`), `:117-125` | D39: `un`/`une`/`des` + noun | Replace with an `articleIssue(lang, t, form)` table per language (D15). |
| `src/validation/artifacts.ts:132`, `:265` (`FR_ARTICLE_START`), `:145`, `:464`, `:466` | French articles for "term without article" and "article-free gap" | A per-language article regex: `{ fr: …, de: /^(der\|die\|das\|ein\|eine\|einen\|einem\|einer\|eines)\s/i, en: /^(a\|an\|the)\s/i }`. |
| `src/validation/artifacts.ts:70` (`CHARACTER_ONLY`) | Only French and German accented letters | Fine for de/en. Optionally add `ß` (a letter, not a mark, so leaving it out is defensible). |
| `src/validation/artifacts.ts:300` | Pronouns on a forms-mode person board are unique | Allow a repeated pronoun when the forms are the same, or skip the check for `en`: English 2sg and 2pl are both "you". |
| `src/schemas/grammar.ts:39-41` (`PERSON_MATCHING_TOPICS`, `PERSON_MATCHING_EXEMPT = ['fr-imperative-mood']`) | Pronoun and verb-form lessons need a person board; the exemption is a French ID | Make the exemption list per language (`de-imperative…`, `en-…`), and drop the requirement for `en` `verbs_morphology` lessons whose forms barely change with the person. |
| `src/schemas/grammar.ts:44` (`PERSONS`) | Six persons | Keep for de/en (see D15 for *Sie*). |
| `src/validation/reading.ts:133` | `toLocaleLowerCase('fr')` | `toLocaleLowerCase(c.lang)`. |
| `src/domain/lessonCopy.ts:13`, `:42` | "Translate each word into French, with its article for nouns." (en/fr/de copy) | Make the copy a function of `lang`, with the language name and an article clause only where it applies. |
| `src/validation/artifacts.ts:638` | The message says "the French answer" | Use "the answer". |
| Comments: `functions.ts:75,91,105,136,169,220`; `grammar.ts:150,160,164`; `vocabulary.ts:65`; `functionsLesson.ts:33`; `validation/artifacts.ts:91,445` | "French" where "learning language" is meant | Comments only. |

The schemas themselves are language-neutral: `GENDERS` includes `neuter` (`vocabulary.ts:32`), native maps are built from `lang`, and `TRUE_FALSE_LABELS` covers de and en. No schema change is needed for #136, only validator and copy changes.

### 15. Recommended policies

**German**
- **Articles: definite.** `teachingForm` and `examForms` are `der`/`die`/`das` + noun (`der Tisch`, `die Lampe`, `das Buch`). A plural-only noun is `die Leute`, with `number: 'plural'`.
  - Why not D39's indefinite article: `ein` doesn't separate masculine from neuter (`ein Tisch` / `ein Buch`), and the plural has no indefinite article. The definite article is also how German dictionaries and courses teach gender.
  - Validator: `der` ↔ masculine, `die` ↔ feminine, `das` ↔ neuter for singular; `die` for plural. Several genders allowed (`der/das Joghurt` gives two exam forms). `genderVariants` with their own article (`der Student` / `die Studentin`). `articleException` for nouns used without an article (most country names: `Deutschland`).
  - `term` is the noun without article, **capitalized**: check `^\p{Lu}`.
  - Gaps take the noun without article. Because of case, accepted answers must include inflected forms (dative plural `-n`, genitive `-s`) where the sentence needs them **(review)**.
  - Rename the exam copy "with its article" to fit.
- ***Sie*:** keep six persons and follow the French precedent "il / elle / on" in one row (`content/lessons/fr-verb-etre-present.json`, forms mode, 3sg).
  - Forms mode: 3sg `er / sie / es`, 3pl `sie / Sie` (formal *Sie* takes the 3pl form).
  - Translation mode: the 3pl native prompt reads "they / you (formal)", or teach formal *Sie* in its own explanation block.
  - The ordered person check and the unique-pronoun check pass as they are. A separate formal person would need a schema change (`PERSONS`), which isn't needed for A1–B1. **Estimate:** none of the de outlines needs it before C1; this wasn't checked entry by entry.
- `du` / `ihr` match French `tu` / `vous`; the native prompts already disambiguate ("you (one friend)").

**English**
- Skip the gender exercise: nouns have `genders: []` and `genderExplanation: null`, and there is no gender step in vocabulary or functions (fixes in D14).
- **Articles:** examine nouns **without** an article (`examForms: ["book"]`, `teachingForm: "book"`, or `"a book"` only as a display form if it is also in `examForms`). `a`/`an` depends on sound, adds no knowledge, and the article-free gap rule already fits. Plural-only nouns (`jeans`) use `number: 'plural'`.
- Add spelling variants (`colour` / `color`) to `examForms`, since the validator requires every accepted form to be listed.
- Person boards: forms mode fails on the repeated "you" (`validation/artifacts.ts:300`), so fix that check or use translation mode only. Most English `verbs_morphology` lessons (past tense, `-ing`) shouldn't require a board (`grammar.ts:39`).
- Other parts that work for English as they are: the D46 rich text, reading (word counts, highlights, True/False), the function dialogue checks (`plain()` is language-neutral), and the accent-mark rule (never triggers).

---

## E. Risks

### 16. For the seed (validators, `title`, `objective[lang]` as summary, brief and content in Postgres)

- **File sizes (fr/A1, measured):**

  | Kind | Brief | Content | Total |
  |---|---|---|---|
  | Vocabulary | 19–24 KB | none | 19–24 KB |
  | Grammar | 7–10 KB | 50–57 KB | 60–68 KB |
  | Functions | ~7 KB | 46–50 KB | 54–58 KB |
  | Reading | 5–6 KB | 17–18 KB | 23–25 KB |

  Pretty-printed with 2 spaces. **Estimate** for all 3,990 lessons at A1 sizes: about 137 MB of JSON (1,938 × 22 + 762 × 64 + 444 × 56 + 846 × 24 KB). Higher levels have longer reading documents, so **estimate 150–200 MB in total**. Store minified `jsonb`, and seed in batches.
- **`title`:** `LearningTextSchema`, 1–300 characters, trimmed, **line breaks allowed** (`artifactCommon.ts:23-29`). Transcendence's `LessonTitleSchema` allows 80 characters and rejects line breaks and invisible characters. Current maximum: 37 characters (`fr-indefinite-articles-and-noun-gender`); 31 of 33 titles equal the outline `workingTitle`. **Add the 80-character, one-line check to the kit, or the seed will reject the lesson.**
- **`objective[lang]`:** `LocalizedTextSchema`, 1–300 characters per locale, line breaks allowed. Transcendence's summary allows 200. Current maximum: 173 (`fr-definite-articles-and-elision`), and 0 of 33 are over 200. Add a 200-character, one-line rule in the kit, or truncate when seeding.
- **Trimming:** zod `.trim()` changes the parsed value (B7). Store `result.value`, or make the kit write files that are already canonical, so the stored text matches what was validated.
- **Determinism:** the ported code has no randomness or clock; `vocabularyLesson()` is a pure function. The only thing that changes is `provenance.generatedAt`. If the seed decides "has this lesson changed?" by hashing the file, ignore `provenance` or hash only the inputs.
- **Strict objects:** transcendence can't add its own keys (`summary`, `position`) to the files without a schema change. Keep them in the database or the outline.
- **Validator outcomes:** without `outlineHash`/`briefHash` the status is never `stale`. `invalid` can come with a `value` (schema passed, semantic checks failed), so check `status === 'valid'`, not just `value`. Also call the grammar length functions (B8).
- **Lesson length vs `LESSON_MINUTES = 10`** (`lesson.ts`: "One lesson is ten minutes, so a daily goal of 30 minutes is three lessons"). The prototype's lessons last vocabulary 13–15 min, grammar 15, functions 16–17 and reading 8 (`estimatedMinutes`). Either compute the daily goal from `estimatedMinutes` or change the constant (#86).

### 17. Other things that could make #135, #136 or #83 fail or take longer

- **#135, wiring rather than copying.** `common.ts`/`outline.ts` must be replaced by imports of the existing modules (B5); otherwise TS2308. All `.ts` import extensions must be removed (the code builds as CommonJS with node10 resolution); the 16 files have 43 such imports. `OutlineContext.entry` needs retyping. The tests need path changes and five real lessons as fixtures (B6). **Estimate:** 1–2 days including tests. The zod and TypeScript checks (B7) already passed.
- **#135, generator leftovers.** `GENERATED_KINDS`/`isGeneratedKind` and the "the generator does not produce yet" assertions (`functions.test.tsx:44`, `reading.test.tsx:45`) mean nothing in transcendence. Drop them together.
- **#83, the length rules are scattered.** Grammar length is in separate functions (B8); vocabulary's 8–9 words exists only in the Gemini prompt (`generator/prompts.ts:58`); function and reading counts are in the schemas. The kit should have one "lesson length" check per kind. Decide feedback #28 (length per level) before writing B1–C2.
- **#83, the author scripts are not generators.** `scripts/author-grammar.ts` *rewrites* existing lessons: it reads `oldBrief`/`oldContent` (`:51-53`) and needs `MESSAGES` from `src/i18n/messages.ts` (1,320 lines, not ported) for exercise labels. `author-functions.ts` uses a compact definition format (`scripts/author-functions-definition.ts`). Only `author-reading.ts` works from a short draft. Reuse the formulas (C10), not the scripts.
- **#83, review is the bottleneck.** The SPEC states that validation proves structure, not language quality. The known problems of the 23 agent-written lessons (C12) were found by people. **Estimate:** at 3,990 lessons, even 2 minutes of review per lesson is about 130 hours.
- **#83, the runner's repair loop.** The error waves (C12) and the coarse paths mean several `claude -p` rounds per file. Budget **2–4 rounds per lesson (estimate)**, and send the whole issue list each round.
- **#136, English blocks everything.** No English vocabulary lesson with a noun, and no English six-person forms board, can pass today (D14). Do #136 before the first English lesson, not after.
- **#136, German passes with no checks.** A German noun without its article, or with the wrong one, passes today, because every article check is `lang === 'fr'`. That is quiet bad data, not an error.
- **Divergence after the freeze.** The prototype will keep changing (P6-02, #28). Since transcendence owns its copy from the freeze on, record the source commit (`928484d`) in the ported files, so later diffs can be applied on purpose.
- **Not verified here:** transcendence's ESLint and Prettier rules (`@ft/eslint-config`) on the ported code, and how fast the seed is on the full catalogue.
