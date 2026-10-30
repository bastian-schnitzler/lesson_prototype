import { gc, gt, L, sp, wo, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const PLACE = ['rule-place-adverbs'];
const NOW = ['rule-time-adverbs-present'];
const LATER = ['rule-time-adverbs-future'];

/** A typed adverb at the start of a sentence: capitalised and lower case both count. */
const cap = (w: string) => [w[0].toUpperCase() + w.slice(1), w];

const ici = L('Ici means "here", the place where the speaker is.', 'Ici désigne l’endroit où se trouve la personne qui parle.', 'Ici heißt „hier“, der Ort, an dem die sprechende Person ist.');
const la = L('Là means "there", a place away from the speaker.', 'Là désigne un endroit éloigné de la personne qui parle.', 'Là heißt „da, dort“, ein Ort entfernt von der sprechenden Person.');
const maintenant = L('Maintenant means "now", at this moment.', 'Maintenant veut dire « en ce moment ».', 'Maintenant heißt „jetzt“, in diesem Moment.');
const aujourdhui = L('Aujourd’hui means "today"; it is written with an apostrophe.', 'Aujourd’hui désigne ce jour-ci ; le mot s’écrit avec une apostrophe.', 'Aujourd’hui heißt „heute“; es wird mit Apostroph geschrieben.');
const demain = L('Demain means "tomorrow", the day after today.', 'Demain, c’est le jour après aujourd’hui.', 'Demain heißt „morgen“, der Tag nach heute.');
const bientot = L('Bientôt means "soon", in a short while; it has an accent circonflexe on the o.', 'Bientôt veut dire « dans peu de temps » ; il prend un accent circonflexe sur le o.', 'Bientôt heißt „bald“; es hat einen Accent circonflexe auf dem o.');
const toutDeSuite = L('Tout de suite means "right away", immediately.', 'Tout de suite veut dire « immédiatement ».', 'Tout de suite heißt „sofort“.');

/** Hier clashes with the present suis; any present or future time word fixes it. */
const hierWithPresent = L('Hier means "yesterday" and does not go with the present suis. Maintenant, aujourd’hui or demain fit.', 'Hier, c’est le jour d’avant : il ne va pas avec le présent suis. Maintenant, aujourd’hui ou demain conviennent.', 'Hier heißt „gestern“ und passt nicht zum Präsens suis. Maintenant, aujourd’hui oder demain passen.');

const H = {
  here: L('here, where I am', 'à l’endroit où je suis', 'hier, wo ich bin'),
  there: L('there, away from me', 'à un autre endroit, loin de moi', 'da, dort, weg von mir'),
  now: L('now, at this moment', 'en ce moment', 'jetzt, in diesem Moment'),
  today: L('today', 'ce jour-ci', 'heute'),
  tomorrow: L('tomorrow', 'le jour suivant', 'morgen'),
  soon: L('soon, in a short while', 'dans peu de temps', 'bald'),
  rightAway: L('right away', 'immédiatement', 'sofort'),
};

export default {
  id: 'fr-here-there-now-tomorrow',
  newVerbs: [],
  blocks: [
    {
      id: 'block-spatial-adverbs',
      exercises: [
        { id: 'ex-place-choice', type: 'grammar_gap_choice', items: [
          gc(PLACE, 'Viens, je suis', 'ici', ['hier', 'demain', 'maintenant'], ', à côté de la porte.', ici, H.here),
          gc(PLACE, 'Le livre ? Il est', 'là', ['ici', 'aujourd’hui', 'bientôt'], ', sur la table au fond de la salle.', la, H.there),
          gc(PLACE, 'J’habite', 'ici', ['hier', 'demain', 'bientôt'], ', dans cette maison.', ici, H.here),
        ] },
        { id: 'ex-place-typing', type: 'grammar_gap_typing', items: [
          gt(PLACE, 'Bienvenue ! Vous êtes', 'ici', 'chez vous.', ici, H.here),
          gt(PLACE, 'La gare ? Elle est', 'là', ', après le pont.', la, H.there),
          gt(PLACE, 'Je reste', ['ici', 'là'], ', avec toi.', ici, H.here),
        ] },
        { id: 'ex-place-order', type: 'grammar_word_order', items: [
          wo(PLACE, ['Je', 'suis', 'ici'], ici),
          wo(PLACE, ['Mon', 'stylo', 'est', 'là'], la),
          wo(PLACE, ['Nous', 'habitons', 'ici'], ici),
        ] },
      ],
    },
    {
      id: 'block-temporal-adverbs',
      exercises: [
        { id: 'ex-time-choice', type: 'grammar_gap_choice', items: [
          gc(NOW, 'Hier, c’était lundi.', 'Aujourd’hui', ['Demain', 'Ici', 'Bientôt'], ', c’est mardi.', aujourdhui, H.today),
          gc(LATER, 'Aujourd’hui, c’est mardi.', 'Demain', ['Maintenant', 'Là', 'Aujourd’hui'], ', c’est mercredi.', demain, H.tomorrow),
          gc(NOW, 'Je ne peux pas parler', 'maintenant', ['demain', 'hier', 'bientôt'], ', je suis en réunion.', maintenant, H.now),
        ] },
        { id: 'ex-time-typing', type: 'grammar_gap_typing', items: [
          gt(NOW, 'C’est l’anniversaire de Léa', 'aujourd’hui', '.', aujourdhui, H.today),
          gt(LATER, 'Le magasin est fermé ; il ouvre', 'demain', 'matin.', demain, H.tomorrow),
          gt(NOW, 'Le film commence', 'maintenant', '.', maintenant, H.now),
        ] },
        { id: 'ex-time-order', type: 'grammar_word_order', items: [
          wo(NOW, ['Je', 'travaille', 'maintenant'], maintenant),
          wo(LATER, ['Nous', 'partons', 'demain'], demain),
          wo(NOW, ['Il', 'fait', 'beau', 'aujourd’hui'], aujourdhui),
        ] },
        { id: 'ex-time-spot', type: 'grammar_error_spotter', items: [
          sp(LATER, ['Aujourd’hui', 'c’est', 'mardi', 'et', 'demain', 'c’est', 'mercredi'], 4, 'hier', demain, ['demain', 'hier', 'aujourd’hui']),
          sp(NOW, ['Je', 'suis', 'occupé', 'maintenant'], 3, 'hier', hierWithPresent, [], ['aujourd’hui', 'demain']),
          sp(LATER, ['À', 'bientôt', '!'], 1, 'maintenant', bientot, ['bientôt', 'maintenant', 'ici']),
          sp(NOW, ['C’est', 'mon', 'anniversaire', 'aujourd’hui'], 3, 'aujourdhui', aujourdhui),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-place', type: 'grammar_gap_typing', items: [
      gt(PLACE, 'Viens', ['ici', 'là'], ', à côté de moi !', ici),
      gt(PLACE, 'La poste ? Elle est', 'là', ', au bout de la rue.', la),
      gt(PLACE, 'Nous habitons', ['ici', 'là'], 'depuis deux ans.', ici),
      gt(PLACE, 'Ta veste est', 'là', ', sur la chaise dans l’entrée.', la),
    ] },
    { pageId: 'exam-present', type: 'grammar_gap_typing', items: [
      gt(NOW, 'Hier, c’était dimanche.', cap('aujourd’hui'), ', c’est lundi.', aujourdhui),
      gt(NOW, 'Je ne peux pas venir', 'maintenant', ': je suis sous la douche !', maintenant),
      gt(NOW, 'Hier, c’était le 1er mai ;', 'aujourd’hui', ', c’est le 2 mai.', aujourdhui),
      gt(NOW, 'Il est neuf heures pile : le cours commence', 'maintenant', '.', maintenant),
    ] },
    { pageId: 'exam-future', type: 'grammar_gap_typing', items: [
      gt(LATER, 'Aujourd’hui, c’est lundi.', cap('demain'), ', c’est mardi.', demain),
      gt(LATER, 'Ne pars pas, je reviens', 'tout de suite', ', dans une seconde !', toutDeSuite),
      gt(LATER, 'Bonne nuit et à', 'demain', 'matin !', demain),
      gt(LATER, 'Les vacances arrivent', 'bientôt', ': dans une semaine !', bientot),
    ] },
  ],
} satisfies LessonDefinition;
