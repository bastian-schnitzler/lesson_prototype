import { choice, L, order, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** A2: an email full of news from a friend; the exam reads another friend’s email. */
export default {
  id: 'fr-reading-a-friends-email-with-news',
  genre: 'letter',
  objective: L('Read a friend’s email about the last months (new job, move, meeting someone) and say what has changed in her life.', 'Lire le mail d’une amie qui raconte ses derniers mois (nouveau travail, déménagement, rencontre) et dire ce qui a changé dans sa vie.', 'Die E-Mail einer Freundin über die letzten Monate lesen (neue Arbeit, Umzug, Kennenlernen) und sagen, was sich in ihrem Leben verändert hat.'),
  situation: L('In June, Chloé writes to her old friend Marion after a long silence.', 'En juin, Chloé écrit à son amie Marion après un long silence.', 'Im Juni schreibt Chloé ihrer alten Freundin Marion nach langer Funkstille.'),
  readerTask: L('Find what has changed (job, city, partner) and put the events in the order they happened.', 'Trouver ce qui a changé (travail, ville, amoureux) et remettre les événements dans l’ordre où ils sont arrivés.', 'Finden, was sich verändert hat (Arbeit, Stadt, Partner), und die Ereignisse in ihre zeitliche Reihenfolge bringen.'),
  coverageNotes: L('Past events with the passé composé, time markers (en mars, depuis avril, le mois dernier), plans with partir. Not covered: writing an answer.', 'Événements passés au passé composé, repères de temps (en mars, depuis avril, le mois dernier), projets avec partir. Non traité : écrire la réponse.', 'Vergangenes im passé composé, Zeitangaben (en mars, depuis avril, le mois dernier), Pläne mit partir. Nicht behandelt: die Antwort schreiben.'),
  prerequisites: [L('The passé composé', 'Le passé composé', 'Das passé composé'), L('Months of the year', 'Les mois de l’année', 'Die Monate')],
  keywords: [
    { id: 'demenager', term: 'déménager', translations: { en: ['to move (house)'], de: ['umziehen'] }, explanation: L('To leave your home and live somewhere else. J’ai déménagé = I moved.', 'Quitter son logement pour habiter ailleurs. J’ai déménagé : je n’habite plus au même endroit.', 'Die Wohnung wechseln. J’ai déménagé = Ich bin umgezogen.'), matching: L('déménager = to move house.', 'déménager : changer de logement.', 'déménager = umziehen.') },
    { id: 'poste', term: 'un poste', translations: { en: ['a job', 'a position'], de: ['eine Stelle', 'ein Posten'] }, explanation: L('A job in a company: un poste de graphiste.', 'Un emploi dans une entreprise : un poste de graphiste.', 'Eine Arbeitsstelle: un poste de graphiste.'), matching: L('un poste = a job, a position.', 'un poste : un emploi.', 'un poste = eine Stelle.') },
    { id: 'collegues', term: 'les collègues', translations: { en: ['colleagues', 'workmates'], de: ['die Kollegen'] }, explanation: L('The people you work with.', 'Les personnes avec qui on travaille.', 'Die Leute, mit denen man arbeitet.'), matching: L('les collègues = colleagues.', 'les collègues : les gens du travail.', 'les collègues = die Kollegen.') },
    { id: 'rencontrer', term: 'rencontrer', translations: { en: ['to meet (for the first time)'], de: ['kennenlernen'] }, explanation: L('To meet someone for the first time. J’ai rencontré Hugo = I met Hugo.', 'Voir quelqu’un pour la première fois. J’ai rencontré Hugo.', 'Jemanden zum ersten Mal treffen. J’ai rencontré Hugo = Ich habe Hugo kennengelernt.'), matching: L('rencontrer = to meet for the first time.', 'rencontrer : voir pour la première fois.', 'rencontrer = kennenlernen.') },
    { id: 'quoi-de-neuf', term: 'quoi de neuf ?', translations: { en: ['what’s new?'], de: ['was gibt’s Neues?'] }, explanation: L('A friendly question to ask for news.', 'Une question amicale pour demander des nouvelles.', 'Eine freundliche Frage nach Neuigkeiten.'), matching: L('quoi de neuf ? = what’s new?', 'quoi de neuf ? : qu’est-ce qui est nouveau ?', 'quoi de neuf ? = was gibt’s Neues?') },
  ],
  main: {
    contents: L('An email of 12 June from Chloé to Marion: sorry for the silence, many changes since January; since April she lives in Nantes near the Loire, she moved for her new job; in March she found a job as a graphic designer in an agency, where she met Hugo last month; in August they go to Brittany together; what’s new with you?', 'Un mail du 12 juin de Chloé à Marion : désolée pour le silence, beaucoup de changements depuis janvier ; depuis avril elle habite à Nantes près de la Loire, elle a déménagé pour son nouveau travail ; en mars elle a trouvé un poste de graphiste dans une agence, où elle a rencontré Hugo le mois dernier ; en août ils partent ensemble en Bretagne ; et toi, quoi de neuf ?', 'Eine E-Mail vom 12. Juni von Chloé an Marion: Entschuldigung für die Funkstille, viele Veränderungen seit Januar; seit April wohnt sie in Nantes an der Loire, umgezogen für ihre neue Arbeit; im März hat sie eine Stelle als Grafikerin in einer Agentur gefunden, wo sie letzten Monat Hugo kennengelernt hat; im August fahren sie zusammen in die Bretagne; was gibt’s Neues bei dir?'),
    title: null,
    meta: ['De : Chloé', 'À : Marion', 'Objet : Plein de nouvelles !', 'Envoyé le 12 juin'],
    parts: [
      { id: 'm-hello', segments: ['Salut Marion,', 'Désolée pour mon long silence !', 'Il y a eu beaucoup de changements dans ma vie depuis janvier.'] },
      { id: 'm-flat', segments: ['Depuis avril, j’habite à Nantes, dans un petit appartement près de la Loire.', 'J’ai déménagé pour mon nouveau travail.'] },
      { id: 'm-job', segments: ['En mars, j’ai trouvé un poste de graphiste dans une agence.', 'Mes collègues sont très sympas.', 'C’est là que j’ai rencontré Hugo, le mois dernier !'] },
      { id: 'm-plans', segments: ['On part ensemble en Bretagne en août.', 'Et toi, quoi de neuf ?', 'Viens me voir quand tu veux !', 'Bises, Chloé'] },
    ],
    highlights: [['demenager', 'm-s5', 'déménagé'], ['poste', 'm-s6', 'poste'], ['collegues', 'm-s7', 'collègues'], ['rencontrer', 'm-s8', 'rencontré'], ['quoi-de-neuf', 'm-s10', 'quoi de neuf']],
  },
  exam: {
    contents: L('Karim writes to Chloé: his daughter Lina was born on 3 May, mother and baby are well; they left Lille and now live in the countryside near Rouen; he works from home three days a week; will she come and see Lina this summer?', 'Karim écrit à Chloé : sa fille Lina est née le 3 mai, tout le monde va bien ; ils ont quitté Lille et habitent à la campagne près de Rouen ; il travaille à la maison trois jours par semaine ; vient-elle voir Lina cet été ?', 'Karim schreibt Chloé: Seine Tochter Lina wurde am 3. Mai geboren, allen geht es gut; sie haben Lille verlassen und wohnen auf dem Land bei Rouen; er arbeitet drei Tage pro Woche zu Hause; kommt sie im Sommer Lina besuchen?'),
    title: null,
    meta: ['De : Karim', 'Objet : Je suis papa !'],
    parts: [
      { id: 'x-baby', segments: ['Salut Chloé !', 'Grande nouvelle : notre fille Lina est née le 3 mai.', 'Elle va très bien, Sarah aussi.'] },
      { id: 'x-home', segments: ['Nous avons quitté Lille et nous habitons maintenant à la campagne, près de Rouen.', 'Je travaille à la maison trois jours par semaine.'] },
      { id: 'x-bye', segments: ['Tu viens voir Lina cet été ? Bises, Karim'] },
    ],
  },
  skim: { focus: 'author', question: 'Qui écrit ce message ?', right: 'Une amie qui donne de ses nouvelles', wrong: ['Une agence qui propose un poste', 'Un propriétaire qui loue un appartement', 'Une collègue qui écrit pour le travail'], explanation: L('Salut Marion, désolée pour mon long silence, bises: a friend who sends her news.', 'Salut Marion, désolée pour mon long silence, bises : une amie qui donne de ses nouvelles.', 'Salut Marion, désolée pour mon long silence, bises: eine Freundin mit Neuigkeiten.') },
  detail: [
    choice('q-city', 'Où habite Chloé maintenant ?', 'À Nantes', ['En Bretagne', 'À Paris', 'Chez Hugo'], ['m-s4'], L('Depuis avril, j’habite à Nantes. Brittany is only the August holiday.', 'Depuis avril, j’habite à Nantes. La Bretagne, ce sont les vacances d’août.', 'Depuis avril, j’habite à Nantes. Die Bretagne ist nur der Urlaub im August.'), L('Her new city', 'Sa nouvelle ville', 'Ihre neue Stadt')),
    short('q-job', 'Quel est le nouveau métier de Chloé ?', ['graphiste', 'elle est graphiste', 'un poste de graphiste', 'graphiste dans une agence'], ['m-s6'], L('J’ai trouvé un poste de graphiste dans une agence.', 'J’ai trouvé un poste de graphiste dans une agence.', 'J’ai trouvé un poste de graphiste dans une agence.'), L('Her new job', 'Son nouveau travail', 'Ihre neue Arbeit')),
    tf('q-hugo', 'Chloé a rencontré Hugo à son travail.', 'true', ['m-s8'], L('True: C’est là que j’ai rencontré Hugo – là is the agency of the sentence before.', 'Vrai : C’est là que j’ai rencontré Hugo – là, c’est l’agence de la phrase d’avant.', 'Richtig: C’est là que j’ai rencontré Hugo – là ist die Agentur aus dem Satz davor.'), L('Where she met Hugo', 'Où elle a rencontré Hugo', 'Wo sie Hugo kennengelernt hat')),
    choice('q-why', 'Pourquoi Chloé a-t-elle déménagé ?', 'Pour son nouveau travail', ['Pour vivre avec Hugo', 'Pour être près de Marion', 'Pour ses études'], ['m-s5'], L('J’ai déménagé pour mon nouveau travail. She met Hugo later.', 'J’ai déménagé pour mon nouveau travail. Elle a rencontré Hugo plus tard.', 'J’ai déménagé pour mon nouveau travail. Hugo hat sie erst später kennengelernt.'), L('The reason for the move', 'La raison du déménagement', 'Der Grund für den Umzug')),
  ],
  structure: {
    instructions: L('In what order did these things happen? Put them from first to last.', 'Dans quel ordre ces événements sont-ils arrivés ? Remettez-les du premier au dernier.', 'In welcher Reihenfolge ist das passiert? Ordne vom Ersten bis zum Letzten.'),
    item: order('order-events', 'information', ['Chloé trouve un poste de graphiste.', 'Chloé déménage à Nantes.', 'Chloé rencontre Hugo.', 'Chloé et Hugo partent en Bretagne.'], L('En mars the job, depuis avril Nantes, le mois dernier (May, the email is from June) Hugo, en août Brittany. The email talks about the flat before the job.', 'En mars le travail, depuis avril Nantes, le mois dernier (mai, le mail date de juin) Hugo, en août la Bretagne. Le mail parle de l’appartement avant le travail.', 'En mars die Stelle, depuis avril Nantes, le mois dernier (Mai, die Mail ist vom Juni) Hugo, en août die Bretagne. Die Mail nennt die Wohnung vor der Arbeit.')),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      choice('x-news', 'Quelle est la grande nouvelle de Karim ?', 'Il a eu une fille.', ['Il a un nouveau travail.', 'Il se marie.', 'Il part en vacances.'], ['x-s2'], L('Notre fille Lina est née le 3 mai: Karim is a father (the subject: Je suis papa !).', 'Notre fille Lina est née le 3 mai : Karim est papa (Objet : Je suis papa !).', 'Notre fille Lina est née le 3 mai: Karim ist Vater (Betreff: Je suis papa !).')),
      short('x-date', 'Quand Lina est-elle née ?', ['le 3 mai', '3 mai', 'le trois mai', 'en mai, le 3'], ['x-s2'], L('Lina est née le 3 mai.', 'Lina est née le 3 mai.', 'Lina est née le 3 mai.')),
      tf('x-city', 'Karim habite toujours à Lille.', 'false', ['x-s4'], L('False: nous avons quitté Lille; they live in the countryside near Rouen.', 'Faux : nous avons quitté Lille ; ils habitent à la campagne près de Rouen.', 'Falsch: nous avons quitté Lille; sie wohnen auf dem Land bei Rouen.')),
      choice('x-work', 'Combien de jours Karim travaille-t-il à la maison ?', 'trois jours par semaine', ['tous les jours', 'un jour par semaine', 'cinq jours par semaine'], ['x-s5'], L('Je travaille à la maison trois jours par semaine.', 'Je travaille à la maison trois jours par semaine.', 'Je travaille à la maison trois jours par semaine.')),
      choice('x-invite', 'Que demande Karim à Chloé ?', 'De venir voir Lina cet été', ['De lui trouver un travail', 'De l’aider à déménager', 'De venir à Rouen en mai'], ['x-s6'], L('Tu viens voir Lina cet été ? is an invitation.', 'Tu viens voir Lina cet été ? est une invitation.', 'Tu viens voir Lina cet été ? ist eine Einladung.')),
    ] },
  ],
} satisfies ReadingDefinition;
