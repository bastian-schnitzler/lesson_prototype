# P2-01 review of vocabulary renderer composition and answer contracts

| Field | Value |
| --- | --- |
| Issue | P2-01: Review vocabulary renderer composition and answer contracts (#21) |
| Date | 2026-10-07 |
| Reviewer | Claude (Opus 5.5) in Claude Code |
| Base | `main` after PR #53, SPEC Draft 0.33 |
| Result | SPEC Draft 0.34; renderer split, policy validation, three sample fixes |

## Method

The review read the vocabulary schema, validator, generator prompts and renderers against SPEC sections 4 and 6. An audit script checked every target of the ten authored vocabulary briefs for the following:

- Word class, gender and number.
- Article agreement in exam forms and variants.
- Teaching form against exam forms.
- Article exceptions.
- Duplicate native translations.
- Group sizes.

The P1-10 contract test still plays all twenty samples to 100 % and to 0 %.

## Composition (acceptance 1)

`src/session/renderers.tsx` held every renderer. It is now split by what is actually shared:

| Module | Holds | Used by |
| --- | --- | --- |
| `controls.tsx` | the four answer controls (text, choice, token order, error spot), unit rows with practice feedback, gaps, Listen/Install language, and `UnitsRenderer` | every scored vocabulary and grammar item |
| `vocabularyRenderers.tsx` | target table, introduction, flashcards, overview, and the gender page with its reviewed overview; one shared gender label | vocabulary presentation pages |
| `grammarRenderers.tsx` | explanation with form table, production-feedback placeholder | grammar presentation pages |
| `renderers.tsx` | the typed registry only | session host |

The interaction differences stay visible:
- Matching and gender rows are select choices.
- Listening choice uses radio choices with audio.
- Typed gaps show the noninteractive reference words.
- The gender page adds its reviewed table only in feedback.

P2-02 and P2-03 replace single entries, such as drag-and-drop matching and flipping flashcards, without touching the host or the scoring.

## Content-driven policies (acceptance 2)

| Case | Policy | Enforcement |
| --- | --- | --- |
| Non-nouns | no gender, number or article exception; no gender selector; plain overview when a lesson has no nouns | validator (D8), `genderOverview.scored` must equal "has nouns" |
| Noun articles | `un`/`une` agree with the accepted genders in the singular and `des` the plural; a singular target never accepts a plural form | **new:** `frArticleIssue` for exam forms |
| Accepted variants | the final exam always asks for the indefinite article, so full-credit variants carry the agreeing indefinite article too; definite (`le nom`) and bare forms are not accepted, and accent-less answers are left to the classifier (50 % for accents or capitals) | **new:** validator |
| Teaching form | the displayed form is examined as shown: one of the exam forms, or an adjective's gender pair (`espagnol, espagnole`) | **new:** validator |
| Article exceptions | only when no indefinite form is grammatical (countries, days used without an article, set phrases) | **new:** an exception next to an indefinite exam form is rejected |
| Plural targets | `number: plural` takes `des` (`des ciseaux`) | **new:** validator. No current sample has a plural target. |
| Multiple valid translations | `translations` lists every valid native answer. Matching labels must be unique per group (`nurse (masculine)` / `nurse (feminine)`). Translation exam prompts disambiguate gender pairs. Typed gaps admit exactly one reference word. `ambiguityNote` explains the remaining cases. | existing validator checks |
| Large inventories | at most 16 targets per group and 6 groups. Matching items stay within `groupSize`. There is one introduction page per group, all inside the same six-stage lesson (for example `fr-numbers-zero-to-twenty` with 21 targets in groups of 11/6/4). | schema, validator, generator |

### Sample findings, fixed

The briefs were corrected and the content's translation-exam and dictation answers were rebuilt from the briefs, as the generator does. The brief input hashes were restamped. `make sample-lessons` passes.

- **`fr-alphabet-and-accents`:** the teaching forms used the definite article (`la lettre`, `l'accent aigu`) while the exam forms used `une lettre` and `un accent aigu`. The three accent targets declared an article exception although they use `un`. Teaching forms now equal the exam forms, the three exceptions are removed, and bare and definite variants are dropped.
- **`fr-jobs-and-professions`:** every singular noun accepted the plural (`des infirmiers`) and the bare noun (`infirmier`) at full credit. Exam forms are now singular with the agreeing article, and the bare variants are removed.
- **`fr-personal-details-on-a-form`:** bare, accent-less and definite variants (`nom`, `prenom`, `le nom`) are removed.

These three samples changed after the P1-08 review and are worth a quick look.

The brief prompt (`brief-v3`) now states the same rules so that newly generated briefs follow them.

## Six-stage roles (acceptance 3)

| Stage | Role | Scored |
| --- | --- | --- |
| 1 Introduction, 2 Flashcards | presentation | completion only |
| 3 Matching | practice | yes (35 % share) |
| 4 Gender + reviewed overview (nouns) / plain overview (no nouns) | practice / presentation | nouns only |
| 5 Typed gaps (+ listening choice) | practice | yes |
| 6 Final exam (translation + listening dictation) | exam | yes (65 % share), timed per page |

The validator enforces the stage order and roles. The contract test confirms that every sample completes and scores as specified.

## Open items

- P2-02: flashcard reveal progress should use the session's `revealed` slot (P1-10).
- P2-03: hide gender, article and audio clues while gender is being answered.
- P2-05: formatted introduction text.

## Validation

- `make test`: 225 tests pass, including the new article-policy test.
- `make sample-lessons`: all twenty samples are valid and current.
