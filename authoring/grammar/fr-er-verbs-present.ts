import { gc, gt, L, person, pt, sp, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const SG = ['rule-er-singular'];
const PL = ['rule-er-plural'];
const SILENT = ['rule-silent-endings'];
const ENDING = { je: 'e', tu: 'es', il: 'e', nous: 'ons', vous: 'ez', ils: 'ent' } as const;
type P = keyof typeof ENDING;
const NAME = { je: 'je', tu: 'tu', il: 'il, elle, on', nous: 'nous', vous: 'vous', ils: 'ils, elles' } as const;

/** Stem + ending explanation: parler → parl- + -es for tu. */
const why = (p: P, verb: string, subject?: string) => {
  const stem = verb.slice(0, -2);
  const form = stem + ENDING[p];
  const who = subject ? `${subject} (like ${p})` : NAME[p];
  const whoFr = subject ? `${subject} (comme ${p})` : NAME[p];
  const whoDe = subject ? `${subject} (wie ${p})` : NAME[p];
  const elision = p === 'je' && /^[aeéèêhiouy]/.test(form) ? [' Je becomes j’ before a vowel or a silent h.', ' Je devient j’ devant une voyelle ou un h muet.', ' Vor Vokal oder stummem h wird je zu j’.'] : ['', '', ''];
  return L(
    `${verb}: drop -er and add -${ENDING[p]} for ${who}: ${form}.${elision[0]}`,
    `${verb} : on enlève -er et on ajoute -${ENDING[p]} pour ${whoFr} : ${form}.${elision[1]}`,
    `${verb}: -er weg, für ${whoDe} die Endung -${ENDING[p]}: ${form}.${elision[2]}`,
  );
};
/** The written ending matters although it is not pronounced. */
const silent = (form: string, p: P) => L(
  `${form}: the ending -${ENDING[p]} is silent, but it must be written for ${NAME[p]}.`,
  `${form} : la terminaison -${ENDING[p]} ne se prononce pas, mais on l’écrit avec ${NAME[p]}.`,
  `${form}: Die Endung -${ENDING[p]} ist stumm, wird aber bei ${NAME[p]} geschrieben.`,
);
const inf = (verb: string) => L(`Verb: ${verb}`, `Verbe : ${verb}`, `Verb: ${verb}`);

export default {
  id: 'fr-er-verbs-present',
  newVerbs: [
    { infinitive: 'parler', translations: { en: 'to speak', de: 'sprechen' } },
    { infinitive: 'habiter', translations: { en: 'to live (somewhere)', de: 'wohnen' } },
    { infinitive: 'aimer', translations: { en: 'to like, to love', de: 'mögen, lieben' } },
    { infinitive: 'travailler', translations: { en: 'to work', de: 'arbeiten' } },
    { infinitive: 'regarder', translations: { en: 'to watch, to look at', de: 'ansehen, anschauen' } },
    { infinitive: 'écouter', translations: { en: 'to listen (to)', de: 'hören, zuhören' } },
    { infinitive: 'chanter', translations: { en: 'to sing', de: 'singen' } },
    { infinitive: 'danser', translations: { en: 'to dance', de: 'tanzen' } },
    { infinitive: 'jouer', translations: { en: 'to play', de: 'spielen' } },
    { infinitive: 'étudier', translations: { en: 'to study', de: 'studieren, lernen' } },
  ],
  blocks: [
    {
      id: 'block-singular-forms',
      exercises: [
        { id: 'ex-singular-persons', type: 'grammar_person_matching', items: [
          person(SG, 'forms', [['je', 'parle', why('je', 'parler')], ['tu', 'parles', why('tu', 'parler')], ['il / elle / on', 'parle', why('il', 'parler')]], 'sg'),
          person(SG, 'forms', [['j’', 'habite', why('je', 'habiter')], ['tu', 'habites', why('tu', 'habiter')], ['il / elle / on', 'habite', why('il', 'habiter')]], 'sg'),
        ] },
        { id: 'ex-singular-choice', type: 'grammar_gap_choice', items: [
          gc(SG, 'Je', 'regarde', ['regardes', 'regardons', 'regardez'], 'la télé.', why('je', 'regarder'), inf('regarder')),
          gc(SILENT, 'Tu', 'chantes', ['chante', 'chantez', 'chantons'], 'bien.', silent('tu chantes', 'tu'), inf('chanter')),
          gc(SG, 'Elle', 'travaille', ['travailles', 'travaillez', 'travaillons'], 'dans une banque.', why('il', 'travailler', 'Elle'), inf('travailler')),
        ] },
        { id: 'ex-singular-typing', type: 'grammar_gap_typing', items: [
          gt(SG, 'Je', 'parle', 'français et anglais.', why('je', 'parler'), inf('parler')),
          gt(SG, 'Tu', 'habites', 'à Lyon ?', why('tu', 'habiter'), inf('habiter')),
          gt(SG, 'Il', 'regarde', 'un film.', why('il', 'regarder'), inf('regarder')),
        ] },
        { id: 'ex-singular-spot', type: 'grammar_error_spotter', items: [
          sp(SILENT, ['Tu', 'parles', 'vite'], 1, 'parle', silent('tu parles', 'tu')),
          sp(SG, ['Je', 'travaille', 'ici'], 1, 'travailles', why('je', 'travailler')),
          sp(SG, ['Il', 'habite', 'à', 'Nice'], 1, 'habites', why('il', 'habiter'), ['habite', 'habites', 'habitez']),
        ] },
      ],
    },
    {
      id: 'block-plural-forms',
      exercises: [
        { id: 'ex-persons', type: 'grammar_person_matching', items: [
          person([...SG, ...PL], 'forms', [
            ['j’', 'aime', why('je', 'aimer')], ['tu', 'aimes', why('tu', 'aimer')], ['il / elle / on', 'aime', why('il', 'aimer')],
            ['nous', 'aimons', why('nous', 'aimer')], ['vous', 'aimez', why('vous', 'aimer')], ['ils / elles', 'aiment', why('ils', 'aimer')],
          ]),
        ] },
        { id: 'ex-plural-forms', type: 'grammar_pronoun_form_typing', items: [
          pt(PL, [['nous (travailler)', 'travaillons', why('nous', 'travailler')], ['vous (travailler)', 'travaillez', why('vous', 'travailler')], ['ils (travailler)', 'travaillent', why('ils', 'travailler')]]),
          pt(PL, [['nous (chanter)', 'chantons', why('nous', 'chanter')], ['vous (regarder)', 'regardez', why('vous', 'regarder')], ['elles (habiter)', 'habitent', why('ils', 'habiter', 'Elles')]]),
        ] },
        { id: 'ex-plural-choice', type: 'grammar_gap_choice', items: [
          gc(PL, 'Nous', 'parlons', ['parlez', 'parlent', 'parle'], 'italien.', why('nous', 'parler'), inf('parler')),
          gc(PL, 'Vous', 'habitez', ['habitons', 'habitent', 'habites'], 'à Genève ?', why('vous', 'habiter'), inf('habiter')),
          gc(PL, 'Ils', 'travaillent', ['travaillons', 'travaillez', 'travailles'], 'le dimanche.', why('ils', 'travailler'), inf('travailler')),
          gc(PL, 'Mes parents', 'regardent', ['regardez', 'regardons', 'regarde'], 'les infos.', why('ils', 'regarder', 'Mes parents'), inf('regarder')),
        ] },
        { id: 'ex-plural-typing', type: 'grammar_gap_typing', items: [
          gt(PL, 'Nous', 'habitons', 'près de la gare.', why('nous', 'habiter'), inf('habiter')),
          gt(PL, 'Vous', 'parlez', 'espagnol ?', why('vous', 'parler'), inf('parler')),
          gt(PL, 'Ils', 'aiment', 'le sport.', why('ils', 'aimer'), inf('aimer')),
          gt(PL, 'Les enfants', 'jouent', 'dans le jardin.', why('ils', 'jouer', 'Les enfants'), inf('jouer')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-forms', type: 'grammar_pronoun_form_typing', items: [
      pt([...SG, ...SILENT], [['je (chanter)', 'chante', why('je', 'chanter')], ['tu (chanter)', 'chantes', silent('tu chantes', 'tu')], ['il (chanter)', 'chante', why('il', 'chanter')]]),
      pt(PL, [['nous (jouer)', 'jouons', why('nous', 'jouer')], ['vous (jouer)', 'jouez', why('vous', 'jouer')], ['elles (jouer)', 'jouent', why('ils', 'jouer', 'Elles')]]),
    ] },
    { pageId: 'exam-singular', type: 'grammar_gap_typing', items: [
      gt(SG, 'Je', 'travaille', 'à la poste.', why('je', 'travailler')),
      gt(SILENT, 'Tu', 'regardes', 'la carte ?', silent('tu regardes', 'tu')),
      gt(SG, 'Elle', 'habite', 'à Montréal.', why('il', 'habiter', 'Elle')),
    ] },
    { pageId: 'exam-plural', type: 'grammar_gap_typing', items: [
      gt(PL, 'Nous', 'travaillons', 'ensemble.', why('nous', 'travailler')),
      gt(PL, 'Vous', 'aimez', 'le café ?', why('vous', 'aimer')),
      gt(PL, 'Ils', 'parlent', 'chinois.', why('ils', 'parler')),
    ] },
  ],
} satisfies LessonDefinition;
