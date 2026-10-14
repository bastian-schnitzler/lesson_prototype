import { gc, gt, L, person, sp, type LessonDefinition } from '../../scripts/author-grammar-items.ts';

const SG = ['rule-singular-pronouns'];
const PL = ['rule-plural-pronouns'];
const ON = ['rule-on-informal-we'];
const TUVOUS = ['rule-tu-vs-vous'];

/** A typed pronoun at the start of a sentence: capitalised and lower case both count. */
const cap = (p: string) => [p[0].toUpperCase() + p.slice(1), p];
const x = (en: string, fr: string, de: string) => L(en, fr, de);

const je = x('I = je: the speaker talks about themselves.', 'je = la personne qui parle.', 'ich = je: die sprechende Person.');
const jElision = x('Je becomes j’ before a vowel or a silent h: j’habite.', 'Je devient j’ devant une voyelle ou un h muet : j’habite.', 'Vor Vokal oder stummem h wird je zu j’: j’habite.');
const tu = x('One person you know well (a friend, a child): tu.', 'Une personne proche (un ami, un enfant) : tu.', 'Eine vertraute Person (Freund, Kind): tu.');
const il = (n: string) => x(`${n} is one man or boy: il.`, `${n} est un homme ou un garçon : il.`, `${n} ist ein Mann oder Junge: il.`);
const elle = (n: string) => x(`${n} is one woman or girl: elle.`, `${n} est une femme ou une fille : elle.`, `${n} ist eine Frau oder ein Mädchen: elle.`);
const nous = x('The speaker plus others: nous.', 'La personne qui parle et d’autres : nous.', 'Die sprechende Person und andere: nous.');
const vousPl = x('Several people you talk to: always vous.', 'Plusieurs personnes à qui on parle : toujours vous.', 'Mehrere angesprochene Personen: immer vous.');
const vousPolite = x('One person you address politely (a teacher, a stranger, a customer): vous.', 'Une personne qu’on vouvoie (un professeur, un inconnu, un client) : vous.', 'Eine Person, die man siezt (Lehrkraft, Fremde, Kundschaft): vous.');
const ils = (n: string) => x(`${n}: a group of men or a mixed group is ils.`, `${n} : un groupe d’hommes ou un groupe mixte, c’est ils.`, `${n}: eine Gruppe von Männern oder eine gemischte Gruppe ist ils.`);
const elles = (n: string) => x(`${n}: a group of women only is elles.`, `${n} : un groupe de femmes seulement, c’est elles.`, `${n}: eine Gruppe nur aus Frauen ist elles.`);
const on = x('In spoken French, on often means "we"; the verb takes the il form: on est.', 'À l’oral, on veut souvent dire « nous » ; le verbe prend la forme de il : on est.', 'Im gesprochenen Französisch heißt on oft „wir“; das Verb steht in der il-Form: on est.');
const hint = (en: string, fr: string, de: string) => L(en, fr, de);

