# P1-10 review of shared vocabulary/grammar contracts

| Field | Value |
| --- | --- |
| Issue | P1-10: Review shared vocabulary/grammar contracts before category implementation (#18) |
| Date | 2026-10-07 |
| Reviewer | Claude (Opus 5.5) in Claude Code |
| Base | `40e9a26` (P1-11 branch, PR #49), SPEC Draft 0.30 |
| Result | SPEC Draft 0.31; contract fixes and tests listed below |

## Scope and method

The review compared the shared plan, session, scoring and renderer contracts with the twenty authored first-ten samples in `content/` and with the acceptance criteria of P2-01 to P2-04 and P3-01 to P3-05.

Mechanical check, now a permanent test (`tests/unit/contracts.test.ts`). Each of the 20 sample lessons, with English and German as mother tongue, is checked for these properties:

- Unique unit IDs.
- A renderer for every item type.
- A countdown exactly on exam pages.
- No listening unit shares a page with other units.
- Every answer key scores 1.
- A practice step exists and the exam is the last step.
- Answering every key completes the attempt with 100 points and 100 % progress.
- Wrong practice answers with an empty exam complete with 0 points.

All 20 samples pass: 10 vocabulary and 10 grammar lessons, 16–57 pages and 18–105 units each. The samples contain 16 item types. `grammar_error_spotter` appears only in the test fixture `fr-verb-etre-present`, not in any first-ten sample.

## Confirmations (acceptance 1)

| Requirement | Evidence |
| --- | --- |
| Vocabulary stages including listening pages | Six stages plan as presentation, practice and exam pages. Listening pages are homogeneous: the validator enforces this for exam page plans and, since this review, for practice pages. Listening pages have voice gating, no-voice help and Skip (P1-11). |
| Grammar blocks, placeholder, mixed exams | Explanations and the production-feedback placeholder are presentation pages. Exam pages mix typed gaps, typed pronoun forms and word order through the same text and order scorers. |
| Timed page plans | `timeLimitS` exists only on exam pages and is copied from the brief. Deadlines are absolute and persisted. A listening exam starts its countdown only when a voice is ready. |
| Weighted progress | Progress is weighted by the duration of concrete pages and excludes skipped listening pages. |
| Single-Continue practice feedback | Continue locks and scores; a second Continue confirms. Practice is blocked until every unit is answered. |
| Final results with an exam/practice menu | `lessonResults` returns practice and exam tallies and per-step tallies; `ResultsView` selects the exam by default. |

## Shared needs and ownership (acceptance 2)

| Need | Shared contract today | Owner of the full interaction | Reused by |
| --- | --- | --- | --- |
| Matching/assignment | `choice` units, one per row, with shared options; `ChoiceControl` (select) | P2-02 builds one pointer/keyboard assignment control | P2-03 gender rows, P3-02 pronoun/form matching |
| Typing | `text` units with `AcceptedAnswers`; pure `classifyAnswer` (P1-03); `TextControl` | P2-03 (gaps, translation exam) | P3-02 pronoun typing, P3-03 gaps, error-spotter correction |
| Tokens | `order` and `spot` units; `OrderControl`, `SpotControl`; scoring by sentence text, so repeated tokens are safe | P3-04 | none |
| Audio | `speech.ts` (voice lookup, status hook), `ListenButton`, `VoiceHelp` (P1-11) | P1-11, done | P2-02 introduction/flashcards, P2-03 overview (audio hidden while gender is answered) |
| Results | `LockedUnit` records, `lessonResults`, `ResultsView` | P1-09, done | P2-03 Gender step, P3-05 mixed exam; rule tags from unit `ruleIds` (P3-04/P3-05) |
| Presentation progress | `revealed` in the session record, `reveal` action | P2-02 flashcards | other presentation items that need resume |

## Composition (acceptance 3)

There is no base class. `SessionView` acts as the exercise shell (header, page card, Continue). The typed `rendererRegistry` maps every item type to a function component. Item renderers compose four unit controls. Scoring is pure: `scoreUnit` and `classifyAnswer`. The session is a pure reducer that takes time as an input.

`renderers.tsx` (about 430 lines) holds all baseline renderers. P2-01 and P3-01 should split it into vocabulary, grammar and shared control modules when they replace entries.

## Gaps found and fixed (acceptance 4)

| # | Gap | Risk | Fix |
| --- | --- | --- | --- |
| 1 | The validator allowed listening-choice and other items on one practice page. | The page would not count as a listening page, so it would get no voice check and no help page, and its Skip would not apply. | The content validator now requires listening-choice pages to contain only listening-choice items. Test in `artifacts.test.ts`. |
| 2 | `buildPlan` dropped unknown item types silently (`default: return []`). | A new scored type would render with 0 units and 0 points without any error. | Presentation types are listed explicitly. The default case is a compile-time `never` check and throws at runtime. |
| 3 | Plan units had no rule references. SPEC section 7 records rule-level errors, and P3-04 feeds rule-level error tags into results. | Results could not tag errors by rule without joining back to content. | Grammar units carry the item's `ruleIds`. Test in `session.test.ts`. |
| 4 | The session record had no place for presentation progress. P2-02 requires that flashcard review progress persists. | P2-02 would have to change the session schema. | Added `revealed: Record<"pageId/itemId", string[]>` and a `reveal` action that applies only on the active page and ignores repeats. Stored sessions without the field load with `{}`. Test in `session.test.ts`. |

## Open items handed to later issues

- **P3-04 and P3-06:** The error spotter has no first-ten sample. It must be authored and played end to end with real grammar content.
- **P2-03:** Hide gender, article and audio clues while gender is being answered. This is renderer-only; the plan already carries `form` separately.
- **P2-01 and P3-01:** Split `renderers.tsx` as noted above.

## Validation

- `make test`: 222 unit/component tests pass, including the 61 sample-lesson contract tests and three tests for fixes 1, 3 and 4.
