import { gc, gt, L, sp, wo, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const BASIC = ['rule-def-basic'];
const ELISION = ['rule-def-elision'];
const PREF = ['rule-def-preference'];

/** le / la / les by gender and number. */
const g = (noun: string, kind: 'm' | 'f' | 'pl') => ({
  m: L(`${noun} is masculine singular: le ${noun}.`, `${noun} est masculin singulier : le ${noun}.`, `${noun} ist maskulin Singular: le ${noun}.`),
  f: L(`${noun} is feminine singular: la ${noun}.`, `${noun} est féminin singulier : la ${noun}.`, `${noun} ist feminin Singular: la ${noun}.`),
  pl: L(`${noun} is plural: les ${noun}, for masculine and feminine nouns alike.`, `${noun} est au pluriel : les ${noun}, pour le masculin comme pour le féminin.`, `${noun} steht im Plural: les ${noun}, bei maskulinen und femininen Nomen gleich.`),
}[kind]);
/** Elision: le/la become l’ before a vowel or a silent h. */
const e = (noun: string, h = false) => h
  ? L(`${noun} starts with a silent h, so le/la become l’: l’${noun}.`, `${noun} commence par un h muet : le/la devient l’ : l’${noun}.`, `${noun} beginnt mit stummem h, also wird le/la zu l’: l’${noun}.`)
  : L(`${noun} starts with a vowel, so le/la become l’: l’${noun}.`, `${noun} commence par une voyelle : le/la devient l’ : l’${noun}.`, `${noun} beginnt mit einem Vokal, also wird le/la zu l’: l’${noun}.`);
/** After aimer, adorer, détester, préférer the noun takes the definite article. */
const p = (verb: string, art: string, noun: string) => L(
  `After ${verb} the noun takes the definite article (general taste): ${art}${art.endsWith('’') ? '' : ' '}${noun}.`,
  `Après ${verb}, le nom prend l’article défini (goût en général) : ${art}${art.endsWith('’') ? '' : ' '}${noun}.`,
  `Nach ${verb} steht der bestimmte Artikel (Vorliebe allgemein): ${art}${art.endsWith('’') ? '' : ' '}${noun}.`,
);

export default {
  id: 'fr-definite-articles-and-elision',
  newVerbs: [
    { infinitive: 'aimer', translations: { en: 'to like, to love', de: 'mögen, lieben' } },
    { infinitive: 'adorer', translations: { en: 'to love, to adore', de: 'sehr gern mögen, lieben' } },
    { infinitive: 'détester', translations: { en: 'to hate', de: 'hassen, gar nicht mögen' } },
    { infinitive: 'préférer', translations: { en: 'to prefer', de: 'lieber mögen, bevorzugen' } },
  ],
  blocks: [
    {
      id: 'block-basic-and-elision',
      exercises: [
        { id: 'ex-basic-gap-choice', type: 'grammar_gap_choice', items: [
          gc(BASIC, 'Voici', 'le', ['la', 'les', 'l’'], 'garçon.', g('garçon', 'm')),
          gc(BASIC, 'Voici', 'la', ['le', 'les', 'l’'], 'fille.', g('fille', 'f')),
          gc(ELISION, 'Voici', 'l’', ['le', 'la', 'les'], 'ami de Paul.', e('ami')),
          gc(ELISION, 'C’est', 'l’', ['le', 'la', 'les'], 'hôtel de la gare.', e('hôtel', true)),
        ] },
        { id: 'ex-basic-gap-typing', type: 'grammar_gap_typing', items: [
          gt(BASIC, 'Où est', 'la', 'porte ?', g('porte', 'f')),
          gt(BASIC, 'Voici', 'le', 'soleil.', g('soleil', 'm')),
          gt(ELISION, 'Voici', 'l’', 'arbre.', e('arbre')),
          gt(BASIC, 'Où sont', 'les', 'clés ?', g('clés', 'pl')),
        ] },
        { id: 'ex-basic-spot', type: 'grammar_error_spotter', items: [
          sp(BASIC, ['Voici', 'la', 'maison'], 1, 'le', g('maison', 'f'), ['la', 'le', 'les']),
          sp(BASIC, ['Où', 'est', 'le', 'chat', '?'], 2, 'la', g('chat', 'm')),
          sp(ELISION, ['Voici', 'l’ami', 'de', 'Léa'], 1, 'le ami', e('ami'), ['l’ami', 'le ami', 'la ami']),
          sp(BASIC, ['Où', 'sont', 'les', 'enfants', '?'], 2, 'le', g('enfants', 'pl')),
          sp(ELISION, ['C’est', 'l’école', 'de', 'Tom'], 1, 'la école', e('école'), ['l’école', 'la école', 'le école']),
        ] },
      ],
    },
    {
      id: 'block-preference-verbs',
      exercises: [
        { id: 'ex-pref-choice', type: 'grammar_gap_choice', items: [
          gc(PREF, 'J’aime', 'le', ['un', 'du', 'la'], 'chocolat.', p('aimer', 'le', 'chocolat')),
          gc(PREF, 'Tu aimes', 'la', ['une', 'de la', 'le'], 'musique ?', p('aimer', 'la', 'musique')),
          gc(PREF, 'Il adore', 'les', ['des', 'un', 'le'], 'chats.', p('adorer', 'les', 'chats')),
          gc(PREF, 'Nous détestons', 'la', ['une', 'de la', 'les'], 'pluie.', p('détester', 'la', 'pluie')),
          gc(PREF, 'Elle préfère', 'le', ['un', 'du', 'la'], 'thé.', p('préférer', 'le', 'thé')),
        ] },
        { id: 'ex-pref-gap-typing', type: 'grammar_gap_typing', items: [
          gt(PREF, 'J’aime', 'le', 'café.', p('aimer', 'le', 'café')),
          gt(PREF, 'Tu adores', 'la', 'pizza ?', p('adorer', 'la', 'pizza')),
          gt(PREF, 'Il déteste', 'les', 'films d’horreur.', p('détester', 'les', 'films d’horreur')),
          gt(PREF, 'Nous préférons', 'la', 'montagne.', p('préférer', 'la', 'montagne')),
          gt(PREF, 'Elle aime', 'l’', 'eau gazeuse.', p('aimer', 'l’', 'eau gazeuse')),
        ] },
        { id: 'ex-pref-order', type: 'grammar_word_order', items: [
          wo(PREF, ['J’aime', 'le', 'chocolat', 'noir'], p('aimer', 'le', 'chocolat noir')),
          wo(PREF, ['Tu', 'aimes', 'la', 'musique', '?'], p('aimer', 'la', 'musique')),
          wo(PREF, ['Il', 'déteste', 'les', 'légumes'], p('détester', 'les', 'légumes')),
          wo(PREF, ['Nous', 'adorons', 'la', 'mer'], p('adorer', 'la', 'mer')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-page-1', type: 'grammar_gap_typing', items: [
      gt(BASIC, 'Voici', 'le', 'bureau.', g('bureau', 'm')),
      gt(BASIC, 'Où est', 'la', 'gare ?', g('gare', 'f')),
      gt(BASIC, 'Voici', 'les', 'fleurs.', g('fleurs', 'pl')),
      gt(BASIC, 'C’est', 'le', 'frère de Lucie.', g('frère', 'm')),
    ] },
    { pageId: 'exam-elision', type: 'grammar_gap_typing', items: [
      gt(ELISION, 'Voici', 'l’', 'étudiant.', e('étudiant')),
      gt(ELISION, 'Où est', 'l’', 'hôtel ?', e('hôtel', true)),
      gt(ELISION, 'C’est', 'l’', 'amie de Julie.', e('amie')),
      gt(ELISION, 'Voici', 'l’', 'avion.', e('avion')),
    ] },
    { pageId: 'exam-page-2', type: 'grammar_gap_typing', items: [
      gt(PREF, 'J’aime', 'la', 'danse.', p('aimer', 'la', 'danse')),
      gt(PREF, 'Tu détestes', 'le', 'froid ?', p('détester', 'le', 'froid')),
      gt(PREF, 'Nous adorons', 'les', 'fruits.', p('adorer', 'les', 'fruits')),
      gt(PREF, 'Il préfère', 'la', 'viande.', p('préférer', 'la', 'viande')),
    ] },
  ],
} satisfies LessonDefinition;