export default {
  id: 'fr-subject-pronouns',
  newVerbs: [
    { infinitive: 'être', translations: { en: 'to be', de: 'sein' } },
    { infinitive: 'parler', translations: { en: 'to speak', de: 'sprechen' } },
    { infinitive: 'habiter', translations: { en: 'to live (somewhere)', de: 'wohnen' } },
  ],
  blocks: [
    {
      id: 'block-singular-pronouns',
      exercises: [
        { id: 'ex-singular-choice', type: 'grammar_gap_choice', items: [
          gc(SG, '', 'Je', ['Tu', 'Il', 'Nous'], 'suis étudiant.', x('Suis goes with je: je suis.', 'Suis va avec je : je suis.', 'Suis gehört zu je: je suis.')),
          gc(SG, '', 'Tu', ['Je', 'Elle', 'Vous'], 'es fatigué, Marc ?', x('Es goes with tu, and Marc is a friend: tu es.', 'Es va avec tu, et Marc est un ami : tu es.', 'Es gehört zu tu, und Marc ist ein Freund: tu es.')),
          gc(SG, '', 'J’', ['Je', 'Tu', 'Il'], 'habite à Nice.', jElision),
        ] },
        { id: 'ex-singular-typing', type: 'grammar_gap_typing', items: [
          gt(SG, 'Thomas est mon ami.', cap('il'), 'est sympa.', il('Thomas')),
          gt(SG, 'Léa est ma sœur.', cap('elle'), 'habite à Paris.', elle('Léa')),
        ] },
        { id: 'ex-singular-spot', type: 'grammar_error_spotter', items: [
          sp(SG, ['J’habite', 'à', 'Lille'], 0, 'Je habite', jElision, ['J’habite', 'Je habite', 'Tu habite']),
          sp(SG, ['Voici', 'Sophie', ':', 'elle', 'est', 'belge'], 3, 'il', elle('Sophie'), ['elle', 'il', 'ils']),
        ] },
      ],
    },
    {
      id: 'block-plural-pronouns',
      exercises: [
        { id: 'ex-pronoun-translation', type: 'grammar_person_matching', items: [
          person([...SG, ...PL], 'translation', [
            [{ en: 'I', de: 'ich' }, 'je', je], [{ en: 'you (one friend)', de: 'du' }, 'tu', tu], [{ en: 'he', de: 'er' }, 'il', il('He')],
            [{ en: 'we', de: 'wir' }, 'nous', nous], [{ en: 'you (several people)', de: 'ihr' }, 'vous', vousPl], [{ en: 'they (men or a mixed group)', de: 'sie (Männer oder gemischte Gruppe)' }, 'ils', ils('They')],
          ]),
        ] },
        { id: 'ex-plural-gap-choice', type: 'grammar_gap_choice', items: [
          gc(PL, '', 'Nous', ['Vous', 'Ils', 'On'], 'sommes amis.', x('Sommes goes with nous: nous sommes.', 'Sommes va avec nous : nous sommes.', 'Sommes gehört zu nous: nous sommes.')),
          gc(PL, 'Paul et Léa ?', 'Ils', ['Elles', 'Nous', 'Il'], 'sont mariés.', ils('Paul et Léa')),
          gc(ON, 'Chez nous,', 'on', ['nous', 'ils', 'vous'], 'est contents.', on, hint('"we", spoken French, verb in the il form', '« nous » à l’oral, verbe à la forme de il', '„wir“, gesprochen, Verb in der il-Form')),
        ] },
        { id: 'ex-plural-typing', type: 'grammar_gap_typing', items: [
          gt(PL, 'Marc et Paul sont frères.', cap('ils'), 'habitent à Nantes.', ils('Marc et Paul')),
          gt(PL, 'Anne et Julie sont étudiantes.', cap('elles'), 'parlent espagnol.', elles('Anne et Julie')),
          gt(PL, 'Toi et moi,', 'nous', 'sommes voisins.', nous, hint('you and I', 'toi et moi', 'du und ich')),
        ] },
      ],
    },
    {
      id: 'block-tu-vs-vous',
      exercises: [
        { id: 'ex-tu-vous-gap-choice', type: 'grammar_gap_choice', items: [
          gc(TUVOUS, 'Bonjour Madame,', 'vous', ['tu', 'nous', 'elle'], 'allez bien ?', vousPolite, hint('a woman you do not know', 'une femme inconnue', 'eine unbekannte Frau')),
          gc(TUVOUS, 'Salut Léo,', 'tu', ['vous', 'il', 'nous'], 'vas bien ?', tu, hint('a close friend', 'un ami proche', 'ein enger Freund')),
          gc(TUVOUS, 'Monsieur le directeur,', 'vous', ['tu', 'il', 'ils'], 'avez une minute ?', vousPolite, hint('the school head', 'le directeur', 'der Schulleiter')),
        ] },
        { id: 'ex-tu-vous-typing', type: 'grammar_gap_typing', items: [
          gt(TUVOUS, 'Madame Leroy,', 'vous', 'êtes médecin ?', vousPolite, hint('polite, one person', 'politesse, une personne', 'höflich, eine Person')),
          gt(TUVOUS, 'Hé, Lucas !', cap('tu'), 'es en retard !', tu, hint('a friend', 'un ami', 'ein Freund')),
          gt(TUVOUS, 'Monsieur,', 'vous', 'parlez anglais ?', vousPolite, hint('a stranger', 'un inconnu', 'ein Fremder')),
        ] },
      ],
    },
  ],
  exam: [
    { pageId: 'exam-singular', type: 'grammar_gap_typing', items: [
      gt(SG, 'Voici Nicolas.', cap('il'), 'est italien.', il('Nicolas')),
      gt(SG, 'Voici Claire.', cap('elle'), 'est infirmière.', elle('Claire')),
      gt(SG, '', cap('je'), 'suis fatigué.', je),
      gt(SG, '', cap('j’'), 'habite à Marseille.', jElision),
    ] },
    { pageId: 'exam-plural', type: 'grammar_gap_typing', items: [
      gt(PL, 'Mes frères ?', cap('ils'), 'sont grands.', ils('Mes frères')),
      gt(PL, 'Mes sœurs ?', cap('elles'), 'sont petites.', elles('Mes sœurs')),
      gt(PL, 'Lui et moi,', 'nous', 'parlons japonais.', nous),
      gt(ON, 'Le samedi,', 'on', 'est à la maison.', on),
    ] },
    { pageId: 'exam-tu-vous', type: 'grammar_gap_typing', items: [
      gt(TUVOUS, 'Bonjour madame,', 'vous', 'êtes française ?', vousPolite),
      gt(TUVOUS, 'Salut Inès,', 'tu', 'habites ici ?', tu),
      gt(TUVOUS, 'Monsieur Dubois,', 'vous', 'parlez allemand ?', vousPolite),
      gt(TUVOUS, 'Papi,', 'tu', 'es fatigué ?', x('In the family, people say tu.', 'En famille, on se dit tu.', 'In der Familie sagt man tu.')),
    ] },
  ],
} satisfies LessonDefinition;
