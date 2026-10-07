# P3-01 review of grammar renderer composition and mixed exams

| Field | Value |
| --- | --- |
| Issue | P3-01: Review grammar renderer composition and mixed exam support (#26) |
| Date | 2026-10-08 |
| Reviewer | Claude (Opus 5.5) in Claude Code |
| Base | `46bf8ec` (main after PR #64), SPEC Draft 0.41 |
| Result | SPEC Draft 0.42; two new validation rules, prompt rule and tests listed below |

## Scope and method

The review compared the grammar schema (`src/schemas/grammar.ts`), plan building (`src/domain/session/plan.ts`), the shared scorer (`scoreUnit` in `src/domain/session/session.ts`), the renderer registry and the validation rules with the acceptance criteria of P3-01. The evidence is the ten grammar samples in `content/` and the fixtures `fr-verb-etre-present` and `fr-negation-ne-pas`. The samples cover four topic families:

- conjugation: être, avoir, -er verbs;
- articles and nouns: definite and indefinite articles, plurals;
- adverbs: here, there, now, tomorrow;
- syntax: negation, yes/no questions, subject pronouns.

The ten samples have 190 pages. Their items by type:

| Item type | Practice | Exam |
| --- | --- | --- |
| `grammar_gap_choice` | 59 | – |
| `grammar_gap_typing` | 39 | 66 |
| `grammar_pronoun_form_match` | 22 | – |
| `grammar_pronoun_form_typing` | 10 | 21 |
| `grammar_word_order` | 11 | 3 |
| `grammar_error_spotter` | – (fixtures only) | – |

Five samples have mixed exams: the être, avoir and -er verbs lessons and subject pronouns (typed forms and gaps), and yes/no questions (word order and gaps).

## Findings

| Acceptance | Finding | Action |
| --- | --- | --- |
| All six practice types fit the host/result model | Each type becomes plan units of one of four kinds. Typed gaps and pronoun typing become `text` units; gap choice and pronoun match become `choice` units; word order becomes `order` units; the error spotter becomes `spot` units. Each unit carries its explanation and `ruleIds`; results and the review view read only units. Every type is in the renderer registry (baseline `UnitsRenderer`; P3-02 to P3-04 replace the interactions). | Test: every practice type of the fixture is planned with an item-level explanation. |
| Exam containers mix typed gaps, typed pronoun forms and word order without separate grading rules | The exam step holds pages of different types. Each page has one type and its own countdown from the brief plan. All units go through the one `scoreUnit`; the results aggregate the exam share by possible points. | Test: an exam with all three types reaches 100 % through the shared scorer. Prompt now says that exam pages may mix the three types. |
| Duplicate form text, alternative forms and orders | Pronoun match tokens may repeat a text; every token whose text is a valid form counts. Typed forms list alternatives in `accepted.answers`. Word order compares sentences, so repeated words in either token order and any `acceptedOrders` entry count. | Test with duplicate tokens (`est`, `est`), alternative forms (`payes`, `paies`) and repeated words in an alternative order. |
| Rule coverage | Briefs already require every rule to be taught and examined. Content was not checked against the plan: an item could assess a rule its exercise did not plan, or leave a planned rule untested. | New content check: the items of each exercise step and exam page assess exactly the rules that the brief plans for it, together covering all of them. Explanation items cite only rules of their block. |
| Item-level correction feedback | Every scored item (each row of the pronoun types) has a required `answerExplanation` in three locales, checked for presence and locale parity. | No change. |
| Pronoun matching/typing only for appropriate objectives | Only the prompt asked for useful types; nothing prevented conjugation rows in an article, adverb or negation lesson. | New brief check: `grammar_pronoun_form_match` and `grammar_pronoun_form_typing` are allowed only for the topics `pronouns`, `verbs_morphology` and `verb_usage`, in practice and exam. The prompt states the rule (`brief-v5`). All ten samples already comply. |

## Not changed

- Each exam page keeps one item type. Mixing happens across pages, so every page has one instruction and one countdown, as in the mixed-exam mockup.
- The error spotter does not appear in the samples. Its contract is covered by the fixture and by the validation and scoring tests; P3-04 builds the interaction.
