import { gc, gt, L, sp, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const S = ['rule-plural-s'];
const X = ['rule-plural-x'];
const SILENT = ['rule-silent-plural'];

const s = (sg: string, pl: string) => L(`Most nouns add -s in the plural: ${sg} → ${pl}.`, `La plupart des noms prennent un -s au pluriel : ${sg} → ${pl}.`, `Die meisten Nomen bekommen im Plural ein -s: ${sg} → ${pl}.`);
const x = (sg: string, pl: string) => L(`Nouns in -eau and -eu take -x in the plural: ${sg} → ${pl}.`, `Les noms en -eau et en -eu prennent un -x au pluriel : ${sg} → ${pl}.`, `Nomen auf -eau und -eu bekommen im Plural ein -x: ${sg} → ${pl}.`);
const silent = (sg: string, pl: string) => L(`${sg} and ${pl} sound the same: the plural -s is silent, so only the article (les, des) is heard – but the -s is written.`, `${sg} et ${pl} se prononcent pareil : le -s du pluriel est muet, on entend seulement l’article (les, des) – mais on écrit le -s.`, `${sg} und ${pl} klingen gleich: Das Plural-s ist stumm, man hört nur den Artikel (les, des) – geschrieben wird das -s aber.`);
const sAlready = (pl: string) => L(`The plural takes one -s only: ${pl}.`, `Le pluriel prend un seul -s : ${pl}.`, `Der Plural bekommt nur ein -s: ${pl}.`);

export default {
  id: 'fr-regular-noun-plurals',
  newVerbs: [],
  blocks: [
    {
      id: 'block-regular-plural-s',
      exercises: [
        { id: 'ex-s-choice', type: 'grammar_gap_choice', items: [
          gc(S, 'un livre → des', 'livres', ['livre', 'livrex', 'livrent'], '', s('un livre', 'des livres')),
          gc(S, 'une table → des', 'tables', ['table', 'tablex', 'tabless'], '', s('une table', 'des tables')),
          gc(S, 'un stylo → des', 'stylos', ['stylo', 'stylox', 'styloes'], '', s('un stylo', 'des stylos')),
          gc(S, 'une chaise → des', 'chaises', ['chaise', 'chaisex', 'chaisent'], '', s('une chaise', 'des chaises')),
          gc(SILENT, 'Ce sont mes', 'amis', ['ami', 'amix', 'amit'], 'de l’école.', silent('ami', 'amis')),
          gc(S, 'une fleur → des', 'fleurs', ['fleur', 'fleurx', 'fleures'], '', s('une fleur', 'des fleurs')),
        ] },
        { id: 'ex-s-typing', type: 'grammar_gap_typing', items: [
          gt(S, 'un cahier → des', 'cahiers', '', s('un cahier', 'des cahiers')),
          gt(S, 'une voiture → des', 'voitures', '', s('une voiture', 'des voitures')),
          gt(S, 'un ami → des', 'amis', '', s('un ami', 'des amis')),
          gt(S, 'une maison → des', 'maisons', '', s('une maison', 'des maisons')),
          gt(S, 'un chat → des', 'chats', '', s('un chat', 'des chats')),
          gt(S, 'une pomme → des', 'pommes', '', s('une pomme', 'des pommes')),
        ] },
        { id: 'ex-s-spot', type: 'grammar_error_spotter', items: [
          sp(SILENT, ['Voici', 'les', 'livres'], 2, 'livre', silent('livre', 'livres')),
          sp(SILENT, ['J’ai', 'deux', 'chats'], 2, 'chat', silent('chat', 'chats'), ['chats', 'chat', 'chatx']),
          sp(S, ['Ce', 'sont', 'des', 'stylos'], 3, 'stylox', s('un stylo', 'des stylos'), ['stylos', 'stylox', 'stylo']),
          sp(SILENT, ['Les', 'filles', 'sont', 'là'], 1, 'fille', silent('fille', 'filles')),
          sp(S, ['Voici', 'des', 'tables'], 2, 'tabless', sAlready('tables')),
        ] },
      ],
    },
    {
      id: 'block-plural-x',
      exercises: [
        { id: 'ex-x-choice', type: 'grammar_gap_choice', items: [
          gc(X, 'un bateau → des', 'bateaux', ['bateaus', 'bateau', 'bateauxs'], '', x('un bateau', 'des bateaux')),
          gc(X, 'un cadeau → des', 'cadeaux', ['cadeaus', 'cadeau', 'cadeauxs'], '', x('un cadeau', 'des cadeaux')),
          gc(X, 'un jeu → des', 'jeux', ['jeus', 'jeu', 'jeuxs'], '', x('un jeu', 'des jeux')),
          gc(X, 'un gâteau → des', 'gâteaux', ['gâteaus', 'gâteau', 'gâteauxs'], '', x('un gâteau', 'des gâteaux')),
          gc(X, 'un cheveu → des', 'cheveux', ['cheveus', 'cheveu', 'cheveuxs'], '', x('un cheveu', 'des cheveux')),
          gc(X, 'un oiseau → des', 'oiseaux', ['oiseaus', 'oiseau', 'oiseauxs'], '', x('un oiseau', 'des oiseaux')),
          gc(X, 'un manteau → des', 'manteaux', ['manteaus', 'manteau', 'manteauxs'], '', x('un manteau', 'des manteaux')),
        ] },
        { id: 'ex-x-typing', type: 'grammar_gap_typing', items: [
          gt(X, 'un bureau → des', 'bureaux', '', x('un bureau', 'des bureaux')),
          gt(X, 'un couteau → des', 'couteaux', '', x('un couteau', 'des couteaux')),
          gt(X, 'un feu → des', 'feux', '', x('un feu', 'des feux')),
          gt(X, 'un chapeau → des', 'chapeaux', '', x('un chapeau', 'des chapeaux')),
          gt(X, 'un tableau → des', 'tableaux', '', x('un tableau', 'des tableaux')),
          gt(X, 'un château → des', 'châteaux', '', L('Nouns in -eau take -x in the plural, and the accent circonflexe stays: un château → des châteaux.', 'Les noms en -eau prennent un -x au pluriel, et l’accent circonflexe reste : un château → des châteaux.', 'Nomen auf -eau bekommen ein -x, und der Accent circonflexe bleibt: un château → des châteaux.')),
        ] },
        { id: 'ex-x-spot', type: 'grammar_error_spotter', items: [
          sp(X, ['Voici', 'des', 'cadeaux'], 2, 'cadeaus', x('un cadeau', 'des cadeaux'), ['cadeaux', 'cadeaus', 'cadeau']),
          sp(X, ['Les', 'bateaux', 'sont', 'beaux'], 1, 'bateaus', x('un bateau', 'des bateaux')),
          sp(X, ['J’aime', 'les', 'jeux'], 2, 'jeus', x('un jeu', 'des jeux'), ['jeux', 'jeus', 'jeu']),
          sp(X, ['Ce', 'sont', 'des', 'gâteaux'], 3, 'gâteaus', x('un gâteau', 'des gâteaux')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-s', type: 'grammar_gap_typing', items: [
      gt(S, 'un arbre → des', 'arbres', '', s('un arbre', 'des arbres')),
      gt(S, 'une lampe → des', 'lampes', '', s('une lampe', 'des lampes')),
      gt(S, 'un film → des', 'films', '', s('un film', 'des films')),
      gt(S, 'une porte → des', 'portes', '', s('une porte', 'des portes')),
      gt(S, 'un garçon → des', 'garçons', '', s('un garçon', 'des garçons')),
      gt(S, 'une idée → des', 'idées', '', s('une idée', 'des idées')),
    ] },
    { pageId: 'exam-x', type: 'grammar_gap_typing', items: [
      gt(X, 'un drapeau → des', 'drapeaux', '', x('un drapeau', 'des drapeaux')),
      gt(X, 'un jeu → des', 'jeux', '', x('un jeu', 'des jeux')),
      gt(X, 'un morceau → des', 'morceaux', '', x('un morceau', 'des morceaux')),
      gt(X, 'un neveu → des', 'neveux', '', x('un neveu', 'des neveux')),
      gt(X, 'un bateau → des', 'bateaux', '', x('un bateau', 'des bateaux')),
    ] },
    { pageId: 'exam-sentences', type: 'grammar_gap_typing', items: [
      gt(SILENT, 'Les', 'étudiants', 'sont en classe.', silent('étudiant', 'étudiants')),
      gt(SILENT, 'J’ai trois', 'cousines', 'à Lyon.', silent('cousine', 'cousines')),
      gt(X, 'Les', 'oiseaux', 'chantent.', x('un oiseau', 'des oiseaux')),
      gt(SILENT, 'Voici les', 'clés', 'de la maison.', silent('clé', 'clés')),
      gt(X, 'Ce sont des', 'gâteaux', 'au chocolat.', x('un gâteau', 'des gâteaux')),
    ] },
  ],
} satisfies LessonDefinition;
