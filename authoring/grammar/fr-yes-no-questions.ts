import { gc, gt, L, sp, wo, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const INTONATION = ['rule-intonation-question'];
const ESTCEQUE = ['rule-est-ce-que'];
const OUINON = ['rule-answering-oui-non'];

/** Capitalised and lower case both count at the start of a sentence. */
const cap = (w: string) => [w[0].toUpperCase() + w.slice(1), w];

const qmark = L('A yes/no question can keep the statement word order; in writing it ends with a question mark, in speech the voice rises.', 'Une question fermée peut garder l’ordre de la phrase affirmative ; à l’écrit, elle finit par un point d’interrogation, à l’oral la voix monte.', 'Eine Ja/Nein-Frage kann die Satzstellung des Aussagesatzes behalten; schriftlich endet sie mit Fragezeichen, gesprochen steigt die Stimme.');
const oui = (what: string) => L(`The answer confirms the question (${what}), so it starts with oui.`, `La réponse confirme la question (${what}) : elle commence par oui.`, `Die Antwort bestätigt die Frage (${what}), also beginnt sie mit oui.`);
const non = (what: string) => L(`The answer says something different (${what}), so it starts with non.`, `La réponse dit autre chose (${what}) : elle commence par non.`, `Die Antwort sagt etwas anderes (${what}), also beginnt sie mit non.`);
const estceque = L('Est-ce que goes in front of a statement to make a yes/no question: est-ce que + subject + verb.', 'Est-ce que se place devant la phrase affirmative pour poser une question fermée : est-ce que + sujet + verbe.', 'Est-ce que vor einen Aussagesatz gestellt ergibt eine Ja/Nein-Frage: est-ce que + Subjekt + Verb.');
const estcequ = (next: string) => L(`Before a vowel (${next}) est-ce que becomes est-ce qu’.`, `Devant une voyelle (${next}), est-ce que devient est-ce qu’.`, `Vor einem Vokal (${next}) wird est-ce que zu est-ce qu’.`);
const order = L('The word order stays that of the statement; est-ce que only goes in front.', 'L’ordre des mots reste celui de la phrase affirmative ; est-ce que se place seulement devant.', 'Die Wortstellung bleibt wie im Aussagesatz; est-ce que kommt nur davor.');

export default {
  id: 'fr-yes-no-questions',
  newVerbs: [],
  blocks: [
    {
      id: 'block-intonation',
      exercises: [
        { id: 'ex-intonation-choice', type: 'grammar_gap_choice', items: [
          gc(INTONATION, 'Tu parles français', '?', ['.', '!', ','], '', qmark, L('a question', 'une question', 'eine Frage')),
          gc(INTONATION, 'Vous habitez à Paris', '?', ['.', '!', ','], '', qmark, L('a question', 'une question', 'eine Frage')),
          gc(OUINON, '— Tu es française ? —', 'Oui', ['Non', 'Si', 'Est-ce que'], ', je suis française.', oui('je suis française')),
          gc(OUINON, '— Tu habites à Paris ? —', 'Non', ['Oui', 'Si', 'Est-ce que'], ', j’habite à Lyon.', non('j’habite à Lyon')),
          gc(OUINON, '— Vous êtes étudiant ? —', 'Oui', ['Non', 'Si', 'Est-ce que'], ', je suis étudiant.', oui('je suis étudiant')),
          gc(OUINON, '— Il est médecin ? —', 'Non', ['Oui', 'Si', 'Est-ce qu’'], ', il est professeur.', non('il est professeur')),
        ] },
        { id: 'ex-intonation-typing', type: 'grammar_gap_typing', items: [
          gt(OUINON, '— Tu parles anglais ? —', cap('oui'), ', je parle anglais.', oui('je parle anglais')),
          gt(OUINON, '— Vous êtes belge ? —', cap('non'), ', je suis suisse.', non('je suis suisse')),
          gt(OUINON, '— Elle habite ici ? —', cap('oui'), ', elle habite ici.', oui('elle habite ici')),
          gt(OUINON, '— Tu as dix ans ? —', cap('non'), ', j’ai onze ans.', non('j’ai onze ans')),
          gt(OUINON, '— Ils sont frères ? —', cap('oui'), ', ils sont frères.', oui('ils sont frères')),
        ] },
        { id: 'ex-intonation-order', type: 'grammar_word_order', items: [
          wo(INTONATION, ['Tu', 'parles', 'anglais', '?'], qmark),
          wo(INTONATION, ['Vous', 'êtes', 'français', '?'], qmark),
          wo(INTONATION, ['Il', 'habite', 'à', 'Lyon', '?'], qmark),
          wo(INTONATION, ['Elle', 'a', 'un', 'chat', '?'], qmark),
          wo(INTONATION, ['Tu', 'aimes', 'la', 'musique', '?'], qmark),
        ] },
      ],
    },
    {
      id: 'block-est-ce-que',
      exercises: [
        { id: 'ex-est-ce-que-choice', type: 'grammar_gap_choice', items: [
          gc(ESTCEQUE, '', 'Est-ce que', ['Est-ce qu’', 'Qu’est-ce que', 'Est-ce'], 'tu parles anglais ?', estceque),
          gc(ESTCEQUE, '', 'Est-ce qu’', ['Est-ce que', 'Qu’est-ce qu’', 'Est-ce'], 'il habite ici ?', estcequ('il')),
          gc(ESTCEQUE, '', 'Est-ce que', ['Est-ce qu’', 'Qu’est-ce que', 'Est-ce'], 'vous êtes prêts ?', estceque),
          gc(ESTCEQUE, '', 'Est-ce qu’', ['Est-ce que', 'Qu’est-ce qu’', 'Est-ce'], 'elle aime le sport ?', estcequ('elle')),
          gc(ESTCEQUE, '', 'Est-ce que', ['Est-ce qu’', 'Qu’est-ce que', 'Est-ce'], 'Marie travaille aujourd’hui ?', estceque),
          gc(ESTCEQUE, '', 'Est-ce qu’', ['Est-ce que', 'Qu’est-ce qu’', 'Est-ce'], 'ils ont une voiture ?', estcequ('ils')),
        ] },
        { id: 'ex-est-ce-que-typing', type: 'grammar_gap_typing', items: [
          gt(ESTCEQUE, '', cap('est-ce que'), 'tu as faim ?', estceque),
          gt(ESTCEQUE, '', cap('est-ce qu’'), 'elle est là ?', estcequ('elle')),
          gt(ESTCEQUE, '', cap('est-ce que'), 'vous parlez allemand ?', estceque),
          gt(ESTCEQUE, '', cap('est-ce qu’'), 'il aime le chocolat ?', estcequ('il')),
          gt(ESTCEQUE, '', cap('est-ce que'), 'Paul habite à Nice ?', estceque),
        ] },
        { id: 'ex-est-ce-que-order', type: 'grammar_word_order', items: [
          wo(ESTCEQUE, ['Est-ce que', 'tu', 'parles', 'français', '?'], order),
          wo(ESTCEQUE, ['Est-ce qu’', 'il', 'est', 'médecin', '?'], estcequ('il')),
          wo(ESTCEQUE, ['Est-ce que', 'vous', 'habitez', 'ici', '?'], order),
          wo(ESTCEQUE, ['Est-ce qu’', 'elle', 'a', 'un', 'vélo', '?'], estcequ('elle')),
        ] },
        { id: 'ex-est-ce-que-spot', type: 'grammar_error_spotter', items: [
          sp(ESTCEQUE, ['Est-ce qu’', 'il', 'parle', 'anglais', '?'], 0, 'Est-ce que', estcequ('il'), ['Est-ce qu’', 'Est-ce que', 'Qu’est-ce que']),
          sp(ESTCEQUE, ['Est-ce que', 'tu', 'es', 'prêt', '?'], 0, 'Est-ce qu’', estceque),
          sp(ESTCEQUE, ['Est-ce qu’', 'elle', 'habite', 'ici', '?'], 0, 'Est-ce que', estcequ('elle'), ['Est-ce qu’', 'Est-ce que', 'Est-ce']),
          sp(ESTCEQUE, ['Est-ce que', 'vous', 'aimez', 'le', 'thé', '?'], 0, 'Qu’est-ce que', L('Est-ce que asks a yes/no question; qu’est-ce que asks "what".', 'Est-ce que pose une question fermée ; qu’est-ce que demande « quoi ».', 'Est-ce que fragt mit Ja/Nein; qu’est-ce que fragt „was“.'), ['Est-ce que', 'Qu’est-ce que', 'Est-ce qu’']),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-order', type: 'grammar_word_order', items: [
      wo(INTONATION, ['Vous', 'parlez', 'espagnol', '?'], qmark),
      wo(ESTCEQUE, ['Est-ce que', 'tu', 'habites', 'à', 'Paris', '?'], order),
      wo(ESTCEQUE, ['Est-ce qu’', 'elle', 'travaille', 'ici', '?'], estcequ('elle')),
      wo(INTONATION, ['Il', 'est', 'content', '?'], qmark),
    ] },
    { pageId: 'exam-est-ce-que', type: 'grammar_gap_typing', items: [
      gt(ESTCEQUE, '', cap('est-ce que'), 'tu aimes la pizza ?', estceque),
      gt(ESTCEQUE, '', cap('est-ce qu’'), 'il parle chinois ?', estcequ('il')),
      gt(ESTCEQUE, '', cap('est-ce que'), 'vous êtes libres ?', estceque),
      gt(ESTCEQUE, '', cap('est-ce qu’'), 'elle a faim ?', estcequ('elle')),
      gt(ESTCEQUE, '', cap('est-ce que'), 'nous travaillons demain ?', estceque),
      gt(ESTCEQUE, '', cap('est-ce qu’'), 'on regarde un film ?', estcequ('on')),
    ] },
    { pageId: 'exam-answers', type: 'grammar_gap_typing', items: [
      gt(OUINON, '— Tu es canadien ? —', cap('oui'), ', je suis canadien.', oui('je suis canadien')),
      gt(OUINON, '— Vous habitez à Rome ? —', cap('non'), ', j’habite à Milan.', non('j’habite à Milan')),
      gt(OUINON, '— Elle a vingt ans ? —', cap('oui'), ', elle a vingt ans.', oui('elle a vingt ans')),
      gt(OUINON, '— Tu aimes le rap ? —', cap('non'), ', j’aime le jazz.', non('j’aime le jazz')),
      gt(OUINON, '— Ils sont là ? —', cap('oui'), ', ils sont là.', oui('ils sont là')),
      gt(INTONATION, 'Tu parles italien', '?', '', qmark),
    ] },
  ],
} satisfies LessonDefinition;
