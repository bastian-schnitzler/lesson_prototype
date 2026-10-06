# P0-02 Claude review of the lesson prototype specification

| Field | Value |
| --- | --- |
| Issue | P0-02: Review the specification with Claude |
| Date | 2026-10-06 |
| Reviewer | Claude (Opus 5.5) in Claude Code, with the user deciding material changes |
| Reviewed version | SPEC Draft 0.19 and ISSUES (version 0.19). Base commit `14ec21e`, plus uncommitted working-tree changes (P0-01 was later merged as PR #1 from `p0-01-create-spec`). |
| Reviewed file hashes (SHA-256, before changes) | `docs/SPEC.md` `ebe1160f2747d9d57e445dcd0dd5bd6cb7da0dc0ac33d84013b159865e0ec46b`; `docs/ISSUES.md` `c1a8550001d129acfc0558e54c54c30d17ab560eee2195319d482e929dea6273` |
| Result version | SPEC Draft 0.20, ISSUES version 0.20 |

## Scope and method

Inputs reviewed in full:

- `docs/SPEC.md` (all sections, decisions D1–D37, and all 29 embedded Salt sources)
- `docs/ISSUES.md` (P0-01 to P5-02)
- `docs/mockups/README.md` and all 29 `.puml` sources
- `content/outlines/fr-a1.json`
- `old_prompt/requirement_summary.md`, `old_prompt/data_model_draft/lesson.ts` and `item.ts`
- `docs/design-references/` (presence of R1–R5)

Review areas, as required by P0-02: consistency, missing requirements, schema/generation feasibility, scoring/timing behavior, UI flows, phase boundaries, dependencies, and test coverage.

The following checks were mechanical:

| Check | Result |
| --- | --- |
| Outline size and kind mix | 120 entries: 48 grammar, 48 vocabulary, 14 functions, 10 reading. Matches SPEC. |
| First-ten sample IDs (SPEC section 9) | Both lists match the outline order exactly. |
| Lesson IDs | All unique, all match `^fr-[a-z]+(-[a-z]+)*$`, all ≤ 64 characters. |
| Outline text lengths | All intents ≤ 200 and all working titles ≤ 80 characters, so the legacy length limits would not reject them. |
| Mockup source/Markdown parity | 29/29 sources identical to their SPEC fences before the review; 32/32 after it. |
| Design references | R1–R5 present under `docs/design-references/`. |
| Vocabulary result arithmetic | 27/36 practice and 8/12 exam give 69.58, shown as 69.6. Header scores 9.7, 18.5, 21.4 and 26.3 follow one consistent answer sequence. |
| Grammar result arithmetic | 12/16 practice and 8/10 exam give exactly 78.25. It shows as 78.3 only with half-up rounding, which was unspecified (F17). |

Rendering of new Salt sources was not checked locally: no PlantUML renderer is installed. Check them in the VS Code preview described in the mockup README.

## Findings and disposition

Severity: High = blocks a correct implementation or a review gate; Medium = likely defect or rework; Low = clarity or consistency.
"Material" findings changed requirements and were decided by the user on 2026-10-06.

| ID | Severity | Area | Finding | Disposition |
| --- | --- | --- | --- | --- |
| F01 | High | UI flow / pedagogy | D4 allowed a mother tongue equal to the learning language (fr for French). Flashcards, matching and the translation exam then become copy tasks (`un livre` → `un livre`). | **Accepted, material.** User: disable that option. Added D38. Native translations in the learning language are no longer generated. SPEC sections 1, 3 and 4, P1-01, P1-03, P1-07, and the index mockup were updated. |
| F02 | High | Requirements / schema | The exam always requires the indefinite article. Sample intents quote definite forms (`le père`, `la cuisine`, `l'Espagne`) or no article (`je suis étudiant`, days). The rule and the intents conflict. | **Accepted, material.** User: keep the indefinite article. Added D39: definite forms in intents do not override it; explicit exceptions only where no indefinite form is grammatical. Updated the vocabulary brief section and P1-03. |
| F03 | High | Missing requirement | Several sample intents require oral recognition (`fr-numbers-zero-to-twenty`, `fr-alphabet-and-accents`, `fr-classroom-instructions`). No exercise type assesses listening, so the review gate “full outline-intent coverage” could not pass. | **Accepted, material.** User: add listening, choose in practice and write in the exam, as a new phase 1 issue. Added D41, two exercise types, a stage 5/6 flow change, new issue P1-12, P2-03/P2-04/P2-05 integration, and two mockups. |
| F04 | Medium | Scoring | Removing accents makes `a`/`à`, `ou`/`où` and `la`/`là` count as accent-only (0.5), although they are different words. `soeur` for `sœur` scored 0, because a ligature is not an accent. | **Accepted, material.** User: mark accent-distinguished words as accent-sensitive, and give 0.5 for `oe`/`œ` and `ae`/`æ`. Also German: `a` or `ae` for `ä` (likewise ö/ü) gives 0.5. Added D40 and updated the free-text section, wording table, P1-03, and the unit test list. |
| F05 | Medium | UI flow | Listening (F03) depends on browser voices, which are often missing on Linux. | **Accepted, material.** User: show a help page that explains browser speech and how to install a voice on Windows, macOS and Linux, with a Skip button. Added D42, a mockup, and P1-12 criteria. User later confirmed: skipped units are left out of scores, denominators, progress and results review. |
| F06 | Medium | Exam integrity | During an active exam, the learner can open the artifact page and read every answer key. The next page's timer only starts on activation. | **Accepted as documented limitation.** User decision. Added D43 and a note in SPEC section 5. Content is public static JSON anyway. |
| F07 | Medium | Phase boundaries | Phase 3 required all 48 grammar lessons; phase 2 left 38 vocabulary lessons optional. | **Accepted, material.** User: require all 48 vocabulary lessons. Added D44 and updated the phase 2 exit criteria and P2-04. |
| F08 | Medium | Consistency | D5, D11, D13 and D16 and the full-reload preference behavior were still marked “Proposed”. P0-01 requires provisional items to be removed or deferred explicitly. | **Partly resolved.** User confirmed D5 and D11, then D16 without the “Exam results pending” label (removed from SPEC and three mockups). Full reload now keeps preferences in browser storage (D45). **Open:** D13. |
| F09 | Medium | Generation feasibility | One structured-output call for a complete multilingual lesson can exceed the model's output limit, for example 31 targets with explanations in three locales. Brief-determined parts were also regenerated, which risks drift. | **Accepted.** Content may be generated in separately validated sections and assembled locally into one atomic file. Flashcards, matching pairs and gender rows are assembled locally. The retry bound now applies per generation unit. SPEC section 3, P1-07, and the generator tests were updated. |
| F10 | Medium | Dependencies | P1-05 (brief generation) depended on P1-04, which depends on P1-02 (Pages deployment). Generation was therefore blocked on Pages verification for no technical reason. | **Accepted.** P1-05 now depends on P1-03. P1-04 can run in parallel and still confirms the generator imports no legacy files. |
| F11 | Low | Dependencies | P1-01 used a “build-derived catalog”, but the build arrives in P1-02. | **Accepted.** P1-01 owns the shared catalog scanner; build and generators reuse it. |
| F12 | Medium | Schema | “A brief stores its outline hash” was ambiguous. A whole-file hash would make every lesson stale after editing one outline entry. | **Accepted.** Hash canonical JSON of the lesson's own entry plus course `lang`/`level`. |
| F13 | Medium | Pedagogy / schema | Native labels can collide inside one matching group for some locale. English prompts often do not mark gender (“French”, “student”), so the expected exam answer is ambiguous. | **Accepted.** Labels must be unique per locale per group, or carry a disambiguating note. Exam prompts must disambiguate, or the item accepts every valid form. Added to SPEC section 4 and P1-03. |
| F14 | Low | Consistency | The payload listed a “shuffled display order”, while P2-02 shuffles at runtime. Resume and results review need a stable order. | **Accepted.** Content stores canonical order. Runtime shuffles use a seed stored in the session. Added to SPEC section 4 and P1-09. |
| F15 | Low | Schema | The error spotter has one faulty token, so it cannot express omissions such as a missing `ne`. | **Accepted.** Error-spotter items are single-token substitutions only. |
| F16 | Low | Schema | The start-page duration “should agree” with the summed page estimates, but no rule was given. | **Accepted.** `estimatedMinutes` must equal the rounded sum of page estimates. |
| F17 | Low | Scoring | The rounding mode was unspecified (78.25 could show as 78.2 or 78.3). | **Accepted.** Round half up to one decimal from the unrounded value. |
| F18 | Low | Scoring | French typography uses no-break and narrow no-break spaces before `? ! : ;`. Normalization did not mention them. | **Accepted.** They are treated as whitespace. |
| F19 | Low | Consistency | The level sort listed A0, which is not in the CEFR level enum. | **Accepted.** Removed A0. |
| F20 | Low | Mockups | Index row 01 showed “Saluer et prendre congé”; the outline `workingTitle` is “Saluer et dire au revoir”. | **Accepted.** Fixed the source and the SPEC fence. |
| F21 | Low | Consistency | P1-01 listed the filter order as Voc/Grammar/Reading/Function; P3-05 quoted only the English placeholder; P1-09 had a stray blank line; the generator tests still said “duplicate clicks”. | **Accepted.** All four fixed. |
| R1 | Low | Pedagogy | In word order, a capitalized first token reveals the sentence start. | **Deferred** to P3-01 content review. This is an accepted tradeoff for the prototype. |
| R2 | Low | Accessibility | Fixed exam countdowns have no time extension (WCAG 2.2.1). | **Deferred.** The timing is essential to the exam design in the prototype; revisit for production. |
| R3 | Low | Session | The same session can be open in two tabs at once. | **Deferred** to P1-09 implementation; idempotent locks already limit the damage. |
| R4 | Low | Scoring | Trailing punctuation in typed answers (`un livre.`) is not defined. | **Deferred** to the P1-03 accepted-variant policy. |
| R5 | Low | Mockups | Intermediate grammar header scores do not follow one unique answer sequence. | **Rejected.** They are illustrative; P3-07 refreshes them from the prototype. |
| R6 | Low | Scoring | D40 does not cover `ß`/`ss`. | **Deferred.** No German course is in scope; decide when one is added. |
| R7 | Low | Pedagogy | Gender selection is trivial for natural-gender nouns (`père`/`mère`). | **Deferred** to the P1-06 brief review. The brief may keep such targets. |

## Open items for the user

1. **D13, phase 4/5 allocation.** Phase 4 = functions (14 outlines), phase 5 = reading (10), both blocked until their requirements are reviewed. The user chose to leave this open.

## Follow-up decisions (2026-10-06)

- D16 confirmed: the header keeps the practice score unchanged during the exam, with no pending label.
- D45: mother tongue and interface language persist in browser storage across reloads.
- D42: skipped listening units are left out of scores, progress and results review.
- Workflow: before starting an issue, check the branch; switch to the issue branch or create it from up-to-date main. Branch naming revised (D24): branches use the logical ID, `P<phase>-<two-digit-issue>-<short-description>`. This review's work moved from uncommitted changes on `main` to `P0-02-claude-spec-review`.

## Requirements-summary traceability (input to P0-03)

Every requirement in `old_prompt/requirement_summary.md` is represented in SPEC. Where they differ, the user's later decisions take precedence:

| Requirement summary item | SPEC location | Note |
| --- | --- | --- |
| Outline → brief → content cascade | Sections 3–4 | Offline generation replaces click-triggered generation (D2). |
| Outline fields `id`, `kind`, `topic`/`theme`, `workingTitle`, `intent` | Sections 3–4 | |
| 10–15 minute lessons | Section 1, D12 | Larger inventories may run longer. |
| Four categories; reading and function undecided | Sections 1, 11; phases 4/5 | |
| Vocabulary 6 steps: introduction, flashcards, matching, overview, typed gaps with unclickable choices, exam with indefinite article | Section 6, D21, D39 | Stage 4 adds noun-gender practice; stages 5/6 add listening (D41). |
| Gender shown in steps 1–5, hidden in step 6 | Section 6 | Also hidden while answering the stage-4 gender exercise. |
| Grammar: 2–4 explanation/exercise blocks, pitfalls block | Section 7 | |
| Personalized feedback before the exam | Section 7, D10 | Replaced by the fixed production placeholder. |
| Final exam, preferably written production | Section 7 | Typed gaps, typed pronoun forms, word order. |
| Grammar exercise bank (6 types) | Sections 4, 7 | All six kept. |

## Changed files

- `docs/SPEC.md`: Draft 0.20 (decisions D5, D11, D38–D44; sections 2–8 and 10; revision log)
- `docs/ISSUES.md`: P1-01, P1-03, P1-05, P1-07, P1-09, P1-10, P1-11, new P1-12, P2-03, P2-04, P2-05, P3-05, and the asset table
- `docs/mockups/01-lesson-overview/index/lesson-index.puml`: working title and disabled fr mother tongue
- New: `docs/mockups/03-vocabulary-lesson/06-listening/listening-choice.puml`, `no-voice-help.puml`, and `docs/mockups/03-vocabulary-lesson/07-exam/listening-dictation.puml`
- `docs/mockups/README.md`: 32 screens and listening rows
