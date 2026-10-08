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
          gc(PLACE, 'Viens, je suis', 'ici', ['là', 'demain', 'maintenant'], ', à côté de la porte.', ici, H.here),
          gc(PLACE, 'Le livre ? Il est', 'là', ['ici', 'aujourd’hui', 'bientôt'], ', sur la table au fond de la salle.', la, H.there),
          gc(PLACE, 'J’habite', 'ici', ['là', 'demain', 'bientôt'], ', dans cette maison.', ici, H.here),
          gc(PLACE, 'Regarde la tour, Marie est', 'là', ['ici', 'maintenant', 'demain'], ', en haut.', la, H.there),
          gc(PLACE, 'Assieds-toi', 'ici', ['là', 'aujourd’hui', 'bientôt'], ', près de moi.', ici, H.here),
          gc(PLACE, 'Tu vois le café de l’autre côté ? Paul est', 'là', ['ici', 'demain', 'maintenant'], '.', la, H.there),
        ] },
        { id: 'ex-place-typing', type: 'grammar_gap_typing', items: [
          gt(PLACE, 'Bienvenue ! Vous êtes', 'ici', 'chez vous.', ici, H.here),
          gt(PLACE, 'La gare ? Elle est', 'là', ', après le pont.', la, H.there),
          gt(PLACE, 'Je reste', 'ici', ', avec toi.', ici, H.here),
          gt(PLACE, 'Le chat dort', 'là', ', au fond du jardin.', la, H.there),
          gt(PLACE, 'Mets ton sac', 'ici', ', sur ma chaise.', ici, H.here),
          gt(PLACE, 'Ton ami est', 'là', ', devant l’école.', la, H.there),
        ] },
        { id: 'ex-place-order', type: 'grammar_word_order', items: [
          wo(PLACE, ['Je', 'suis', 'ici'], ici),
          wo(PLACE, ['Mon', 'stylo', 'est', 'là'], la),
          wo(PLACE, ['Nous', 'habitons', 'ici'], ici),
          wo(PLACE, ['Le', 'bus', 'est', 'là'], la),
        ] },
      ],
    },
    {
      id: 'block-temporal-adverbs',
      exercises: [
        { id: 'ex-time-choice', type: 'grammar_gap_choice', items: [
          gc(NOW, 'Hier, c’était lundi.', 'Aujourd’hui', ['Demain', 'Ici', 'Bientôt'], ', c’est mardi.', aujourdhui, H.today),
          gc(LATER, 'Aujourd’hui, c’est mardi.', 'Demain', ['Maintenant', 'Là', 'Aujourd’hui'], ', c’est mercredi.', demain, H.tomorrow),
          gc(NOW, 'Je ne peux pas parler', 'maintenant', ['demain', 'là', 'bientôt'], ', je suis en réunion.', maintenant, H.now),
          gc(LATER, 'Attends, j’arrive', 'tout de suite', ['aujourd’hui', 'ici', 'demain'], '!', toutDeSuite, H.rightAway),
          gc(LATER, 'Les vacances commencent', 'bientôt', ['maintenant', 'ici', 'aujourd’hui'], ', dans deux jours.', bientot, H.soon),
          gc(NOW, 'Il est huit heures :', 'maintenant', ['demain', 'là', 'bientôt'], ', on commence le cours.', maintenant, H.now),
        ] },
        { id: 'ex-time-typing', type: 'grammar_gap_typing', items: [
          gt(NOW, 'C’est l’anniversaire de Léa', 'aujourd’hui', '.', aujourdhui, H.today),
          gt(LATER, 'Le magasin est fermé ; il ouvre', 'demain', 'matin.', demain, H.tomorrow),
          gt(NOW, 'Le film commence', 'maintenant', '.', maintenant, H.now),
          gt(LATER, 'À', 'bientôt', ', Marc !', bientot, H.soon),
          gt(LATER, 'Le médecin arrive', 'tout de suite', '.', toutDeSuite, H.rightAway),
        ] },
        { id: 'ex-time-order', type: 'grammar_word_order', items: [
          wo(NOW, ['Je', 'travaille', 'maintenant'], maintenant),
          wo(LATER, ['Nous', 'partons', 'demain'], demain),
          wo(NOW, ['Il', 'fait', 'beau', 'aujourd’hui'], aujourdhui),
          wo(LATER, ['Le', 'train', 'arrive', 'bientôt'], bientot),
        ] },
        { id: 'ex-time-spot', type: 'grammar_error_spotter', items: [
          sp(LATER, ['Aujourd’hui', 'c’est', 'mardi', 'et', 'demain', 'c’est', 'mercredi'], 4, 'hier', demain, ['demain', 'hier', 'aujourd’hui']),
          sp(NOW, ['Je', 'suis', 'occupé', 'maintenant'], 3, 'demain', maintenant),
          sp(LATER, ['À', 'bientôt', '!'], 1, 'maintenant', bientot, ['bientôt', 'maintenant', 'ici']),
          sp(NOW, ['C’est', 'mon', 'anniversaire', 'aujourd’hui'], 3, 'aujourdhui', aujourdhui),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-place', type: 'grammar_gap_typing', items: [
      gt(PLACE, 'Viens', 'ici', ', à côté de moi !', ici),
      gt(PLACE, 'La poste ? Elle est', 'là', ', au bout de la rue.', la),
      gt(PLACE, 'Nous habitons', 'ici', 'depuis deux ans.', ici),
      gt(PLACE, 'Ta veste est', 'là', ', sur la chaise dans l’entrée.', la),
      gt(PLACE, 'Je suis', 'ici', ', dans la cuisine !', ici),
      gt(PLACE, 'Le taxi attend', 'là', ', devant l’hôtel.', la),
    ] },
    { pageId: 'exam-present', type: 'grammar_gap_typing', items: [
      gt(NOW, 'Hier, c’était dimanche.', cap('aujourd’hui'), ', c’est lundi.', aujourdhui),
      gt(NOW, 'Je ne peux pas venir', 'maintenant', ', je travaille.', maintenant),
      gt(NOW, 'Il fait froid', 'aujourd’hui', '.', aujourdhui),
      gt(NOW, 'Le cours commence', 'maintenant', '.', maintenant),
      gt(NOW, 'C’est le 14 juillet', 'aujourd’hui', '.', aujourdhui),
    ] },
    { pageId: 'exam-future', type: 'grammar_gap_typing', items: [
      gt(LATER, 'Aujourd’hui, c’est lundi.', cap('demain'), ', c’est mardi.', demain),
      gt(LATER, 'Attends-moi, je reviens', 'tout de suite', '!', toutDeSuite),
      gt(LATER, 'À', 'demain', ', les enfants !', demain),
      gt(LATER, 'Les vacances arrivent', 'bientôt', '.', bientot),
      gt(LATER, 'Le docteur vient', 'tout de suite', '.', toutDeSuite),
    ] },
  ],
} satisfies LessonDefinition;
