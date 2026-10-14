import { choice, L, order, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/**
 * C2: an original stage monologue written for this lesson in the manner of Raymond Devos (wordplay,
 * absurd logic taken literally); no text by Devos is quoted. The exam reads a second original monologue.
 */
export default {
  id: 'fr-reading-a-comic-monologue',
  genre: 'speech',
  objective: L('Read a sketch written in the manner of Raymond Devos and explain how wordplay and absurd logic build the comedy.', 'Lire un sketch écrit à la manière de Raymond Devos et expliquer comment les jeux de mots et la logique absurde construisent le comique.', 'Einen Sketch im Stil von Raymond Devos lesen und erklären, wie Wortspiele und absurde Logik die Komik erzeugen.'),
  situation: L('A comedian alone on stage tells how he joined a queue without knowing what it was for.', 'Un humoriste seul en scène raconte comment il s’est mis dans une file d’attente sans savoir pourquoi.', 'Ein Komiker allein auf der Bühne erzählt, wie er sich in eine Schlange stellte, ohne zu wissen, wofür.'),
  readerTask: L('Follow the absurd reasoning step by step and see which words are taken literally.', 'Suivre le raisonnement absurde pas à pas et voir quels mots sont pris au pied de la lettre.', 'Der absurden Argumentation Schritt für Schritt folgen und sehen, welche Wörter wörtlich genommen werden.'),
  coverageNotes: L('Polysemy and set phrases taken literally (tour, faire la queue, laisser passer son tour), absurd chains of logic, the address to the audience. Not covered: the biography of Raymond Devos.', 'Polysémie et expressions figées prises au pied de la lettre (tour, faire la queue, laisser passer son tour), enchaînements logiques absurdes, adresse au public. Non traité : la biographie de Raymond Devos.', 'Mehrdeutigkeit und wörtlich genommene Redewendungen (tour, faire la queue, laisser passer son tour), absurde Logikketten, die Anrede ans Publikum. Nicht behandelt: die Biografie von Raymond Devos.'),
  prerequisites: [L('Fixed expressions with tour', 'Les expressions avec tour', 'Redewendungen mit tour')],
  keywords: [
    { id: 'file-d-attente', term: 'une file d’attente', translations: { en: ['a queue', 'a line'], de: ['eine Warteschlange'] }, explanation: L('People waiting one behind the other.', 'Des personnes qui attendent les unes derrière les autres.', 'Menschen, die hintereinander warten.'), matching: L('une file d’attente = a queue.', 'une file d’attente : des gens qui attendent en ligne.', 'une file d’attente = Warteschlange.') },
    { id: 'chacun-son-tour', term: 'chacun son tour', translations: { en: ['one at a time', 'wait your turn'], de: ['einer nach dem anderen'] }, explanation: L('Each person in turn; the sketch pretends un tour is a thing you own.', 'Chacun à son moment ; le sketch fait comme si un tour était un objet qu’on possède.', 'Jeder kommt der Reihe nach dran; der Sketch tut, als sei un tour ein Gegenstand.'), matching: L('chacun son tour = one at a time.', 'chacun son tour : l’un après l’autre.', 'chacun son tour = einer nach dem anderen.') },
    { id: 'pate-de-maisons', term: 'le pâté de maisons', translations: { en: ['the block (of houses)'], de: ['der Häuserblock'] }, explanation: L('A group of buildings between four streets; faire le tour du pâté de maisons = walk round the block.', 'Un groupe d’immeubles entre quatre rues ; faire le tour du pâté de maisons.', 'Eine Häusergruppe zwischen vier Straßen; faire le tour du pâté de maisons = einmal um den Block gehen.'), matching: L('le pâté de maisons = the block.', 'le pâté de maisons : les maisons entre quatre rues.', 'le pâté de maisons = Häuserblock.') },
    { id: 'laisser-passer', term: 'laisser passer son tour', translations: { en: ['to miss one’s turn'], de: ['seinen Einsatz verpassen', 'nicht drankommen'] }, explanation: L('To lose your chance by not acting at the right moment; taken literally in the sketch.', 'Perdre sa chance en n’agissant pas au bon moment ; pris au pied de la lettre dans le sketch.', 'Seine Chance verpassen, weil man nicht rechtzeitig handelt; im Sketch wörtlich genommen.'), matching: L('laisser passer son tour = to miss one’s turn.', 'laisser passer son tour : rater son moment.', 'laisser passer son tour = nicht drankommen.') },
    { id: 'faire-la-queue', term: 'faire la queue', translations: { en: ['to queue', 'to stand in line'], de: ['Schlange stehen'] }, explanation: L('To wait in a line of people.', 'Attendre dans une file.', 'In einer Reihe warten.'), matching: L('faire la queue = to queue.', 'faire la queue : attendre dans une file.', 'faire la queue = Schlange stehen.') },
    { id: 'guichet', term: 'le guichet', translations: { en: ['the counter', 'the window'], de: ['der Schalter'] }, explanation: L('The window where an employee serves the public.', 'L’endroit où un employé reçoit le public.', 'Der Schalter, an dem ein Angestellter das Publikum bedient.'), matching: L('le guichet = the counter.', 'le guichet : là où on est servi.', 'le guichet = der Schalter.') },
  ],
  main: {
    contents: L('A monologue in five movements: passing the town hall, the narrator joins a queue because everyone waits, so it must be worth it; nobody knows what they are waiting for, not even the first, the unhappiest of all; an employee shouts chacun son tour, and the narrator wonders where his turn is, goes round the block and is told he let his turn pass; since then he queues everywhere, even behind himself, and cannot move forward; at the counter he learns that everybody is waiting for him to leave – so he goes back to the end of the queue.', 'Un monologue en cinq mouvements : passant devant la mairie, le narrateur rejoint une file parce que si tout le monde attend, cela doit valoir la peine ; personne ne sait ce qu’on attend, pas même le premier, le plus malheureux de tous ; un employé crie chacun son tour, et le narrateur cherche où est son tour, fait le tour du pâté de maisons et apprend qu’il a laissé passer son tour ; depuis, il fait la queue partout, même derrière lui-même, sans avancer ; au guichet, il apprend que tout le monde attend qu’il parte – et il se remet au bout.', 'Ein Monolog in fünf Schritten: Am Rathaus stellt sich der Erzähler in eine Schlange, denn wenn alle warten, muss es sich lohnen; niemand weiß, worauf man wartet, nicht einmal der Erste, der Unglücklichste von allen; ein Angestellter ruft chacun son tour, und der Erzähler fragt, wo sein tour ist, geht einmal um den Block und hört, er habe seinen tour vorbeigelassen; seitdem steht er überall Schlange, sogar hinter sich selbst, ohne voranzukommen; am Schalter erfährt er, dass alle darauf warten, dass er geht – und stellt sich wieder hinten an.'),
    title: 'J’attends mon tour',
    meta: ['Monologue à la manière de Raymond Devos', 'Texte original écrit pour cette leçon'],
    parts: [
      { id: 'm-setup', segments: [
        'Mesdames et Messieurs, l’autre jour, je passe devant la mairie, et je vois une file d’attente.',
        'Une file magnifique, bien droite, des gens les uns derrière les autres, sages comme des images.',
        'Moi, quand je vois une file, je me mets au bout.',
        'C’est plus fort que moi.',
        'J’ai horreur d’être devant : devant, on ne voit personne, on ne sait pas où on va.',
        'Je ne sais pas ce qu’on attend, mais si tout le monde attend, c’est que ça vaut la peine d’attendre !',
      ] },
      { id: 'm-logic', segments: [
        'Je demande au monsieur devant moi : « Qu’est-ce qu’on attend ? »',
        'Il me dit : « Je ne sais pas, je suis derrière la dame. »',
        'La dame se retourne : « Moi, je suis là parce que le monsieur devant moi était là avant. »',
        'Et ainsi de suite jusqu’au premier, qui, lui, ne pouvait pas savoir, puisqu’il n’y avait personne devant lui !',
        'Le premier, Mesdames et Messieurs, c’est le plus malheureux de tous : il est le seul qui n’attend personne, et pourtant il attend comme les autres.',
        'J’ai fait le calcul : dans une file de cent personnes, quatre-vingt-dix-neuf attendent quelqu’un, et une seule attend quelque chose.',
        'Et encore, elle ne sait pas quoi !',
      ] },
      { id: 'm-turn', segments: [
        'Au bout d’une heure, un employé sort et crie : « Chacun son tour ! »',
        'Très bien. Mais mon tour, je ne l’avais jamais vu.',
        'Je ne savais même pas que j’en avais un !',
        'Alors j’ai demandé : « Il est où, mon tour ? »',
        'L’employé m’a dit : « Il viendra. »',
        'Vous vous rendez compte ? Un tour qui vient tout seul !',
        'Un tour, ça se joue, ça se donne, ça se prend, ça se rate… mais ça ne vient pas ! Ou alors, c’est un mauvais tour.',
        'Pour passer le temps, j’en ai fait un, de tour : le tour du pâté de maisons.',
        'Quand je suis revenu, j’avais perdu ma place.',
        'On m’a dit : « Monsieur, vous avez laissé passer votre tour. »',
        'Je n’ai rien laissé passer du tout : c’est moi qui étais passé, pendant que mon tour, lui, restait là à m’attendre !',
      ] },
      { id: 'm-everywhere', segments: [
        'Depuis, je me méfie : je fais la queue partout, par précaution.',
        'Je fais la queue à la boulangerie quand il n’y a personne : je me mets derrière moi.',
        'C’est très pratique, parce que je sais toujours qui est devant.',
        'Le problème, c’est que je n’avance pas. Forcément : chaque fois que j’avance, celui qui est derrière avance aussi !',
        'Ma femme me dit : « Tu es fou, il n’y a personne derrière toi ! »',
        'Je lui réponds : « Justement : si je m’en vais, qui va garder ma place ? »',
      ] },
      { id: 'm-counter', segments: [
        'Hier, enfin, je suis arrivé au guichet.',
        'L’employé m’a regardé et m’a dit : « Qu’est-ce que vous voulez ? »',
        'Je lui ai dit : « Rien. Je voulais seulement savoir ce qu’on attendait. »',
        'Il m’a répondu : « Mais Monsieur, on attend que vous partiez : c’est vous qui bloquez la file ! »',
        'Alors je suis parti… et je me suis remis au bout.',
        'Parce qu’après tout, Mesdames et Messieurs, si je ne sais pas ce que j’attends, au moins, je sais que j’attends !',
      ] },
    ],
    highlights: [['file-d-attente', 'm-s1', 'file d’attente'], ['chacun-son-tour', 'm-s14', 'Chacun son tour'], ['pate-de-maisons', 'm-s21', 'pâté de maisons'], ['laisser-passer', 'm-s23', 'laissé passer votre tour'], ['faire-la-queue', 'm-s25', 'fais la queue'], ['guichet', 'm-s31', 'guichet']],
  },
  exam: {
    contents: L('A second original monologue: the narrator is always early, by days; he arrived at his wedding on Tuesday for Saturday and danced alone for four days, and told the priest he was waiting for his wife; people say he is ahead of his time, but his time is in no hurry and arrives after him without recognising him; a slow watch did not help (ten minutes, he needed three days); his doctor says he lives too fast: no, he lives early – fast you arrive tired, early you arrive alone; so he says goodbye before saying good evening.', 'Un deuxième monologue original : le narrateur est toujours en avance, de plusieurs jours ; arrivé à son mariage le mardi pour le samedi, il a dansé seul quatre jours et dit au curé qu’il attendait sa femme ; on le dit en avance sur son temps, mais son temps n’est pas pressé, arrive après lui et ne le reconnaît pas ; une montre qui retarde n’a pas suffi (dix minutes, il lui fallait trois jours) ; son médecin dit qu’il vit trop vite : non, il vit en avance – vite, on arrive fatigué ; en avance, on arrive seul ; alors il dit au revoir avant de dire bonsoir.', 'Ein zweiter eigener Monolog: Der Erzähler ist immer zu früh, um Tage; er kam am Dienstag zur Hochzeit am Samstag, tanzte vier Tage allein und sagte dem Pfarrer, er warte auf seine Frau; man sagt, er sei seiner Zeit voraus, doch seine Zeit hat es nicht eilig, kommt nach ihm und erkennt ihn nicht; eine nachgehende Uhr half nicht (zehn Minuten, er brauchte drei Tage); sein Arzt sagt, er lebe zu schnell: nein, er lebe zu früh – schnell kommt man müde an, zu früh allein; also sagt er auf Wiedersehen, bevor er guten Abend sagt.'),
    title: 'En avance',
    meta: ['Monologue à la manière de Raymond Devos', 'Texte original écrit pour cette leçon'],
    parts: [
      { id: 'x-early', segments: ['Moi, Mesdames et Messieurs, je suis toujours en avance.', 'Pas de cinq minutes : de plusieurs jours.', 'Je suis arrivé à mon mariage le mardi ; il avait lieu le samedi.', 'Pendant quatre jours, j’ai été le seul invité.', 'J’ai beaucoup dansé.'] },
      { id: 'x-priest', segments: ['Le curé, lui, est arrivé à l’heure.', 'Il m’a demandé ce que je faisais là.', 'Je lui ai dit : « J’attends ma femme. »', 'Il m’a dit : « Elle n’est pas encore votre femme ! »', 'Je lui ai dit : « Justement, je suis en avance. »'] },
      { id: 'x-time', segments: ['On me dit : « Vous êtes en avance sur votre temps ! »', 'C’est vrai. Le problème, c’est que mon temps, lui, n’est pas pressé.', 'Quand j’arrive quelque part, mon temps arrive après moi, et il ne me reconnaît pas.', 'Hier, il m’a demandé l’heure !'] },
      { id: 'x-watch', segments: ['J’ai voulu me mettre à l’heure : j’ai acheté une montre qui retarde.', 'L’horloger m’a dit qu’elle retardait de dix minutes ; moi, j’avais besoin de trois jours.', 'Maintenant, je suis à l’heure… mais je ne sais plus laquelle.'] },
      { id: 'x-doctor', segments: ['Mon médecin m’a dit : « Vous vivez trop vite ! »', 'Je lui ai répondu : « Docteur, je ne vis pas trop vite, je vis en avance. »', '« Vite, on arrive fatigué ; en avance, on arrive tout seul. »', 'Il m’a prescrit du repos.', 'J’ai commencé hier à me reposer pour la semaine prochaine.', 'Je suis déjà en pleine forme pour le mois de juin !', 'Le seul ennui, c’est que je serai fatigué en mai.', 'Et c’est pour ça, ce soir, que je vous dis au revoir… avant de vous avoir dit bonsoir !'] },
    ],
  },
  skim: { focus: 'genre', question: 'Quel genre de texte est-ce ?', right: 'Un sketch comique pour la scène', wrong: ['Un article sur l’administration', 'Un règlement affiché à la mairie', 'Une lettre de réclamation'], explanation: L('Monologue in the source, Mesdames et Messieurs addressed to an audience, absurd situations and jokes: a comic sketch.', 'Monologue dans la source, Mesdames et Messieurs adressé au public, des situations absurdes et des jeux de mots : un sketch comique.', 'Monologue in der Quelle, Mesdames et Messieurs ans Publikum, absurde Situationen und Wortspiele: ein komischer Sketch.') },
  detail: [
    choice('q-first', 'Pourquoi le premier de la file est-il « le plus malheureux de tous » ?', 'Il attend comme les autres sans même avoir quelqu’un devant lui.', ['Il attend depuis le plus longtemps.', 'Il est le seul à connaître la réponse.', 'L’employé refuse de le recevoir.'], ['m-s11'], L('Il est le seul qui n’attend personne, et pourtant il attend: the absurd logic plays on attendre quelqu’un / attendre quelque chose.', 'Il est le seul qui n’attend personne, et pourtant il attend : la logique absurde joue sur attendre quelqu’un / attendre quelque chose.', 'Il est le seul qui n’attend personne, et pourtant il attend: Die absurde Logik spielt mit attendre quelqu’un / attendre quelque chose.'), L('The absurd logic of the queue', 'La logique absurde de la file', 'Die absurde Logik der Schlange')),
    tf('q-lost-place', 'Le narrateur perd sa place parce qu’il est parti faire le tour du pâté de maisons.', 'true', ['m-s21', 'm-s22'], L('True: j’en ai fait un, de tour : le tour du pâté de maisons. Quand je suis revenu, j’avais perdu ma place.', 'Vrai : j’en ai fait un, de tour : le tour du pâté de maisons. Quand je suis revenu, j’avais perdu ma place.', 'Richtig: j’en ai fait un, de tour : le tour du pâté de maisons. Quand je suis revenu, j’avais perdu ma place.'), L('Why he loses his place', 'Pourquoi il perd sa place', 'Warum er seinen Platz verliert')),
    short('q-bakery', 'Où le narrateur fait-il la queue quand il n’y a personne ?', ['à la boulangerie', 'la boulangerie', 'boulangerie', 'dans la boulangerie'], ['m-s26'], L('Je fais la queue à la boulangerie quand il n’y a personne : je me mets derrière moi.', 'Je fais la queue à la boulangerie quand il n’y a personne : je me mets derrière moi.', 'Je fais la queue à la boulangerie quand il n’y a personne : je me mets derrière moi.'), L('His habit since then', 'Son habitude depuis', 'Seine Gewohnheit seither')),
    choice('q-device', 'Sur quoi repose surtout le comique après « Chacun son tour » ?', 'Sur les différents sens du mot « tour »', ['Sur une erreur de prononciation', 'Sur une chanson connue', 'Sur un accent régional'], ['m-s15', 'm-s20', 'm-s21'], L('Tour is taken literally and in all its senses: a turn you own, a trick (un mauvais tour), a walk round the block.', 'Le mot tour est pris au pied de la lettre et dans tous ses sens : un tour qu’on possède, une farce (un mauvais tour), le tour du pâté de maisons.', 'Tour wird wörtlich und in allen Bedeutungen genommen: ein tour, den man besitzt, ein Streich (un mauvais tour), ein Gang um den Block.'), L('The wordplay', 'Le jeu de mots', 'Das Wortspiel')),
  ],
  structure: {
    instructions: L('Without the text: put the five movements of the sketch back in order.', 'Sans le texte : remettez les cinq mouvements du sketch dans l’ordre.', 'Ohne den Text: Bring die fünf Teile des Sketches in die richtige Reihenfolge.'),
    item: order('sketch-moves', 'parts', [['m-setup', 'Il rejoint une file sans savoir pourquoi.'], ['m-logic', 'Personne ne sait ce qu’on attend, pas même le premier.'], ['m-turn', 'Le mot « tour » lui joue des tours.'], ['m-everywhere', 'Il fait la queue même quand il est seul.'], ['m-counter', 'Au guichet, il apprend que c’est lui qu’on attend.']], L('The sketch builds up: a situation, its absurd logic, the wordplay, the escalation, then the punchline that loops back to the start (je me suis remis au bout).', 'Le sketch monte en puissance : une situation, sa logique absurde, le jeu de mots, la surenchère, puis la chute qui revient au début (je me suis remis au bout).', 'Der Sketch steigert sich: eine Situation, ihre absurde Logik, das Wortspiel, die Übertreibung, dann die Pointe, die zum Anfang zurückführt (je me suis remis au bout).')),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      short('x-days', 'Combien de jours le narrateur a-t-il été le seul invité de son mariage ?', ['quatre', '4', 'quatre jours', '4 jours'], ['x-s4'], L('Pendant quatre jours, j’ai été le seul invité (Tuesday to Saturday).', 'Pendant quatre jours, j’ai été le seul invité (du mardi au samedi).', 'Pendant quatre jours, j’ai été le seul invité (Dienstag bis Samstag).')),
      choice('x-watch', 'Pourquoi a-t-il acheté une montre qui retarde ?', 'Pour essayer d’être à l’heure', ['Pour arriver encore plus tôt', 'Parce qu’elle était moins chère', 'Pour l’offrir à son médecin'], ['x-s15'], L('J’ai voulu me mettre à l’heure : j’ai acheté une montre qui retarde.', 'J’ai voulu me mettre à l’heure : j’ai acheté une montre qui retarde.', 'J’ai voulu me mettre à l’heure : j’ai acheté une montre qui retarde.')),
      tf('x-alone', 'Le curé est arrivé en avance, lui aussi.', 'false', ['x-s6'], L('False: le curé, lui, est arrivé à l’heure.', 'Faux : le curé, lui, est arrivé à l’heure.', 'Falsch: le curé, lui, est arrivé à l’heure.')),
    ] },
    { pageId: 'exam-2', questions: [
      choice('x-joke', 'Que montre la dernière phrase (« au revoir… avant de vous avoir dit bonsoir ») ?', 'Il est en avance même pour quitter son public.', ['Il est fatigué et veut partir.', 'Il a oublié de saluer le public.', 'Il ne parle pas bien français.'], ['x-s25'], L('He says goodbye before hello: the punchline applies his being early to the show itself.', 'Il dit au revoir avant bonsoir : la chute applique son avance au spectacle lui-même.', 'Er verabschiedet sich vor der Begrüßung: Die Pointe wendet sein Zu-früh-Sein auf die Vorstellung selbst an.')),
      tf('x-wife', 'La femme du narrateur est, elle aussi, toujours en avance.', 'not_stated', [], L('Not stated: we only learn that he waited for her; nothing says whether she is early.', 'Pas dans le texte : on apprend seulement qu’il l’attendait ; rien ne dit si elle est en avance.', 'Steht nicht im Text: Wir erfahren nur, dass er auf sie wartete; ob sie früh dran ist, steht nicht da.')),
    ] },
  ],
} satisfies ReadingDefinition;
