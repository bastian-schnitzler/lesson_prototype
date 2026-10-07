import { gc, gt, L, sp, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const SG = ['rule-singular-gender'];
const PL = ['rule-plural-des'];

/** Gender explanation: livre is masculine → un livre. */
const g = (noun: string, gender: 'm' | 'f') => gender === 'm'
  ? L(`${noun} is masculine: un ${noun}.`, `${noun} est masculin : un ${noun}.`, `${noun} ist maskulin: un ${noun}.`)
  : L(`${noun} is feminine: une ${noun}.`, `${noun} est féminin : une ${noun}.`, `${noun} ist feminin: une ${noun}.`);
/** Plural explanation: des for every plural noun. */
const d = (nouns: string) => L(`${nouns} is plural, so the article is des – for masculine and feminine nouns alike.`, `${nouns} est au pluriel : l’article est des, pour les noms masculins comme féminins.`, `${nouns} steht im Plural, also des – bei maskulinen und femininen Nomen gleich.`);
const unWrong = (noun: string, gender: 'm' | 'f') => gender === 'm'
  ? L(`${noun} is masculine, so un, not une.`, `${noun} est masculin : un, et non une.`, `${noun} ist maskulin, also un, nicht une.`)
  : L(`${noun} is feminine, so une, not un.`, `${noun} est féminin : une, et non un.`, `${noun} ist feminin, also une, nicht un.`);
const desNotUn = (nouns: string) => L(`${nouns} is plural: des, not un or une.`, `${nouns} est au pluriel : des, et non un ou une.`, `${nouns} steht im Plural: des, nicht un oder une.`);

export default {
  id: 'fr-indefinite-articles-and-noun-gender',
  newVerbs: [],
  blocks: [
    {
      id: 'block-singular-articles',
      exercises: [
        { id: 'ex-singular-choice', type: 'grammar_gap_choice', items: [
          gc(SG, 'Voici', 'un', ['une', 'des', 'la'], 'livre.', g('livre', 'm')),
          gc(SG, 'Voici', 'une', ['un', 'des', 'le'], 'table.', g('table', 'f')),
          gc(SG, 'C’est', 'un', ['une', 'des', 'la'], 'stylo.', g('stylo', 'm')),
          gc(SG, 'C’est', 'une', ['un', 'des', 'le'], 'chaise.', g('chaise', 'f')),
          gc(SG, 'Voici', 'un', ['une', 'des', 'la'], 'cahier.', g('cahier', 'm')),
          gc(SG, 'C’est', 'une', ['un', 'des', 'le'], 'maison.', g('maison', 'f')),
          gc(SG, 'Voici', 'un', ['une', 'des', 'la'], 'ordinateur.', g('ordinateur', 'm')),
          gc(SG, 'C’est', 'une', ['un', 'des', 'le'], 'idée.', g('idée', 'f')),
          gc(SG, 'Voici', 'un', ['une', 'des', 'la'], 'garçon.', g('garçon', 'm')),
          gc(SG, 'Voici', 'une', ['un', 'des', 'le'], 'fille.', g('fille', 'f')),
        ] },
        { id: 'ex-singular-typing', type: 'grammar_gap_typing', items: [
          gt(SG, 'C’est', 'un', 'sac.', g('sac', 'm')),
          gt(SG, 'C’est', 'une', 'voiture.', g('voiture', 'f')),
          gt(SG, 'Voici', 'un', 'vélo.', g('vélo', 'm')),
          gt(SG, 'Voici', 'une', 'clé.', g('clé', 'f')),
          gt(SG, 'C’est', 'un', 'chat.', g('chat', 'm')),
          gt(SG, 'C’est', 'une', 'pomme.', g('pomme', 'f')),
          gt(SG, 'Voici', 'un', 'téléphone.', g('téléphone', 'm')),
          gt(SG, 'Voici', 'une', 'fenêtre.', g('fenêtre', 'f')),
          gt(SG, 'C’est', 'un', 'hôtel.', g('hôtel', 'm')),
          gt(SG, 'C’est', 'une', 'montre.', g('montre', 'f')),
        ] },
        { id: 'ex-singular-spot', type: 'grammar_error_spotter', items: [
          sp(SG, ['Voici', 'un', 'livre'], 1, 'une', unWrong('livre', 'm'), ['un', 'une', 'des']),
          sp(SG, ['C’est', 'une', 'table'], 1, 'un', unWrong('table', 'f')),
          sp(SG, ['C’est', 'un', 'stylo'], 1, 'une', unWrong('stylo', 'm')),
          sp(SG, ['Voici', 'une', 'porte'], 1, 'un', unWrong('porte', 'f'), ['une', 'un', 'des']),
          sp(SG, ['C’est', 'un', 'crayon'], 1, 'une', unWrong('crayon', 'm')),
          sp(SG, ['Voici', 'une', 'gomme'], 1, 'un', unWrong('gomme', 'f')),
          sp(SG, ['C’est', 'un', 'chien'], 1, 'une', unWrong('chien', 'm'), ['un', 'une', 'des']),
          sp(SG, ['Voici', 'une', 'lampe'], 1, 'un', unWrong('lampe', 'f')),
        ] },
      ],
    },
    {
      id: 'block-plural-article',
      exercises: [
        { id: 'ex-plural-choice', type: 'grammar_gap_choice', items: [
          gc(PL, 'Voici', 'des', ['un', 'une', 'les'], 'livres.', d('livres')),
          gc(PL, 'Ce sont', 'des', ['une', 'un', 'la'], 'tables.', d('tables')),
          gc(PL, 'Voici', 'des', ['un', 'une', 'le'], 'stylos.', d('stylos')),
          gc(PL, 'Ce sont', 'des', ['une', 'un', 'le'], 'chaises.', d('chaises')),
          gc(PL, 'Voici', 'des', ['un', 'une', 'la'], 'amis.', d('amis')),
          gc(PL, 'Ce sont', 'des', ['une', 'un', 'le'], 'photos.', d('photos')),
          gc(PL, 'Voici', 'des', ['un', 'une', 'la'], 'oranges.', d('oranges')),
          gc(PL, 'Ce sont', 'des', ['un', 'une', 'le'], 'fleurs.', d('fleurs')),
          gc(PL, 'Voici', 'des', ['un', 'une', 'la'], 'ordinateurs.', d('ordinateurs')),
          gc(PL, 'Ce sont', 'des', ['un', 'une', 'la'], 'cahiers.', d('cahiers')),
        ] },
        { id: 'ex-plural-typing', type: 'grammar_gap_typing', items: [
          gt(PL, 'Voici', 'des', 'clés.', d('clés')),
          gt(PL, 'Ce sont', 'des', 'chats.', d('chats')),
          gt(PL, 'Voici', 'des', 'pommes.', d('pommes')),
          gt(PL, 'Ce sont', 'des', 'vélos.', d('vélos')),
          gt(PL, 'Voici', 'des', 'bouteilles.', d('bouteilles')),
          gt(PL, 'Ce sont', 'des', 'garçons.', d('garçons')),
          gt(PL, 'Voici', 'des', 'filles.', d('filles')),
          gt(PL, 'Ce sont', 'des', 'films.', d('films')),
        ] },
        { id: 'ex-plural-spot', type: 'grammar_error_spotter', items: [
          sp(PL, ['Voici', 'des', 'livres'], 1, 'un', desNotUn('livres'), ['des', 'un', 'une']),
          sp(PL, ['Ce', 'sont', 'des', 'tables'], 2, 'une', desNotUn('tables')),
          sp(PL, ['Voici', 'des', 'fleurs'], 1, 'une', desNotUn('fleurs'), ['des', 'une', 'un']),
          sp(PL, ['Ce', 'sont', 'des', 'stylos'], 2, 'un', desNotUn('stylos')),
          sp(PL, ['Voici', 'des', 'chiens'], 1, 'un', desNotUn('chiens')),
          sp(PL, ['Ce', 'sont', 'des', 'maisons'], 2, 'une', desNotUn('maisons'), ['des', 'une', 'un']),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-singular', type: 'grammar_gap_typing', items: [
      gt(SG, 'Voici', 'un', 'bureau.', g('bureau', 'm')),
      gt(SG, 'C’est', 'une', 'lampe.', g('lampe', 'f')),
      gt(SG, 'Voici', 'un', 'journal.', g('journal', 'm')),
      gt(SG, 'C’est', 'une', 'photo.', g('photo', 'f')),
      gt(SG, 'Voici', 'un', 'arbre.', g('arbre', 'm')),
      gt(SG, 'C’est', 'une', 'banane.', g('banane', 'f')),
      gt(SG, 'Voici', 'un', 'verre.', g('verre', 'm')),
      gt(SG, 'C’est', 'une', 'assiette.', g('assiette', 'f')),
    ] },
    { pageId: 'exam-plural', type: 'grammar_gap_typing', items: [
      gt(PL, 'Voici', 'des', 'gâteaux.', d('gâteaux')),
      gt(PL, 'Ce sont', 'des', 'lampes.', d('lampes')),
      gt(PL, 'Voici', 'des', 'journaux.', d('journaux')),
      gt(PL, 'Ce sont', 'des', 'assiettes.', d('assiettes')),
      gt(PL, 'Voici', 'des', 'arbres.', d('arbres')),
      gt(PL, 'Ce sont', 'des', 'bananes.', d('bananes')),
      gt(PL, 'Voici', 'des', 'verres.', d('verres')),
      gt(PL, 'Ce sont', 'des', 'idées.', d('idées')),
    ] },
    { pageId: 'exam-mixed', type: 'grammar_gap_typing', items: [
      gt(SG, 'Voici', 'un', 'sandwich.', g('sandwich', 'm')),
      gt(PL, 'Voici', 'des', 'sandwichs.', d('sandwichs')),
      gt(SG, 'C’est', 'une', 'fleur.', g('fleur', 'f')),
      gt(PL, 'Ce sont', 'des', 'sacs.', d('sacs')),
      gt(SG, 'C’est', 'un', 'film.', g('film', 'm')),
      gt(SG, 'Voici', 'une', 'bouteille.', g('bouteille', 'f')),
      gt(PL, 'Ce sont', 'des', 'montres.', d('montres')),
      gt(SG, 'C’est', 'un', 'gâteau.', g('gâteau', 'm')),
    ] },
  ],
} satisfies LessonDefinition;
