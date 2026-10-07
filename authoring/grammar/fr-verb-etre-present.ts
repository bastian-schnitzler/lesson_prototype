import { gc, gt, L, person, pt, sp, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const SG = ['rule-singular-forms'];
const PL = ['rule-plural-forms'];
const LIAISON = ['rule-liaison-pronunciation'];
const FORMS = { je: 'suis', tu: 'es', il: 'est', nous: 'sommes', vous: 'êtes', ils: 'sont' } as const;
type P = keyof typeof FORMS;

/** Why a subject takes its form of être, in every interface language. */
const why = (p: P, subject?: string) => {
  const s = subject ?? (p === 'il' ? 'il, elle, on' : p === 'ils' ? 'ils, elles' : p);
  const form = FORMS[p];
  const person = { je: ['1st person singular', '1re personne du singulier', '1. Person Singular'], tu: ['2nd person singular', '2e personne du singulier', '2. Person Singular'], il: ['3rd person singular', '3e personne du singulier', '3. Person Singular'], nous: ['1st person plural', '1re personne du pluriel', '1. Person Plural'], vous: ['2nd person plural', '2e personne du pluriel', '2. Person Plural'], ils: ['3rd person plural', '3e personne du pluriel', '3. Person Plural'] }[p];
  return subject
    ? L(`${subject} is ${person[0]} (like ${p}), so être is ${form}.`, `${subject} est à la ${person[1]} (comme ${p}) : être devient ${form}.`, `${subject} ist ${person[2]} (wie ${p}), also heißt être ${form}.`)
    : L(`With ${s}, être is ${form}.`, `Avec ${s}, être devient ${form}.`, `Zu ${s} gehört die Form ${form}.`);
};
const vousAccent = L('With vous, être is êtes, with an accent circonflexe on the first e.', 'Avec vous, être devient êtes, avec un accent circonflexe sur le premier e.', 'Zu vous gehört êtes, mit Accent circonflexe auf dem ersten e.');
const sontNotOnt = (subject: string) => L(`${subject}: ils sont (être, [s]) – ils ont belongs to avoir.`, `${subject} : ils sont (être, [s]) – ils ont appartient à avoir.`, `${subject}: ils sont (être, [s]) – ils ont gehört zu avoir.`);

const hintPerson = (en: string, fr: string, de: string) => L(en, fr, de);

export default {
  id: 'fr-verb-etre-present',
  newVerbs: [{ infinitive: 'être', translations: { en: 'to be', de: 'sein' } }],
  blocks: [
    {
      id: 'block-singular',
      exercises: [
        { id: 'ex-sg-persons', type: 'grammar_person_matching', items: [
          person(SG, 'translation', [
            [{ en: 'I am', de: 'ich bin' }, 'je suis', why('je')],
            [{ en: 'you are (one friend)', de: 'du bist' }, 'tu es', why('tu')],
            [{ en: 'he is', de: 'er ist' }, 'il est', why('il')],
          ], 'sg'),
          person(SG, 'forms', [
            ['je', 'suis', why('je')],
            ['tu', 'es', L('With tu, être is es – without a t.', 'Avec tu, être devient es, sans t.', 'Zu tu gehört es, ohne t.')],
            ['elle', 'est', why('il', 'Elle')],
          ], 'sg'),
        ] },
        { id: 'ex-sg-choice', type: 'grammar_gap_choice', items: [
          gc(SG, 'Je', 'suis', ['es', 'est', 'sommes'], 'étudiant.', why('je')),
          gc(SG, 'Tu', 'es', ['est', 'suis', 'êtes'], 'fatigué ?', L('With tu, être is es; est goes with il, elle, on.', 'Avec tu, être devient es ; est va avec il, elle, on.', 'Zu tu gehört es; est gehört zu il, elle, on.')),
          gc(SG, 'Elle', 'est', ['es', 'suis', 'sont'], 'française.', why('il', 'Elle')),
          gc(SG, 'Marc', 'est', ['es', 'suis', 'êtes'], 'médecin.', why('il', 'Marc')),
          gc(SG, 'On', 'est', ['sommes', 'es', 'suis'], 'en retard.', L('On is grammatically 3rd person singular, so être is est, even when it means "we".', 'On est à la 3e personne du singulier : être devient est, même quand on veut dire « nous ».', 'On ist grammatisch 3. Person Singular, also est – auch wenn es „wir“ bedeutet.')),
          gc(SG, 'Ma sœur', 'est', ['es', 'sont', 'suis'], 'professeure.', why('il', 'Ma sœur')),
          gc(SG, 'Je', 'suis', ['est', 'es', 'êtes'], 'content aujourd’hui.', why('je')),
          gc(SG, 'Tu', 'es', ['suis', 'sont', 'est'], 'de Paris ?', L('With tu, être is es.', 'Avec tu, être devient es.', 'Zu tu gehört es.')),
        ] },
        { id: 'ex-sg-typing', type: 'grammar_gap_typing', items: [
          gt(SG, 'Je', 'suis', 'canadienne.', why('je'), hintPerson('être, 1st person singular', 'être, 1re personne du singulier', 'être, 1. Person Singular')),
          gt(SG, 'Il', 'est', 'cuisinier.', why('il', 'Il'), hintPerson('être, 3rd person singular', 'être, 3e personne du singulier', 'être, 3. Person Singular')),
          gt(SG, 'Tu', 'es', 'malade ?', why('tu'), hintPerson('être, 2nd person singular', 'être, 2e personne du singulier', 'être, 2. Person Singular')),
          gt(SG, 'Le professeur', 'est', 'sympathique.', why('il', 'Le professeur'), hintPerson('être', 'être', 'être')),
          gt(SG, 'Aujourd’hui, je', 'suis', 'à la maison.', why('je'), hintPerson('être', 'être', 'être')),
          gt(SG, 'Anna', 'est', 'italienne.', why('il', 'Anna'), hintPerson('être', 'être', 'être')),
          gt(SG, 'Tu', 'es', 'étudiant ou professeur ?', why('tu'), hintPerson('être', 'être', 'être')),
          gt(SG, 'On', 'est', 'prêts !', L('On takes the 3rd person singular form: on est.', 'On prend la forme de la 3e personne du singulier : on est.', 'On steht mit der Form der 3. Person Singular: on est.'), hintPerson('être', 'être', 'être')),
        ] },
        { id: 'ex-sg-spot', type: 'grammar_error_spotter', items: [
          sp(SG, ['Je', 'suis', 'fatigué'], 1, 'es', L('Je takes suis, not es: je suis.', 'Avec je, on dit suis et non es : je suis.', 'Zu je gehört suis, nicht es: je suis.')),
          sp(SG, ['Tu', 'es', 'belge'], 1, 'est', L('Tu takes es; est is the form for il, elle, on.', 'Avec tu, on écrit es ; est est la forme de il, elle, on.', 'Zu tu gehört es; est ist die Form für il, elle, on.')),
          sp(SG, ['Elle', 'est', 'infirmière'], 1, 'es', why('il', 'Elle'), ['est', 'es', 'suis']),
          sp(SG, ['Paul', 'est', 'mon', 'ami'], 1, 'suis', why('il', 'Paul')),
          sp(SG, ['On', 'est', 'en', 'classe'], 1, 'sommes', L('On always takes the 3rd person singular form est, even when it means "we".', 'On prend toujours la forme est (3e personne du singulier), même au sens de « nous ».', 'On steht immer mit est (3. Person Singular), auch wenn es „wir“ bedeutet.'), ['est', 'sommes', 'es']),
          sp(SG, ['Je', 'suis', 'à', 'Lyon'], 1, 'est', why('je'), ['suis', 'est', 'es']),
        ] },
      ],
    },
    {
      id: 'block-plural',
      exercises: [
        { id: 'ex-pl-persons', type: 'grammar_person_matching', items: [
          person([...SG, ...PL], 'forms', [
            ['je', 'suis', why('je')],
            ['tu', 'es', why('tu')],
            ['il / elle / on', 'est', why('il')],
            ['nous', 'sommes', why('nous')],
            ['vous', 'êtes', vousAccent],
            ['ils / elles', 'sont', why('ils')],
          ]),
          person([...SG, ...PL], 'translation', [
            [{ en: 'I am', de: 'ich bin' }, 'je suis', why('je')],
            [{ en: 'you are (one friend)', de: 'du bist' }, 'tu es', why('tu')],
            [{ en: 'she is', de: 'sie ist (eine Frau)' }, 'elle est', why('il', 'Elle')],
            [{ en: 'we are', de: 'wir sind' }, 'nous sommes', why('nous')],
            [{ en: 'you are (several people)', de: 'ihr seid' }, 'vous êtes', vousAccent],
            [{ en: 'they are (men or a mixed group)', de: 'sie sind (Männer oder gemischt)' }, 'ils sont', why('ils')],
          ]),
        ] },
        { id: 'ex-pl-typing', type: 'grammar_pronoun_form_typing', items: [
          pt(PL, [['nous', 'sommes', why('nous')], ['vous', 'êtes', vousAccent], ['ils', 'sont', why('ils')]]),
          pt(PL, [['elles', 'sont', why('ils', 'Elles')], ['nous', 'sommes', why('nous')], ['vous', 'êtes', vousAccent]]),
          pt(PL, [['vous', 'êtes', vousAccent], ['elles', 'sont', why('ils', 'Elles')], ['nous', 'sommes', why('nous')]]),
        ] },
        { id: 'ex-pl-choice', type: 'grammar_gap_choice', items: [
          gc(PL, 'Nous', 'sommes', ['êtes', 'sont', 'est'], 'étudiants.', why('nous')),
          gc(PL, 'Vous', 'êtes', ['sommes', 'sont', 'es'], 'professeur, madame ?', L('Vous is used for one person politely, too; être is still êtes.', 'Vous s’emploie aussi pour une personne (politesse) ; être reste êtes.', 'Vous gilt auch höflich für eine Person; être bleibt êtes.')),
          gc(LIAISON, 'Ils', 'sont', ['ont', 'sommes', 'est'], 'allemands.', sontNotOnt('Ils sont allemands')),
          gc(PL, 'Paul et Léa', 'sont', ['êtes', 'est', 'sommes'], 'mariés.', why('ils', 'Paul et Léa')),
          gc(PL, 'Toi et moi, nous', 'sommes', ['sont', 'êtes', 'suis'], 'amis.', why('nous', 'Toi et moi')),
          gc(LIAISON, 'Elles', 'sont', ['ont', 'est', 'êtes'], 'en vacances.', sontNotOnt('Elles sont en vacances')),
          gc(PL, 'Vous', 'êtes', ['sont', 'sommes', 'est'], 'prêts, les enfants ?', vousAccent),
          gc(PL, 'Mes parents', 'sont', ['sommes', 'êtes', 'est'], 'à Marseille.', why('ils', 'Mes parents')),
        ] },
        { id: 'ex-pl-gap', type: 'grammar_gap_typing', items: [
          gt(PL, 'Nous', 'sommes', 'en classe.', why('nous'), hintPerson('être, 1st person plural', 'être, 1re personne du pluriel', 'être, 1. Person Plural')),
          gt(PL, 'Vous', 'êtes', 'suisses ?', vousAccent, hintPerson('être, 2nd person plural', 'être, 2e personne du pluriel', 'être, 2. Person Plural')),
          gt(LIAISON, 'Ils', 'sont', 'très gentils.', sontNotOnt('Ils sont très gentils'), hintPerson('être, 3rd person plural', 'être, 3e personne du pluriel', 'être, 3. Person Plural')),
          gt(PL, 'Les étudiants', 'sont', 'dans la salle.', why('ils', 'Les étudiants'), hintPerson('être', 'être', 'être')),
          gt(PL, 'Marie et moi, nous', 'sommes', 'sœurs.', why('nous', 'Marie et moi'), hintPerson('être', 'être', 'être')),
          gt(PL, 'Vous', 'êtes', 'de Bruxelles ?', vousAccent, hintPerson('être', 'être', 'être')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-forms', type: 'grammar_pronoun_form_typing', items: [
      pt([...SG, ...PL], [['je', 'suis', why('je')], ['tu', 'es', why('tu')], ['il', 'est', why('il', 'Il')]]),
      pt(PL, [['nous', 'sommes', why('nous')], ['vous', 'êtes', vousAccent], ['elles', 'sont', why('ils', 'Elles')]]),
    ] },
    { pageId: 'exam-singular', type: 'grammar_gap_typing', items: [
      gt(SG, 'Je', 'suis', 'architecte.', why('je')),
      gt(SG, 'Tu', 'es', 'espagnol ?', why('tu')),
      gt(SG, 'Mon frère', 'est', 'pilote.', why('il', 'Mon frère')),
      gt(SG, 'Elle', 'est', 'contente.', why('il', 'Elle')),
      gt(SG, 'On', 'est', 'au café.', why('il', 'On')),
      gt(SG, 'Je', 'suis', 'chez moi.', why('je')),
      gt(SG, 'Le chat', 'est', 'noir.', why('il', 'Le chat')),
      gt(SG, 'Tu', 'es', 'en forme.', why('tu')),
      gt(SG, 'Madame Dupont', 'est', 'directrice.', why('il', 'Madame Dupont')),
    ] },
    { pageId: 'exam-plural', type: 'grammar_gap_typing', items: [
      gt(PL, 'Nous', 'sommes', 'japonais.', why('nous')),
      gt(PL, 'Vous', 'êtes', 'fatigués ?', vousAccent),
      gt([...PL, ...LIAISON], 'Ils', 'sont', 'au travail.', sontNotOnt('Ils sont au travail')),
      gt(PL, 'Léa et Tom', 'sont', 'cousins.', why('ils', 'Léa et Tom')),
      gt(PL, 'Vous', 'êtes', 'monsieur Martin ?', vousAccent),
      gt(PL, 'Nous', 'sommes', 'en avance.', why('nous')),
      gt(LIAISON, 'Elles', 'sont', 'amies.', sontNotOnt('Elles sont amies')),
      gt(PL, 'Les enfants', 'sont', 'à l’école.', why('ils', 'Les enfants')),
      gt(PL, 'Paul et moi, nous', 'sommes', 'voisins.', why('nous', 'Paul et moi')),
    ] },
  ],
} satisfies LessonDefinition;
