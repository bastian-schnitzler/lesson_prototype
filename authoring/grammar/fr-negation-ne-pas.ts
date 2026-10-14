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
        ] },
        { id: 'ex-basic-word-order', type: 'grammar_word_order', items: [
          wo(NEPAS, ['Je', 'ne', 'parle', 'pas', 'anglais'], b('parle')),
          wo(NEPAS, ['Tu', 'ne', 'travailles', 'pas', 'ici'], b('travailles')),
          wo(NEPAS, ['Elle', 'ne', 'mange', 'pas', 'de', 'viande'], b('mange')),
        ] },
        { id: 'ex-basic-typing', type: 'grammar_gap_typing', items: [
          gt(NEPAS, 'Je parle italien. → Je', 'ne parle pas', 'italien.', b('parle'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Tu chantes bien. → Tu', 'ne chantes pas', 'bien.', b('chantes'), L('negative', 'négation', 'Verneinung')),
          gt(NEPAS, 'Il travaille le lundi. → Il', 'ne travaille pas', 'le lundi.', b('travaille'), L('negative', 'négation', 'Verneinung')),
        ] },
        { id: 'ex-basic-spot', type: 'grammar_error_spotter', items: [
          sp(NEPAS, ['Je', 'ne', 'parle', 'pas', 'espagnol'], 3, 'non', notNon, ['pas', 'non', 'ne']),
          sp(NEPAS, ['Tu', 'ne', 'travailles', 'pas'], 1, 'pas', b('travailles')),
          sp(NEPAS, ['Il', 'ne', 'chante', 'pas', 'bien'], 3, 'ne', pasMissing, ['pas', 'ne', 'non']),
          sp(NEPAS, ['Nous', 'ne', 'sommes', 'pas', 'là'], 1, 'non', b('sommes')),
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
        ] },
        { id: 'ex-elision-typing', type: 'grammar_gap_typing', items: [
          gt(ELISION, 'J’aime le thé. → Je', 'n’aime pas', 'le thé.', e('aime'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Tu habites à Paris. → Tu', 'n’habites pas', 'à Paris.', e('habites', true), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Il est content. → Il', 'n’est pas', 'content.', e('est'), L('negative', 'négation', 'Verneinung')),
          gt(ELISION, 'Nous avons le temps. → Nous', 'n’avons pas', 'le temps.', e('avons'), L('negative', 'négation', 'Verneinung')),
        ] },
        { id: 'ex-elision-order', type: 'grammar_word_order', items: [
          wo(ELISION, ['Je', 'n’aime', 'pas', 'le', 'froid'], e('aime')),
          wo(ELISION, ['Il', 'n’est', 'pas', 'là'], e('est')),
          wo(ELISION, ['Nous', 'n’habitons', 'pas', 'ici'], e('habitons', true)),
          wo(ELISION, ['Tu', 'n’as', 'pas', 'de', 'stylo', '?'], e('as')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-order', type: 'grammar_word_order', items: [
      wo(NEPAS, ['Je', 'ne', 'travaille', 'pas', 'demain'], b('travaille')),
      wo(ELISION, ['Il', 'n’aime', 'pas', 'le', 'sport'], e('aime')),
      wo(NEPAS, ['Nous', 'ne', 'sommes', 'pas', 'à', 'Paris'], b('sommes')),
    ] },
    { pageId: 'exam-ne-pas', type: 'grammar_gap_typing', items: [
      gt(NEPAS, 'Je danse. → Je', 'ne danse pas', '', b('danse')),
      gt(NEPAS, 'Tu parles japonais. → Tu', 'ne parles pas', 'japonais.', b('parles')),
      gt(NEPAS, 'Il regarde le match. → Il', 'ne regarde pas', 'le match.', b('regarde')),
    ] },
    { pageId: 'exam-elision', type: 'grammar_gap_typing', items: [
      gt(ELISION, 'J’habite à Lyon. → Je', 'n’habite pas', 'à Lyon.', e('habite', true)),
      gt(ELISION, 'Tu aimes le chocolat. → Tu', 'n’aimes pas', 'le chocolat.', e('aimes')),
      gt(ELISION, 'Il a faim. → Il', 'n’a pas', 'faim.', e('a')),
      gt(ELISION, 'Nous écoutons. → Nous', 'n’écoutons pas', '', e('écoutons')),
    ] },
  ],
} satisfies LessonDefinition;
