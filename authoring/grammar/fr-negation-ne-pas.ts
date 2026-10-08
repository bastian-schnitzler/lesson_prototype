import { gc, gt, L, sp, wo, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const NEPAS = ['rule-ne-pas-structure'];
const ELISION = ['rule-n-elision'];

/** ne before the conjugated verb, pas right after it. */
const b = (verb: string) => L(`Ne goes before the verb and pas right after it: ne ${verb} pas.`, `Ne se place avant le verbe et pas juste après : ne ${verb} pas.`, `Ne steht vor dem Verb, pas direkt danach: ne ${verb} pas.`);
/** n’ before a vowel or a silent h. */
const e = (verb: string, h = false) => L(
  `${verb} starts with ${h ? 'a silent h' : 'a vowel'}, so ne becomes n’: n’${verb} pas.`,
  `${verb} commence par ${h ? 'un h muet' : 'une voyelle'} : ne devient n’ : n’${verb} pas.`,
  `${verb} beginnt mit ${h ? 'stummem h' : 'einem Vokal'}, also wird ne zu n’: n’${verb} pas.`,
);
const pasMissing = L('French negation has two parts: ne … pas. Pas must not be left out in writing.', 'La négation française a deux parties : ne … pas. À l’écrit, on n’oublie pas pas.', 'Die französische Verneinung hat zwei Teile: ne … pas. Schriftlich darf pas nicht fehlen.');
const notNon = L('Non answers a question; inside a sentence the negation is ne … pas.', 'Non répond à une question ; dans la phrase, la négation est ne … pas.', 'Non antwortet auf eine Frage; im Satz verneint man mit ne … pas.');

export default {
  id: 'fr-negation-ne-pas',
  newVerbs: [],
  blocks: [
    {
      id: 'block-ne-pas-basic',
      exercises: [
        { id: 'ex-basic-choice', type: 'grammar_gap_choice', items: [
          gc(NEPAS, 'Je', 'ne', ['pas', 'non', 'n’'], 'parle pas russe.', b('parle')),
          gc(NEPAS, 'Tu ne travailles', 'pas', ['ne', 'non', 'plus'], 'le dimanche ?', b('travailles')),
          gc(NEPAS, 'Il', 'ne', ['non', 'pas', 'n’'], 'regarde pas la télé.', b('regarde')),
          gc(NEPAS, 'Nous ne parlons', 'pas', ['non', 'ne', 'n’'], 'chinois.', b('parlons')),
          gc(NEPAS, 'Vous', 'ne', ['pas', 'n’', 'non'], 'dansez pas ?', b('dansez')),
          gc(NEPAS, 'Elles ne sont', 'pas', ['non', 'ne', 'n’'], 'là.', b('sont')),
          gc(NEPAS, 'Paul', 'ne', ['non', 'pas', 'n’'], 'joue pas au foot.', b('joue')),
          gc(NEPAS, 'Je ne suis', 'pas', ['non', 'ne', 'n’'], 'français.', notNon),
        ] },
        { id: 'ex-basic-word-order', type: 'grammar_word_order', items: [
          wo(NEPAS, ['Je', 'ne', 'parle', 'pas', 'anglais'], b('parle')),
          wo(NEPAS, ['Tu', 'ne', 'travailles', 'pas', 'ici'], b('travailles')),
          wo(NEPAS, ['Elle', 'ne', 'mange', 'pas', 'de', 'viande'], b('mange')),
          wo(NEPAS, ['Nous', 'ne', 'regardons', 'pas', 'le', 'film'], b('regardons')),
          wo(NEPAS, ['Vous', 'ne', 'jouez', 'pas', 'au', 'tennis', '?'], b('jouez')),
          wo(NEPAS, ['Ils', 'ne', 'sont', 'pas', 'fatigués'], b('sont')),
          wo(NEPAS, ['Je', 'ne', 'suis', 'pas', 'en', 'retard'], b('suis')),
          wo(NEPAS, ['Le', 'bus', 'ne', 'passe', 'pas', 'ici'], b('passe')),
        ] },
        { id: 'ex-basic-typing', type: 'grammar_gap_typing', items: [
          gt(NEPAS, 'Je parle italien. → Je', 'ne parle pas', 'italien.', b('parle'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Tu chantes bien. → Tu', 'ne chantes pas', 'bien.', b('chantes'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Il travaille le lundi. → Il', 'ne travaille pas', 'le lundi.', b('travaille'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Nous sommes prêts. → Nous', 'ne sommes pas', 'prêts.', b('sommes'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Vous parlez vite. → Vous', 'ne parlez pas', 'vite.', b('parlez'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Elles dansent. → Elles', 'ne dansent pas', '', b('dansent'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Je suis médecin. → Je', 'ne suis pas', 'médecin.', b('suis'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Tu regardes la carte. → Tu', 'ne regardes pas', 'la carte.', b('regardes'), L('negative', 'négation', 'Verneinung')),
        ] },
        { id: 'ex-basic-spot', type: 'grammar_error_spotter', items: [
          sp(NEPAS, ['Je', 'ne', 'parle', 'pas', 'espagnol'], 3, 'non', notNon, ['pas', 'non', 'ne']),
          sp(NEPAS, ['Tu', 'ne', 'travailles', 'pas'], 1, 'pas', b('travailles')),
          sp(NEPAS, ['Il', 'ne', 'chante', 'pas', 'bien'], 3, 'ne', pasMissing, ['pas', 'ne', 'non']),
          sp(NEPAS, ['Nous', 'ne', 'sommes', 'pas', 'là'], 1, 'non', b('sommes')),
          sp(NEPAS, ['Vous', 'ne', 'jouez', 'pas', 'ici'], 3, 'non', notNon),
          sp(NEPAS, ['Elle', 'ne', 'regarde', 'pas', 'la', 'télé'], 1, 'pas', b('regarde'), ['ne', 'pas', 'non']),
        ] },
      ],
    },
    {
      id: 'block-n-elision',
      exercises: [
        { id: 'ex-elision-choice', type: 'grammar_gap_choice', items: [
          gc(ELISION, 'Je', 'n’', ['ne', 'non', 'pas'], 'aime pas le café.', e('aime')),
          gc(ELISION, 'Il', 'n’', ['ne', 'non', 'pas'], 'habite pas ici.', e('habite', true)),
          gc(ELISION, 'Tu', 'n’', ['ne', 'non', 'pas'], 'es pas fatigué ?', e('es')),
          gc(ELISION, 'Nous', 'ne', ['n’', 'non', 'pas'], 'parlons pas allemand.', L('Parlons starts with a consonant, so ne stays ne: ne parlons pas.', 'Parlons commence par une consonne : ne reste ne : ne parlons pas.', 'Parlons beginnt mit einem Konsonanten, also bleibt ne: ne parlons pas.')),
          gc(ELISION, 'Elle', 'n’', ['ne', 'non', 'pas'], 'a pas de voiture.', e('a')),
          gc(ELISION, 'Vous', 'n’', ['ne', 'non', 'pas'], 'êtes pas en retard.', e('êtes')),
          gc(ELISION, 'Ils', 'n’', ['ne', 'non', 'pas'], 'écoutent pas.', e('écoutent')),
          gc(ELISION, 'Je', 'n’', ['ne', 'non', 'pas'], 'ai pas faim.', e('ai')),
        ] },
        { id: 'ex-elision-typing', type: 'grammar_gap_typing', items: [
          gt(ELISION, 'J’aime le thé. → Je', 'n’aime pas', 'le thé.', e('aime'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Tu habites à Paris. → Tu', 'n’habites pas', 'à Paris.', e('habites', true), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Il est content. → Il', 'n’est pas', 'content.', e('est'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Nous avons le temps. → Nous', 'n’avons pas', 'le temps.', e('avons'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Vous écoutez la radio. → Vous', 'n’écoutez pas', 'la radio.', e('écoutez'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Elles étudient le soir. → Elles', 'n’étudient pas', 'le soir.', e('étudient'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'J’ai un chien. → Je', 'n’ai pas', 'de chien.', L('Ai starts with a vowel, so ne becomes n’: je n’ai pas. After pas, un becomes de.', 'Ai commence par une voyelle : je n’ai pas. Après pas, un devient de.', 'Ai beginnt mit einem Vokal: je n’ai pas. Nach pas wird un zu de.'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Tu es là. → Tu', 'n’es pas', 'là.', e('es'), L('negative', 'négation', 'Verneinung')),
        ] },
        { id: 'ex-elision-order', type: 'grammar_word_order', items: [
          wo(ELISION, ['Je', 'n’aime', 'pas', 'le', 'froid'], e('aime')),
          wo(ELISION, ['Il', 'n’est', 'pas', 'là'], e('est')),
          wo(ELISION, ['Nous', 'n’habitons', 'pas', 'ici'], e('habitons', true)),
          wo(ELISION, ['Tu', 'n’as', 'pas', 'de', 'stylo', '?'], e('as')),
          wo(ELISION, ['Elles', 'n’écoutent', 'pas', 'la', 'radio'], e('écoutent')),
          wo(ELISION, ['Vous', 'n’êtes', 'pas', 'français', '?'], e('êtes')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-order', type: 'grammar_word_order', items: [
      wo(NEPAS, ['Je', 'ne', 'travaille', 'pas', 'demain'], b('travaille')),
      wo(ELISION, ['Il', 'n’aime', 'pas', 'le', 'sport'], e('aime')),
      wo(NEPAS, ['Nous', 'ne', 'sommes', 'pas', 'à', 'Paris'], b('sommes')),
      wo(ELISION, ['Tu', 'n’habites', 'pas', 'ici', '?'], e('habites', true)),
      wo(NEPAS, ['Elle', 'ne', 'parle', 'pas', 'anglais'], b('parle')),
      wo(ELISION, ['Ils', 'n’ont', 'pas', 'de', 'voiture'], e('ont')),
    ] },
    { pageId: 'exam-ne-pas', type: 'grammar_gap_typing', items: [
      gt(NEPAS, 'Je danse. → Je', 'ne danse pas', '', b('danse')),
      gt(NEPAS, 'Tu parles japonais. → Tu', 'ne parles pas', 'japonais.', b('parles')),
      gt(NEPAS, 'Il regarde le match. → Il', 'ne regarde pas', 'le match.', b('regarde')),
      gt(NEPAS, 'Nous jouons au foot. → Nous', 'ne jouons pas', 'au foot.', b('jouons')),
      gt(NEPAS, 'Vous travaillez ici. → Vous', 'ne travaillez pas', 'ici.', b('travaillez')),
      gt(NEPAS, 'Ils sont contents. → Ils', 'ne sont pas', 'contents.', b('sont')),
      gt(NEPAS, 'Je suis prêt. → Je', 'ne suis pas', 'prêt.', b('suis')),
      gt(NEPAS, 'Elle chante. → Elle', 'ne chante pas', '', b('chante')),
      gt(NEPAS, 'Tu manges ici. → Tu', 'ne manges pas', 'ici.', b('manges')),
    ] },
    { pageId: 'exam-elision', type: 'grammar_gap_typing', items: [
      gt(ELISION, 'J’habite à Lyon. → Je', 'n’habite pas', 'à Lyon.', e('habite', true)),
      gt(ELISION, 'Tu aimes le chocolat. → Tu', 'n’aimes pas', 'le chocolat.', e('aimes')),
      gt(ELISION, 'Il a faim. → Il', 'n’a pas', 'faim.', e('a')),
      gt(ELISION, 'Nous écoutons. → Nous', 'n’écoutons pas', '', e('écoutons')),
      gt(ELISION, 'Vous êtes là. → Vous', 'n’êtes pas', 'là.', e('êtes')),
      gt(ELISION, 'Elles aiment la pluie. → Elles', 'n’aiment pas', 'la pluie.', e('aiment')),
      gt(ELISION, 'Je suis là. → Je', 'ne suis pas', 'là.', L('Suis starts with a consonant, so ne stays ne: je ne suis pas.', 'Suis commence par une consonne : ne reste ne : je ne suis pas.', 'Suis beginnt mit einem Konsonanten, also bleibt ne: je ne suis pas.')),
      gt(ELISION, 'Il étudie. → Il', 'n’étudie pas', '', e('étudie')),
      gt(ELISION, 'Tu as le temps. → Tu', 'n’as pas', 'le temps.', e('as')),
    ] },
  ],
} satisfies LessonDefinition;
