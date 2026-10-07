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
const age = (s: string, form: string) => L(`French gives age with avoir + number + ans: ${s} ${form} … ans. Être is wrong here.`, `En français, l’âge se dit avec avoir + nombre + ans : ${s} ${form} … ans. Être est faux ici.`, `Das Alter steht im Französischen mit avoir + Zahl + ans: ${s} ${form} … ans. Être ist hier falsch.`);
const have = (s: string, form: string) => L(`Possession uses avoir: ${s} ${form} + noun.`, `La possession s’exprime avec avoir : ${s} ${form} + nom.`, `Besitz drückt man mit avoir aus: ${s} ${form} + Nomen.`);
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
          person(FORMS_R, 'translation', [
            [{ en: 'I have', de: 'ich habe' }, 'j’ai', why('je')], [{ en: 'you have (one friend)', de: 'du hast' }, 'tu as', why('tu')], [{ en: 'he has', de: 'er hat' }, 'il a', aNoAccent],
            [{ en: 'we have', de: 'wir haben' }, 'nous avons', why('nous')], [{ en: 'you have (several people)', de: 'ihr habt' }, 'vous avez', why('vous')], [{ en: 'they have (women)', de: 'sie haben (Frauen)' }, 'elles ont', ontNotSont('Elles ont')],
          ]),
        ] },
        { id: 'ex-forms-match', type: 'grammar_pronoun_form_match', items: [
          pm(FORMS_R, [['tu', 'as', why('tu')], ['elle', 'a', aNoAccent], ['nous', 'avons', why('nous')]], ['avez']),
          pm(FORMS_R, [['vous', 'avez', why('vous')], ['ils', 'ont', ontNotSont('Ils ont')], ['j’', 'ai', why('je')]], ['as']),
        ] },
        { id: 'ex-forms-typing', type: 'grammar_pronoun_form_typing', items: [
          pt(FORMS_R, [['j’', 'ai', why('je')], ['tu', 'as', why('tu')], ['on', 'a', aNoAccent]]),
          pt(FORMS_R, [['nous', 'avons', why('nous')], ['vous', 'avez', why('vous')], ['elles', 'ont', ontNotSont('Elles ont')]]),
          pt(FORMS_R, [['il', 'a', aNoAccent], ['ils', 'ont', ontNotSont('Ils ont')], ['vous', 'avez', why('vous')]]),
        ] },
        { id: 'ex-forms-choice', type: 'grammar_gap_choice', items: [
          gc(FORMS_R, 'J’', 'ai', ['as', 'a', 'avez'], 'un stylo.', why('je')),
          gc(FORMS_R, 'Tu', 'as', ['a', 'ai', 'ont'], 'une question ?', why('tu')),
          gc(FORMS_R, 'Il', 'a', ['as', 'à', 'ont'], 'un livre.', aNoAccent),
          gc(FORMS_R, 'Nous', 'avons', ['avez', 'ont', 'sommes'], 'cours à neuf heures.', why('nous')),
          gc(FORMS_R, 'Vous', 'avez', ['avons', 'êtes', 'ont'], 'une voiture ?', why('vous')),
          gc(FORMS_R, 'Elles', 'ont', ['sont', 'a', 'avons'], 'deux chats.', ontNotSont('Elles ont deux chats')),
          gc(FORMS_R, 'On', 'a', ['avons', 'as', 'ont'], 'le temps.', L('On takes the 3rd person singular form: on a.', 'On prend la forme de la 3e personne du singulier : on a.', 'On steht mit der Form der 3. Person Singular: on a.')),
          gc(FORMS_R, 'Mes amis', 'ont', ['sont', 'avez', 'a'], 'une maison.', why('ils', 'Mes amis')),
        ] },
      ],
    },
    {
      id: 'block-usage',
      exercises: [
        { id: 'ex-usage-choice', type: 'grammar_gap_choice', items: [
          gc(AGE, 'J’', 'ai', ['suis', 'as', 'est'], 'vingt ans.', age('j’', 'ai')),
          gc(AGE, 'Mon frère', 'a', ['est', 'as', 'ont'], 'douze ans.', age('il', 'a')),
          gc(AGE, 'Tu', 'as', ['es', 'a', 'avez'], 'quel âge ?', age('tu', 'as')),
          gc(AGE, 'Nous', 'avons', ['sommes', 'avez', 'ont'], 'trente ans.', age('nous', 'avons')),
          gc(HAVE, 'Vous', 'avez', ['êtes', 'avons', 'a'], 'un chien ?', have('vous', 'avez')),
          gc(HAVE, 'Ils', 'ont', ['sont', 'avez', 'a'], 'un appartement à Paris.', have('ils', 'ont')),
          gc(HAVE, 'Elle', 'a', ['est', 'ai', 'avons'], 'une sœur.', have('elle', 'a')),
          gc(HAVE, 'J’', 'ai', ['suis', 'a', 'ont'], 'un ordinateur.', have('j’', 'ai')),
        ] },
        { id: 'ex-usage-typing', type: 'grammar_gap_typing', items: [
          gt(AGE, 'Ma grand-mère', 'a', 'quatre-vingts ans.', age('elle', 'a'), hint('avoir', 'avoir', 'avoir')),
          gt(AGE, 'J’', 'ai', 'dix-huit ans.', age('j’', 'ai'), hint('avoir', 'avoir', 'avoir')),
          gt(AGE, 'Vous', 'avez', 'quel âge ?', age('vous', 'avez'), hint('avoir', 'avoir', 'avoir')),
          gt(AGE, 'Les jumeaux', 'ont', 'six ans.', age('ils', 'ont'), hint('avoir', 'avoir', 'avoir')),
          gt(HAVE, 'Nous', 'avons', 'un jardin.', have('nous', 'avons'), hint('avoir', 'avoir', 'avoir')),
          gt(HAVE, 'Tu', 'as', 'un vélo ?', have('tu', 'as'), hint('avoir', 'avoir', 'avoir')),
          gt(HAVE, 'Paul', 'a', 'deux enfants.', have('il', 'a'), hint('avoir', 'avoir', 'avoir')),
          gt(HAVE, 'Elles', 'ont', 'un examen demain.', have('elles', 'ont'), hint('avoir', 'avoir', 'avoir')),
        ] },
        { id: 'ex-usage-order', type: 'grammar_word_order', items: [
          wo(AGE, ['J’ai', 'vingt-cinq', 'ans'], age('j’', 'ai')),
          wo(AGE, ['Ma', 'fille', 'a', 'sept', 'ans'], age('elle', 'a')),
          wo(AGE, ['Tu', 'as', 'quel', 'âge', '?'], L('Asking someone’s age: tu as quel âge ? – avoir again, never être.', 'Pour demander l’âge : tu as quel âge ? – encore avoir, jamais être.', 'Nach dem Alter fragen: tu as quel âge ? – wieder avoir, nie être.')),
          wo(HAVE, ['Nous', 'avons', 'un', 'grand', 'chien'], have('nous', 'avons')),
          wo(HAVE, ['Vous', 'avez', 'une', 'question', '?'], have('vous', 'avez')),
          wo(HAVE, ['Ils', 'ont', 'une', 'petite', 'voiture'], have('ils', 'ont')),
        ] },
        { id: 'ex-usage-spot', type: 'grammar_error_spotter', items: [
          sp(AGE, ['J’ai', 'trente', 'ans'], 0, 'Je suis', age('j’', 'ai'), ['J’ai', 'Je suis', 'J’as']),
          sp(AGE, ['Il', 'a', 'dix', 'ans'], 1, 'est', age('il', 'a')),
          sp(AGE, ['Nous', 'avons', 'vingt', 'ans'], 1, 'sommes', age('nous', 'avons')),
          sp(HAVE, ['Tu', 'as', 'un', 'stylo'], 1, 'a', why('tu')),
          sp(HAVE, ['Elles', 'ont', 'un', 'chat'], 1, 'sont', ontNotSont('Elles ont un chat'), ['ont', 'sont', 'a']),
          sp(HAVE, ['Vous', 'avez', 'une', 'maison'], 1, 'avons', why('vous')),
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
      gt(FORMS_R, 'Vous', 'avez', 'raison.', why('vous')),
      gt(FORMS_R, 'Les étudiants', 'ont', 'un professeur sympa.', why('ils', 'Les étudiants')),
      gt(HAVE, 'J’', 'ai', 'une idée.', have('j’', 'ai')),
      gt(HAVE, 'On', 'a', 'un problème.', have('on', 'a')),
      gt(HAVE, 'Elles', 'ont', 'trois frères.', have('elles', 'ont')),
    ] },
    { pageId: 'exam-age', type: 'grammar_gap_typing', items: [
      gt(AGE, 'J’', 'ai', 'quarante ans.', age('j’', 'ai')),
      gt(AGE, 'Ma mère', 'a', 'cinquante ans.', age('elle', 'a')),
      gt(AGE, 'Tu', 'as', 'seize ans ?', age('tu', 'as')),
      gt(AGE, 'Nous', 'avons', 'le même âge.', age('nous', 'avons')),
      gt(AGE, 'Vous', 'avez', 'vingt et un ans.', age('vous', 'avez')),
      gt(AGE, 'Mes cousins', 'ont', 'onze ans.', age('ils', 'ont')),
    ] },
    { pageId: 'exam-order', type: 'grammar_word_order', items: [
      wo(AGE, ['Mon', 'grand-père', 'a', 'soixante', 'ans'], age('il', 'a')),
      wo(HAVE, ['Nous', 'avons', 'deux', 'enfants'], have('nous', 'avons')),
      wo(HAVE, ['Tu', 'as', 'un', 'frère', '?'], have('tu', 'as')),
      wo(AGE, ['Elle', 'a', 'dix-neuf', 'ans'], age('elle', 'a')),
    ] },
  ],
} satisfies LessonDefinition;
