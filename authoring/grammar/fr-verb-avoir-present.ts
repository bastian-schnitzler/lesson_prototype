import { gc, gt, L, person, pm, pt, sp, wo, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const FORMS_R = ['rule-avoir-forms'];
const AGE = ['rule-avoir-age'];
const HAVE = ['rule-avoir-possession'];
const FORMS = { je: 'ai', tu: 'as', il: 'a', nous: 'avons', vous: 'avez', ils: 'ont' } as const;
type P = keyof typeof FORMS;
const PERSON = { je: ['1st person singular', '1re personne du singulier', '1. Person Singular'], tu: ['2nd person singular', '2e personne du singulier', '2. Person Singular'], il: ['3rd person singular', '3e personne du singulier', '3. Person Singular'], nous: ['1st person plural', '1re personne du pluriel', '1. Person Plural'], vous: ['2nd person plural', '2e personne du pluriel', '2. Person Plural'], ils: ['3rd person plural', '3e personne du pluriel', '3. Person Plural'] } as const;

/** Why a subject takes its form of avoir. */
const why = (p: P, subject?: string) => {
  const form = FORMS[p];
  if (p === 'je') return L('With je, avoir is ai, and je becomes j’ before the vowel: j’ai.', 'Avec je, avoir devient ai, et je s’élide devant la voyelle : j’ai.', 'Zu je gehört ai; vor dem Vokal wird je zu j’: j’ai.');
  if (!subject) {
    const s = p === 'il' ? 'il, elle, on' : p === 'ils' ? 'ils, elles' : p;
    return L(`With ${s}, avoir is ${form}.`, `Avec ${s}, avoir devient ${form}.`, `Zu ${s} gehört die Form ${form}.`);
  }
  const [en, fr, de] = PERSON[p];
  return L(`${subject} is ${en} (like ${p}), so avoir is ${form}.`, `${subject} est à la ${fr} (comme ${p}) : avoir devient ${form}.`, `${subject} ist ${de} (wie ${p}), also heißt avoir ${form}.`);
};
const aNoAccent = L('With il, elle, on, avoir is a – without an accent; à with an accent grave is the preposition.', 'Avec il, elle, on, avoir devient a, sans accent ; à avec un accent grave est la préposition.', 'Zu il, elle, on gehört a, ohne Akzent; à mit Accent grave ist die Präposition.');
const ontNotSont = (s: string) => L(`${s}: ils ont (avoir, liaison [z]) – ils sont belongs to être.`, `${s} : ils ont (avoir, liaison [z]) – ils sont appartient à être.`, `${s}: ils ont (avoir, Bindung [z]) – ils sont gehört zu être.`);
/** Subject and form as written: an elided pronoun takes no space (j’ai). */
const join = (s: string, form: string) => (s.endsWith('’') ? `${s}${form}` : `${s} ${form}`);
const age = (s: string, form: string) => L(`French gives age with avoir + number + ans: ${join(s, form)} … ans. Être is wrong here.`, `En français, l’âge se dit avec avoir + nombre + ans : ${join(s, form)} … ans. Être est faux ici.`, `Das Alter steht im Französischen mit avoir + Zahl + ans: ${join(s, form)} … ans. Être ist hier falsch.`);
const have = (s: string, form: string) => L(`Possession uses avoir: ${join(s, form)} + noun.`, `La possession s’exprime avec avoir : ${join(s, form)} + nom.`, `Besitz drückt man mit avoir aus: ${join(s, form)} + Nomen.`);
const hint = (en: string, fr: string, de: string) => L(en, fr, de);

export default {
  id: 'fr-verb-avoir-present',
  newVerbs: [{ infinitive: 'avoir', translations: { en: 'to have', de: 'haben' } }],
  blocks: [
    {
      id: 'block-forms',
      exercises: [
        { id: 'ex-forms-persons', type: 'grammar_person_matching', items: [
          person(FORMS_R, 'forms', [
            ['je (j’)', 'ai', why('je')], ['tu', 'as', why('tu')], ['il / elle / on', 'a', aNoAccent],
            ['nous', 'avons', why('nous')], ['vous', 'avez', why('vous')], ['ils / elles', 'ont', ontNotSont('Ils ont')],
          ]),
        ] },
        { id: 'ex-forms-match', type: 'grammar_pronoun_form_match', items: [
          pm(FORMS_R, [['tu', 'as', why('tu')], ['elle', 'a', aNoAccent], ['nous', 'avons', why('nous')]], ['avez']),
          pm(FORMS_R, [['vous', 'avez', why('vous')], ['ils', 'ont', ontNotSont('Ils ont')], ['j’', 'ai', why('je')]], ['as']),
        ] },
        { id: 'ex-forms-typing', type: 'grammar_pronoun_form_typing', items: [
          pt(FORMS_R, [['j’', 'ai', why('je')], ['tu', 'as', why('tu')], ['on', 'a', aNoAccent]]),
          pt(FORMS_R, [['nous', 'avons', why('nous')], ['vous', 'avez', why('vous')], ['elles', 'ont', ontNotSont('Elles ont')]]),
        ] },
        { id: 'ex-forms-choice', type: 'grammar_gap_choice', items: [
          gc(FORMS_R, 'J’', 'ai', ['as', 'a', 'avez'], 'un stylo.', why('je')),
          gc(FORMS_R, 'Tu', 'as', ['a', 'ai', 'ont'], 'une question ?', why('tu')),
        ] },
      ],
    },
    {
      id: 'block-usage',
      exercises: [
        { id: 'ex-usage-choice', type: 'grammar_gap_choice', items: [
          gc(AGE, 'J’', 'ai', ['suis', 'as', 'est'], 'vingt ans.', age('j’', 'ai')),
          gc(AGE, 'Mon frère', 'a', ['est', 'as', 'ont'], 'douze ans.', age('il', 'a')),
        ] },
        { id: 'ex-usage-typing', type: 'grammar_gap_typing', items: [
          gt(AGE, 'Ma grand-mère', 'a', 'quatre-vingts ans.', age('elle', 'a'), hint('avoir', 'avoir', 'avoir')),
          gt(AGE, 'J’', 'ai', 'dix-huit ans.', age('j’', 'ai'), hint('avoir', 'avoir', 'avoir')),
        ] },
        { id: 'ex-usage-order', type: 'grammar_word_order', items: [
          wo(AGE, ['J’ai', 'vingt-cinq', 'ans'], age('j’', 'ai')),
          wo(AGE, ['Ma', 'fille', 'a', 'sept', 'ans'], age('elle', 'a')),
        ] },
        { id: 'ex-usage-spot', type: 'grammar_error_spotter', items: [
          sp(AGE, ['J’ai', 'trente', 'ans'], 0, 'Je suis', age('j’', 'ai'), ['J’ai', 'Je suis', 'J’as']),
          sp(HAVE, ['Tu', 'as', 'un', 'stylo'], 1, 'a', why('tu')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-forms', type: 'grammar_pronoun_form_typing', items: [
      pt(FORMS_R, [['j’', 'ai', why('je')], ['tu', 'as', why('tu')], ['elle', 'a', aNoAccent]]),
      pt(FORMS_R, [['nous', 'avons', why('nous')], ['vous', 'avez', why('vous')], ['ils', 'ont', ontNotSont('Ils ont')]]),
    ] },
    { pageId: 'exam-sentences', type: 'grammar_gap_typing', items: [
      gt(FORMS_R, 'Tu', 'as', 'un dictionnaire ?', why('tu')),
      gt(FORMS_R, 'Mon père', 'a', 'une moto.', why('il', 'Mon père')),
      gt(FORMS_R, 'Nous', 'avons', 'faim.', why('nous')),
    ] },
    { pageId: 'exam-age', type: 'grammar_gap_typing', items: [
      gt(AGE, 'J’', 'ai', 'quarante ans.', age('j’', 'ai')),
      gt(AGE, 'Ma mère', 'a', 'cinquante ans.', age('elle', 'a')),
      gt(AGE, 'Tu', 'as', 'seize ans ?', age('tu', 'as')),
    ] },
    { pageId: 'exam-order', type: 'grammar_word_order', items: [
      wo(AGE, ['Mon', 'grand-père', 'a', 'soixante', 'ans'], age('il', 'a')),
      wo(HAVE, ['Nous', 'avons', 'deux', 'enfants'], have('nous', 'avons')),
      wo(HAVE, ['Tu', 'as', 'un', 'frère', '?'], have('tu', 'as')),
    ] },
  ],
} satisfies LessonDefinition;
