import { choice, L, order, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** B2: an original editorial on medical deserts; the exam reads an editorial on a village post office. */
export default {
  id: 'fr-reading-an-editorial',
  genre: 'article',
  objective: L('Read a newspaper editorial, state its thesis in one sentence and spot the devices meant to convince (rhetorical questions, shock figures, il est temps que).', 'Lire l’éditorial d’un quotidien, formuler sa thèse en une phrase et repérer les procédés qui doivent convaincre (questions rhétoriques, chiffres choc, il est temps que).', 'Den Leitartikel einer Tageszeitung lesen, seine These in einem Satz formulieren und die Überzeugungsmittel erkennen (rhetorische Fragen, Schockzahlen, il est temps que).'),
  situation: L('A regional daily paper publishes its editorial after an elderly woman waited six hours in A&E.', 'Un quotidien régional publie son éditorial après qu’une vieille dame a attendu six heures aux urgences.', 'Eine Regionalzeitung veröffentlicht ihren Leitartikel, nachdem eine ältere Frau sechs Stunden in der Notaufnahme gewartet hat.'),
  readerTask: L('Find the thesis, follow the argument step by step and recognise how the author tries to persuade.', 'Trouver la thèse, suivre l’argumentation étape par étape et reconnaître comment l’auteure cherche à convaincre.', 'Die These finden, der Argumentation Schritt für Schritt folgen und erkennen, wie die Autorin überzeugen will.'),
  coverageNotes: L('Argument structure (fact, causes, objection, proposals, call to action), rhetorical questions, the subjunctive after il est temps que, faute de. Not covered: the French health system in detail.', 'Structure argumentative (constat, causes, objection, propositions, appel), questions rhétoriques, subjonctif après il est temps que, faute de. Non traité : le système de santé français en détail.', 'Argumentationsaufbau (Befund, Ursachen, Einwand, Vorschläge, Appell), rhetorische Fragen, Subjonctif nach il est temps que, faute de. Nicht behandelt: das französische Gesundheitssystem im Detail.'),
  prerequisites: [L('The present subjunctive', 'Le subjonctif présent', 'Der Subjonctif Präsens'), L('Connectors of argument (pourtant, mais)', 'Les connecteurs logiques (pourtant, mais)', 'Argumentative Konnektoren (pourtant, mais)')],
  keywords: [
    { id: 'faute-de', term: 'faute de', translations: { en: ['for lack of', 'without'], de: ['mangels', 'aus Mangel an'] }, explanation: L('Because something is missing: faute de médecin = because there is no doctor.', 'Parce qu’il manque quelque chose : faute de médecin, parce qu’il n’y a pas de médecin.', 'Weil etwas fehlt: faute de médecin = weil es keinen Arzt gibt.'), matching: L('faute de = for lack of.', 'faute de : parce qu’il manque…', 'faute de = mangels.') },
    { id: 'desert-medical', term: 'un désert médical', translations: { en: ['a medical desert', 'an area with too few doctors'], de: ['eine ärztlich unterversorgte Region'] }, explanation: L('An area where there are too few doctors for the population.', 'Une zone où il y a trop peu de médecins pour les habitants.', 'Eine Gegend mit zu wenigen Ärzten für die Bevölkerung.'), matching: L('un désert médical = an area with too few doctors.', 'un désert médical : une zone sans assez de médecins.', 'un désert médical = unterversorgte Region.') },
    { id: 'medecin-traitant', term: 'le médecin traitant', translations: { en: ['the family doctor', 'the GP'], de: ['der Hausarzt'] }, explanation: L('The doctor you are registered with and see first.', 'Le médecin qu’on a choisi et qu’on consulte en premier.', 'Der Arzt, bei dem man eingeschrieben ist und zuerst hingeht.'), matching: L('le médecin traitant = the family doctor.', 'le médecin traitant : son médecin habituel.', 'le médecin traitant = der Hausarzt.') },
    { id: 'teleconsultation', term: 'la téléconsultation', translations: { en: ['the online consultation', 'telemedicine'], de: ['die Videosprechstunde'] }, explanation: L('Seeing a doctor through a screen.', 'Consulter un médecin à travers un écran.', 'Einen Arzt über den Bildschirm konsultieren.'), matching: L('la téléconsultation = an online consultation.', 'la téléconsultation : consulter par écran.', 'la téléconsultation = Videosprechstunde.') },
    { id: 'maison-de-sante', term: 'une maison de santé', translations: { en: ['a health centre', 'a group practice'], de: ['ein Gesundheitszentrum', 'eine Gemeinschaftspraxis'] }, explanation: L('A building where several doctors and nurses work together.', 'Un lieu où plusieurs médecins et soignants travaillent ensemble.', 'Ein Haus, in dem mehrere Ärzte und Pflegekräfte zusammenarbeiten.'), matching: L('une maison de santé = a health centre.', 'une maison de santé : des soignants réunis.', 'une maison de santé = Gesundheitszentrum.') },
    { id: 'il-est-temps-que', term: 'il est temps que', translations: { en: ['it is time that', 'it is high time'], de: ['es ist Zeit, dass'] }, explanation: L('A strong call to act, followed by the subjunctive: il est temps que l’État prenne…', 'Un appel fort à agir, suivi du subjonctif : il est temps que l’État prenne…', 'Ein starker Handlungsappell mit Subjonctif: il est temps que l’État prenne…'), matching: L('il est temps que = it is high time that.', 'il est temps que : il faut agir maintenant.', 'il est temps que = es ist höchste Zeit, dass.') },
  ],
  main: {
    contents: L('An editorial in five paragraphs: Josette, 82, waited six hours in A&E for lack of a village doctor; six million people live in medical deserts. Causes: thirty years of limits on medical students, retiring doctors not replaced, young doctors prefer cities – can we blame them? Objection: telemedicine will solve it – no, many elderly people have no computer and you cannot examine through a screen. Proposals: group health centres, compulsory years in short areas abroad – why not debate it? Call: it is time the State acted; health is a right that must not depend on your postcode.', 'Un éditorial en cinq paragraphes : Josette, 82 ans, a attendu six heures aux urgences faute de médecin au village ; six millions de Français vivent dans un désert médical. Causes : trente ans de limitation des étudiants, médecins retraités non remplacés, jeunes attirés par les villes – peut-on le leur reprocher ? Objection : la téléconsultation réglera tout – non, beaucoup de personnes âgées n’ont pas d’ordinateur et on n’ausculte pas à travers un écran. Propositions : maisons de santé, obligation d’exercer quelques années dans les zones manquantes – pourquoi ne pas en débattre ? Appel : il est temps que l’État agisse ; la santé est un droit qui ne doit pas dépendre du code postal.', 'Ein Leitartikel in fünf Absätzen: Josette, 82, wartete sechs Stunden in der Notaufnahme, weil es im Dorf keinen Arzt gibt; sechs Millionen Menschen leben in unterversorgten Regionen. Ursachen: dreißig Jahre Begrenzung der Medizinstudierenden, nicht ersetzte Ruheständler, junge Ärzte ziehen die Städte vor – kann man es ihnen vorwerfen? Einwand: Telemedizin löse das – nein, viele Ältere haben keinen Computer, und man untersucht nicht über einen Bildschirm. Vorschläge: Gesundheitszentren, Pflichtjahre in unterversorgten Gebieten – warum nicht darüber reden? Appell: Der Staat muss handeln; Gesundheit ist ein Recht, das nicht von der Postleitzahl abhängen darf.'),
    title: 'Soigner les campagnes, une urgence nationale',
    meta: ['Éditorial · Le Courrier du Centre', 'par Anne Delorme · mardi 4 mars'],
    parts: [
      { id: 'm-fact', segments: [
        'Six heures.',
        'C’est le temps qu’a attendu Josette, 82 ans, aux urgences de Châteauroux, la semaine dernière, faute de médecin dans son village.',
        'Son histoire n’a rien d’exceptionnel.',
        'Elle est devenue la règle.',
        'Aujourd’hui, six millions de Français vivent dans un désert médical, et près d’un sur dix n’a plus de médecin traitant.',
      ] },
      { id: 'm-causes', segments: [
        'Comment en est-on arrivé là ?',
        'Pendant trente ans, on a limité le nombre d’étudiants en médecine pour, disait-on, maîtriser les dépenses de santé.',
        'Les médecins qui partent à la retraite ne sont pas remplacés, et les jeunes préfèrent les grandes villes, leurs hôpitaux et leurs écoles.',
        'Peut-on vraiment le leur reprocher ?',
      ] },
      { id: 'm-objection', segments: [
        'On nous répond que la téléconsultation va régler le problème.',
        'C’est oublier que beaucoup de personnes âgées n’ont ni ordinateur ni bonne connexion, et qu’on n’ausculte pas un patient à travers un écran.',
        'La technologie peut aider ; elle ne remplace pas une présence.',
      ] },
      { id: 'm-proposals', segments: [
        'Des solutions existent pourtant.',
        'Certaines communes ouvrent des maisons de santé où plusieurs médecins partagent les frais et les gardes.',
        'Elles attirent déjà de jeunes médecins dans l’Indre et la Creuse.',
        'D’autres pays obligent les jeunes diplômés à exercer quelques années là où l’on manque de soignants.',
        'Pourquoi la France refuserait-elle d’en débattre ?',
      ] },
      { id: 'm-call', segments: [
        'Il est temps que l’État prenne ses responsabilités.',
        'La santé n’est pas un luxe réservé aux habitants des métropoles : c’est un droit, et ce droit ne doit pas dépendre de son code postal.',
        'Josette, elle, n’a plus le temps d’attendre.',
      ] },
    ],
    highlights: [['faute-de', 'm-s2', 'faute de'], ['desert-medical', 'm-s5', 'désert médical'], ['medecin-traitant', 'm-s5', 'médecin traitant'], ['teleconsultation', 'm-s10', 'téléconsultation'], ['maison-de-sante', 'm-s14', 'maisons de santé'], ['il-est-temps-que', 'm-s18', 'Il est temps que']],
  },
  exam: {
    contents: L('An editorial against closing a village post office that receives forty customers a day, open three mornings a week: the customers are mostly pensioners, the next office will be 25 km away with one bus a day; a post point in the grocery is acceptable only if the grocer is trained and paid; a public service is not measured in customers per day – it is time local politicians defended villages.', 'Un éditorial contre la fermeture d’un bureau de poste de village qui reçoit quarante clients par jour, ouvert trois matinées par semaine : ce sont surtout des retraités, le prochain bureau sera à 25 km avec un bus par jour ; un point poste à l’épicerie est acceptable si l’épicière est formée et payée ; un service public ne se mesure pas en clients par jour – il est temps que les élus défendent les villages.', 'Ein Leitartikel gegen die Schließung einer Dorfpost mit vierzig Kunden am Tag, drei Vormittage pro Woche geöffnet: Es sind vor allem Rentner, die nächste Post liegt 25 km entfernt bei einem Bus am Tag; eine Poststelle im Lebensmittelladen geht nur, wenn die Inhaberin geschult und bezahlt wird; ein öffentlicher Dienst misst sich nicht in Kunden pro Tag – die Politiker müssen die Dörfer verteidigen.'),
    title: 'La poste du village, un service à défendre',
    meta: ['Éditorial · La Gazette des Vosges', 'par Marc Weber'],
    parts: [
      { id: 'x-question', segments: ['Faut-il vraiment fermer le bureau de poste de Saint-Dié-les-Prés ?', 'La direction régionale l’affirme : il ne reçoit que quarante clients par jour.', 'Le bureau ouvre trois matinées par semaine.'] },
      { id: 'x-people', segments: ['Mais ces quarante clients, ce sont surtout des retraités qui viennent chercher leur pension, envoyer un colis ou simplement parler à quelqu’un.', 'Pour eux, le bureau le plus proche sera à vingt-cinq kilomètres, et il n’y a qu’un bus par jour.'] },
      { id: 'x-shop', segments: ['On nous propose un « point poste » dans l’épicerie.', 'L’idée n’est pas mauvaise, à condition que l’épicière soit formée et payée pour ce travail.'] },
      { id: 'x-call', segments: ['Un service public ne se mesure pas seulement en clients par jour.', 'Il est temps que nos élus défendent les villages avant qu’ils ne se vident.'] },
    ],
  },
  skim: { focus: 'purpose', question: 'Quel est le but de ce texte ?', right: 'Convaincre l’État d’agir contre les déserts médicaux', wrong: ['Raconter la vie d’une infirmière', 'Présenter un nouvel hôpital', 'Expliquer comment utiliser la téléconsultation'], explanation: L('Éditorial, a title calling for action (une urgence nationale) and a last paragraph starting with Il est temps que l’État…: it wants to convince.', 'Éditorial, un titre qui appelle à agir (une urgence nationale) et un dernier paragraphe qui commence par Il est temps que l’État… : il veut convaincre.', 'Éditorial, ein Titel mit Handlungsaufruf (une urgence nationale) und ein letzter Absatz mit Il est temps que l’État…: Der Text will überzeugen.') },
  detail: [
    short('q-wait', 'Combien de temps Josette a-t-elle attendu aux urgences ?', ['six heures', '6 heures', '6 h', '6h', 'six h'], ['m-s1', 'm-s2'], L('Six heures. C’est le temps qu’a attendu Josette.', 'Six heures. C’est le temps qu’a attendu Josette.', 'Six heures. C’est le temps qu’a attendu Josette.'), L('The opening fact', 'Le fait du début', 'Die Tatsache am Anfang')),
    choice('q-thesis', 'Quelle phrase résume le mieux la thèse de l’éditorial ?', 'L’État doit garantir l’accès aux médecins partout.', ['La téléconsultation suffit pour soigner les campagnes.', 'Les jeunes médecins sont égoïstes.', 'Il faut fermer les petits hôpitaux.'], ['m-s18', 'm-s19'], L('The thesis is in the call: Il est temps que l’État prenne ses responsabilités… ce droit ne doit pas dépendre de son code postal.', 'La thèse est dans l’appel final : Il est temps que l’État prenne ses responsabilités… ce droit ne doit pas dépendre de son code postal.', 'Die These steckt im Appell: Il est temps que l’État prenne ses responsabilités… ce droit ne doit pas dépendre de son code postal.'), L('The thesis', 'La thèse', 'Die These')),
    tf('q-tele', 'L’auteure pense que la téléconsultation peut remplacer le médecin.', 'false', ['m-s12'], L('False: la technologie peut aider ; elle ne remplace pas une présence. The objection is rejected.', 'Faux : la technologie peut aider ; elle ne remplace pas une présence. L’objection est rejetée.', 'Falsch: la technologie peut aider ; elle ne remplace pas une présence. Der Einwand wird zurückgewiesen.'), L('Her answer to the objection', 'Sa réponse à l’objection', 'Ihre Antwort auf den Einwand')),
    choice('q-device', 'Pourquoi l’éditorial commence-t-il par l’histoire de Josette ?', 'Pour toucher le lecteur avec un cas concret', ['Pour donner une statistique officielle', 'Pour critiquer l’hôpital de Châteauroux', 'Pour donner la parole à un médecin'], ['m-s2', 'm-s3', 'm-s20'], L('A real person and a shock figure (Six heures.) move the reader; the text comes back to her at the end: Josette n’a plus le temps d’attendre.', 'Une personne réelle et un chiffre choc (Six heures.) touchent le lecteur ; le texte revient à elle à la fin : Josette n’a plus le temps d’attendre.', 'Eine echte Person und eine Schockzahl (Six heures.) berühren den Leser; am Ende kommt der Text auf sie zurück: Josette n’a plus le temps d’attendre.'), L('A persuasive device', 'Un procédé pour convaincre', 'Ein Überzeugungsmittel')),
  ],
  structure: {
    instructions: L('Without the text: put the steps of the argument back in the order of the editorial.', 'Sans le texte : remettez les étapes de l’argumentation dans l’ordre de l’éditorial.', 'Ohne den Text: Bring die Schritte der Argumentation in die Reihenfolge des Leitartikels.'),
    item: order('argument-steps', 'parts', [['m-fact', 'Un cas frappant et un chiffre choc'], ['m-causes', 'Les causes du problème'], ['m-objection', 'Une objection rejetée'], ['m-proposals', 'Des solutions possibles'], ['m-call', 'L’appel final à l’État']], L('A classic editorial: a striking fact, the causes, an objection answered, proposals, then the call (Il est temps que…).', 'Un éditorial classique : un fait frappant, les causes, une objection réfutée, des propositions, puis l’appel (Il est temps que…).', 'Ein klassischer Leitartikel: eine auffällige Tatsache, die Ursachen, ein widerlegter Einwand, Vorschläge, dann der Appell (Il est temps que…).')),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      short('x-clients', 'Combien de clients le bureau reçoit-il par jour ?', ['quarante', '40', 'quarante clients', '40 clients'], ['x-s2'], L('Il ne reçoit que quarante clients par jour.', 'Il ne reçoit que quarante clients par jour.', 'Il ne reçoit que quarante clients par jour.')),
      choice('x-who', 'Qui sont surtout les clients du bureau ?', 'Des retraités', ['Des étudiants', 'Des commerçants', 'Des touristes'], ['x-s4'], L('Ce sont surtout des retraités qui viennent chercher leur pension.', 'Ce sont surtout des retraités qui viennent chercher leur pension.', 'Ce sont surtout des retraités qui viennent chercher leur pension.')),
      tf('x-bus', 'Il y a plusieurs bus par jour vers le bureau le plus proche.', 'false', ['x-s5'], L('False: il n’y a qu’un bus par jour.', 'Faux : il n’y a qu’un bus par jour.', 'Falsch: il n’y a qu’un bus par jour.')),
    ] },
    { pageId: 'exam-2', questions: [
      choice('x-shop', 'Que pense l’auteur du « point poste » à l’épicerie ?', 'C’est acceptable si l’épicière est formée et payée.', ['C’est une très mauvaise idée.', 'C’est la meilleure solution possible.', 'Il ne donne pas son avis.'], ['x-s7'], L('L’idée n’est pas mauvaise, à condition que l’épicière soit formée et payée.', 'L’idée n’est pas mauvaise, à condition que l’épicière soit formée et payée.', 'L’idée n’est pas mauvaise, à condition que l’épicière soit formée et payée.')),
      tf('x-mayor', 'Le maire du village a écrit à la direction régionale.', 'not_stated', [], L('Not stated: the editorial mentions nos élus, but no letter from the mayor.', 'Pas dans le texte : l’éditorial parle de nos élus, mais d’aucune lettre du maire.', 'Steht nicht im Text: Der Leitartikel nennt nos élus, aber keinen Brief des Bürgermeisters.')),
    ] },
  ],
} satisfies ReadingDefinition;
