import { choice, headings, L, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/**
 * B2: Jean de La Fontaine, « Le Loup et le Chien » (Fables I, 5, 1668); the exam reads « Le Corbeau et
 * le Renard » (Fables I, 2). Both are in the public domain and quoted verbatim, one verse per segment
 * (modern spelling of the standard edition, French quotation marks and dashes).
 */
export default {
  id: 'fr-reading-a-fable',
  genre: 'poem',
  objective: L('Read a fable by La Fontaine, understand old words from the context, summarise the story and restate the moral in today’s French.', 'Lire une fable de La Fontaine, comprendre les mots anciens grâce au contexte, résumer l’histoire et reformuler la morale en français d’aujourd’hui.', 'Eine Fabel von La Fontaine lesen, alte Wörter aus dem Zusammenhang verstehen, die Geschichte zusammenfassen und die Moral in heutigem Französisch ausdrücken.'),
  situation: L('A classic fable in verse from 1668, read as it was written.', 'Une fable classique en vers de 1668, lue telle qu’elle a été écrite.', 'Eine klassische Versfabel von 1668, gelesen, wie sie geschrieben wurde.'),
  readerTask: L('Follow the dialogue, guess old words from the context and find the implicit moral.', 'Suivre le dialogue, deviner les mots anciens par le contexte et trouver la morale implicite.', 'Dem Dialog folgen, alte Wörter aus dem Kontext erschließen und die unausgesprochene Moral finden.'),
  coverageNotes: L('Verse and inverted word order (à son maître complaire), old words (embonpoint, logis, col, reliefs), dialogue marked by quotation marks and dashes, an implicit moral. Not covered: metre and rhyme analysis.', 'Vers et ordre des mots inversé (à son maître complaire), mots anciens (embonpoint, logis, col, reliefs), dialogue marqué par guillemets et tirets, morale implicite. Non traité : l’analyse du mètre et des rimes.', 'Verse und umgestellte Wortfolge (à son maître complaire), alte Wörter (embonpoint, logis, col, reliefs), Dialog mit Anführungszeichen und Gedankenstrichen, eine unausgesprochene Moral. Nicht behandelt: Metrik und Reim.'),
  prerequisites: [L('The passé simple (recognising it)', 'Le passé simple (le reconnaître)', 'Das passé simple (erkennen)'), L('Animal vocabulary', 'Le vocabulaire des animaux', 'Tierwortschatz')],
  keywords: [
    { id: 'embonpoint', term: 'l’embonpoint', translations: { en: ['plumpness', 'stoutness'], de: ['die Wohlgenährtheit', 'die Leibesfülle'] }, explanation: L('Being well fed and a little fat; in the fable a sign of easy life.', 'Le fait d’être bien nourri, un peu gros ; dans la fable, le signe d’une vie facile.', 'Gut genährt, etwas rundlich sein; in der Fabel ein Zeichen für ein bequemes Leben.'), matching: L('l’embonpoint = plumpness, being well fed.', 'l’embonpoint : le fait d’être bien gras.', 'l’embonpoint = Wohlgenährtheit.') },
    { id: 'logis', term: 'le logis', translations: { en: ['the house', 'the home'], de: ['das Haus', 'die Behausung'] }, explanation: L('Old word for the house: ceux du logis = the people of the house.', 'Mot ancien pour la maison : ceux du logis, les gens de la maison.', 'Altes Wort für das Haus: ceux du logis = die Leute im Haus.'), matching: L('le logis = the house (old word).', 'le logis : la maison.', 'le logis = das Haus.') },
    { id: 'maitre', term: 'maître', translations: { en: ['master'], de: ['Meister', 'Herr'] }, explanation: L('The dog’s owner (son maître), and a mock title for animals: maître Loup.', 'Le propriétaire du chien (son maître), et un titre pour rire : maître Loup.', 'Der Besitzer des Hundes (son maître) und ein Spaßtitel für Tiere: maître Loup.'), matching: L('maître = master (owner, or a mock title).', 'maître : le propriétaire, ou un titre pour rire.', 'maître = Herr (Besitzer oder Spaßtitel).') },
    { id: 'col', term: 'le col', translations: { en: ['the neck'], de: ['der Hals'] }, explanation: L('Old word for the neck; today le col is the collar of a shirt.', 'Mot ancien pour le cou ; aujourd’hui, le col est celui d’une chemise.', 'Altes Wort für den Hals; heute ist le col der Hemdkragen.'), matching: L('le col = the neck (old word).', 'le col : le cou.', 'le col = der Hals.') },
    { id: 'collier', term: 'le collier', translations: { en: ['the (dog) collar'], de: ['das Halsband'] }, explanation: L('The band around a dog’s neck that ties it to a chain.', 'La bande autour du cou du chien qui le tient attaché.', 'Das Band um den Hals des Hundes, an dem er festgebunden ist.'), matching: L('le collier = the dog collar.', 'le collier : il tient le chien attaché.', 'le collier = das Halsband.') },
    { id: 's-enfuir', term: 's’enfuir', translations: { en: ['to run away', 'to flee'], de: ['fliehen', 'davonlaufen'] }, explanation: L('To leave quickly to escape: maître Loup s’enfuit.', 'Partir vite pour échapper à quelque chose : maître Loup s’enfuit.', 'Schnell weglaufen, um zu entkommen: maître Loup s’enfuit.'), matching: L('s’enfuir = to run away.', 's’enfuir : partir vite.', 's’enfuir = fliehen.') },
  ],
  main: {
    contents: L('La Fontaine’s fable in verse: a starving wolf meets a fat, strong guard dog; not daring to fight, he flatters him; the dog invites him to leave the woods for an easy life of leftovers and caresses in exchange for chasing beggars and pleasing the master; on the way the wolf sees the worn neck of the dog, learns about the collar and the chain, refuses such comfort at that price and runs away.', 'La fable de La Fontaine en vers : un loup affamé rencontre un chien gras et fort ; n’osant pas l’attaquer, il le flatte ; le chien l’invite à quitter les bois pour une vie facile de restes et de caresses en échange de chasser les mendiants et de plaire au maître ; en chemin, le loup voit le cou pelé du chien, apprend l’existence du collier, refuse ce confort à ce prix et s’enfuit.', 'La Fontaines Versfabel: Ein ausgehungerter Wolf trifft einen fetten, starken Wachhund; da er nicht zu kämpfen wagt, schmeichelt er ihm; der Hund lädt ihn ein, den Wald für ein bequemes Leben mit Essensresten und Streicheleinheiten zu verlassen, wenn er Bettler verjagt und dem Herrn gefällt; unterwegs sieht der Wolf den kahlen Hals des Hundes, erfährt vom Halsband, lehnt diesen Komfort zu diesem Preis ab und flieht.'),
    title: 'Le Loup et le Chien',
    meta: ['Jean de La Fontaine, Fables, livre I, 5 (1668)'],
    parts: [
      { id: 'm-portrait', segments: [
        'Un Loup n’avait que les os et la peau,',
        'Tant les chiens faisaient bonne garde.',
        'Ce Loup rencontre un Dogue aussi puissant que beau,',
        'Gras, poli, qui s’était fourvoyé par mégarde.',
      ] },
      { id: 'm-caution', segments: [
        'L’attaquer, le mettre en quartiers,',
        'Sire Loup l’eût fait volontiers ;',
        'Mais il fallait livrer bataille,',
        'Et le Mâtin était de taille',
        'À se défendre hardiment.',
        'Le Loup donc l’aborde humblement,',
        'Entre en propos, et lui fait compliment',
        'Sur son embonpoint, qu’il admire.',
      ] },
      { id: 'm-offer', segments: [
        '« Il ne tiendra qu’à vous, beau sire,',
        'D’être aussi gras que moi, lui repartit le Chien.',
        'Quittez les bois, vous ferez bien :',
        'Vos pareils y sont misérables,',
        'Cancres, hères, et pauvres diables,',
        'Dont la condition est de mourir de faim.',
        'Car quoi ? rien d’assuré : point de franche lippée ;',
        'Tout à la pointe de l’épée.',
        'Suivez-moi : vous aurez un bien meilleur destin. »',
      ] },
      { id: 'm-bargain', segments: [
        'Le Loup reprit : « Que me faudra-t-il faire ?',
        '— Presque rien, dit le Chien : donner la chasse aux gens',
        'Portants bâtons, et mendiants ;',
        'Flatter ceux du logis, à son maître complaire :',
        'Moyennant quoi votre salaire',
        'Sera force reliefs de toutes les façons,',
        'Os de poulets, os de pigeons,',
        'Sans parler de mainte caresse. »',
        'Le Loup déjà se forge une félicité',
        'Qui le fait pleurer de tendresse.',
      ] },
      { id: 'm-collar', segments: [
        'Chemin faisant, il vit le col du Chien pelé.',
        '« Qu’est-ce là ? lui dit-il. — Rien. — Quoi ? rien ? — Peu de chose.',
        '— Mais encor ? — Le collier dont je suis attaché',
        'De ce que vous voyez est peut-être la cause.',
        '— Attaché ? dit le Loup : vous ne courez donc pas',
        'Où vous voulez ? — Pas toujours ; mais qu’importe ?',
        '— Il importe si bien, que de tous vos repas',
        'Je ne veux en aucune sorte,',
        'Et ne voudrais pas même à ce prix un trésor. »',
      ] },
      { id: 'm-flight', segments: ['Cela dit, maître Loup s’enfuit, et court encor.'] },
    ],
    highlights: [['embonpoint', 'm-s12', 'embonpoint'], ['logis', 'm-s25', 'logis'], ['maitre', 'm-s41', 'maître'], ['col', 'm-s32', 'col'], ['collier', 'm-s34', 'collier'], ['s-enfuir', 'm-s41', 's’enfuit']],
  },
  exam: {
    contents: L('La Fontaine’s « Le Corbeau et le Renard »: a crow in a tree holds a cheese; the fox, attracted by the smell, flatters his beauty and asks him to sing; the crow opens his beak and drops the cheese; the fox takes it and gives the lesson that flatterers live at the expense of those who listen; the crow, ashamed, swears too late he will not be caught again.', '« Le Corbeau et le Renard » de La Fontaine : un corbeau perché tient un fromage ; le renard, attiré par l’odeur, flatte sa beauté et sa voix ; le corbeau ouvre le bec et laisse tomber le fromage ; le renard le prend et donne la leçon : tout flatteur vit aux dépens de celui qui l’écoute ; le corbeau, honteux, jure trop tard qu’on ne l’y prendra plus.', 'La Fontaines « Le Corbeau et le Renard »: Ein Rabe sitzt mit einem Käse im Schnabel auf einem Baum; der Fuchs, vom Geruch angelockt, lobt seine Schönheit und Stimme; der Rabe öffnet den Schnabel und lässt den Käse fallen; der Fuchs nimmt ihn und erteilt die Lehre, dass jeder Schmeichler auf Kosten des Zuhörers lebt; der Rabe schwört beschämt, zu spät, dass man ihn nicht mehr hereinlegt.'),
    title: 'Le Corbeau et le Renard',
    meta: ['Jean de La Fontaine, Fables, livre I, 2 (1668)'],
    parts: [
      { id: 'x-scene', segments: ['Maître Corbeau, sur un arbre perché,', 'Tenait en son bec un fromage.', 'Maître Renard, par l’odeur alléché,', 'Lui tint à peu près ce langage :'] },
      { id: 'x-flattery', segments: ['« Hé ! bonjour, Monsieur du Corbeau.', 'Que vous êtes joli ! que vous me semblez beau !', 'Sans mentir, si votre ramage', 'Se rapporte à votre plumage,', 'Vous êtes le Phénix des hôtes de ces bois. »'] },
      { id: 'x-fall', segments: ['À ces mots le Corbeau ne se sent pas de joie ;', 'Et pour montrer sa belle voix,', 'Il ouvre un large bec, laisse tomber sa proie.'] },
      { id: 'x-lesson', segments: ['Le Renard s’en saisit, et dit : « Mon bon Monsieur,', 'Apprenez que tout flatteur', 'Vit aux dépens de celui qui l’écoute :', 'Cette leçon vaut bien un fromage, sans doute. »'] },
      { id: 'x-shame', segments: ['Le Corbeau, honteux et confus,', 'Jura, mais un peu tard, qu’on ne l’y prendrait plus.'] },
    ],
  },
  skim: { focus: 'genre', question: 'Quel genre de texte est-ce ?', right: 'Une fable en vers', wrong: ['Un article de journal', 'La lettre d’un chasseur', 'Un conte pour enfants en prose'], explanation: L('Short lines that rhyme, animals that speak, La Fontaine and Fables in the source: a fable in verse.', 'Des lignes courtes qui riment, des animaux qui parlent, La Fontaine et Fables dans la source : une fable en vers.', 'Kurze Reimzeilen, sprechende Tiere, La Fontaine und Fables in der Quelle: eine Versfabel.') },
  detail: [
    choice('q-attack', 'Pourquoi le Loup n’attaque-t-il pas le Chien ?', 'Le Chien est assez fort pour se défendre.', ['Le Loup a peur du maître.', 'Le Loup n’a pas faim.', 'Le Chien est son ami.'], ['m-s7', 'm-s8', 'm-s9'], L('Il fallait livrer bataille, et le Mâtin était de taille à se défendre: the dog (mâtin) was strong enough to fight back.', 'Il fallait livrer bataille, et le Mâtin était de taille à se défendre : le chien était assez fort.', 'Il fallait livrer bataille, et le Mâtin était de taille à se défendre: Der Hund war stark genug.'), L('Why the wolf does not fight', 'Pourquoi le loup ne se bat pas', 'Warum der Wolf nicht kämpft')),
    short('q-woods', 'Que doit quitter le Loup pour vivre comme le Chien ?', ['les bois', 'le bois', 'la forêt', 'les forêts'], ['m-s15'], L('Quittez les bois, vous ferez bien: leave the woods.', 'Quittez les bois, vous ferez bien.', 'Quittez les bois, vous ferez bien: den Wald verlassen.'), L('What the dog asks', 'Ce que propose le chien', 'Was der Hund vorschlägt')),
    tf('q-food', 'Le Chien promet au Loup les restes des repas de la maison.', 'true', ['m-s27', 'm-s28'], L('True: force reliefs de toutes les façons – lots of leftovers, os de poulets, os de pigeons.', 'Vrai : force reliefs de toutes les façons, c’est-à-dire beaucoup de restes : os de poulets, os de pigeons.', 'Richtig: force reliefs de toutes les façons – viele Essensreste, os de poulets, os de pigeons.'), L('The dog’s “salary”', 'Le « salaire » du chien', 'Der „Lohn“ des Hundes')),
    choice('q-moral', 'Quelle leçon peut-on tirer de la fable ?', 'La liberté vaut plus que le confort.', ['Il faut toujours obéir à son maître.', 'Les loups sont plus forts que les chiens.', 'Il ne faut jamais parler aux inconnus.'], ['m-s38', 'm-s40', 'm-s41'], L('The wolf refuses all the meals, and even a treasure, at the price of the chain, and runs away: freedom matters more than comfort. The fable never says it: you must infer it.', 'Le loup refuse tous les repas, et même un trésor, au prix du collier, et s’enfuit : la liberté compte plus que le confort. La fable ne le dit pas, il faut le déduire.', 'Der Wolf lehnt alle Mahlzeiten, sogar einen Schatz, um den Preis des Halsbands ab und flieht: Freiheit zählt mehr als Komfort. Die Fabel sagt es nicht, man muss es erschließen.'), L('The implicit moral', 'La morale implicite', 'Die unausgesprochene Moral')),
  ],
  structure: {
    instructions: L('The fable is cut into six passages. Match a heading to each passage.', 'La fable est découpée en six passages. Associez un titre à chaque passage.', 'Die Fabel ist in sechs Abschnitte geteilt. Ordne jedem Abschnitt eine Überschrift zu.'),
    item: headings('fable-passages', [
      ['m-portrait', 'Un loup affamé rencontre un chien bien nourri', L('Que les os et la peau against gras, poli: hunger meets plenty.', 'Que les os et la peau contre gras, poli : la faim rencontre l’abondance.', 'Que les os et la peau gegen gras, poli: Hunger trifft Überfluss.')],
      ['m-caution', 'Le loup préfère la politesse au combat', L('Instead of fighting, il l’aborde humblement et lui fait compliment.', 'Au lieu de se battre, il l’aborde humblement et lui fait compliment.', 'Statt zu kämpfen, il l’aborde humblement et lui fait compliment.')],
      ['m-offer', 'Le chien vante sa vie confortable', L('Quittez les bois… vous aurez un bien meilleur destin.', 'Quittez les bois… vous aurez un bien meilleur destin.', 'Quittez les bois… vous aurez un bien meilleur destin.')],
      ['m-bargain', 'Ce qu’il faut faire, ce qu’on reçoit', L('Chase beggars and please the master; in return leftovers and caresses.', 'Chasser les mendiants, plaire au maître ; en échange, des restes et des caresses.', 'Bettler verjagen, dem Herrn gefallen; dafür Reste und Streicheleinheiten.')],
      ['m-collar', 'La découverte du collier', L('Le col du Chien pelé leads to the collar and the chain.', 'Le col du Chien pelé mène au collier et à l’attache.', 'Le col du Chien pelé führt zum Halsband und zur Kette.')],
      ['m-flight', 'Le choix final du loup', L('Maître Loup s’enfuit, et court encor: he chooses freedom.', 'Maître Loup s’enfuit, et court encor : il choisit la liberté.', 'Maître Loup s’enfuit, et court encor: Er wählt die Freiheit.')],
    ]),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      choice('x-cheese', 'Que tient le Corbeau dans son bec ?', 'Un fromage', ['Un morceau de pain', 'Un ver de terre', 'Un fruit'], ['x-s2'], L('Tenait en son bec un fromage; later sa proie means the same cheese.', 'Tenait en son bec un fromage ; plus loin, sa proie désigne ce fromage.', 'Tenait en son bec un fromage; später meint sa proie denselben Käse.')),
      choice('x-beak', 'Pourquoi le Corbeau ouvre-t-il le bec ?', 'Pour montrer sa belle voix', ['Pour manger le fromage', 'Pour appeler à l’aide', 'Pour dire non au Renard'], ['x-s11', 'x-s12'], L('Et pour montrer sa belle voix, il ouvre un large bec: the flattery worked.', 'Et pour montrer sa belle voix, il ouvre un large bec : la flatterie a marché.', 'Et pour montrer sa belle voix, il ouvre un large bec: Die Schmeichelei wirkt.')),
      short('x-taker', 'Qui prend le fromage ?', ['le Renard', 'Renard', 'maître Renard', 'le renard'], ['x-s13'], L('Le Renard s’en saisit: s’en saisir = to grab it.', 'Le Renard s’en saisit : il l’attrape.', 'Le Renard s’en saisit: Er schnappt ihn sich.')),
    ] },
    { pageId: 'exam-2', questions: [
      tf('x-revenge', 'À la fin, le Corbeau se met en colère et attaque le Renard.', 'false', ['x-s17', 'x-s18'], L('False: he is honteux et confus (ashamed) and only swears, too late, that he will not be fooled again.', 'Faux : il est honteux et confus et jure seulement, trop tard, qu’on ne l’y prendra plus.', 'Falsch: Er ist honteux et confus (beschämt) und schwört nur, zu spät, dass man ihn nicht mehr hereinlegt.')),
      tf('x-eat', 'Le Renard mange le fromage devant le Corbeau.', 'not_stated', [], L('Not stated: the fox takes the cheese (s’en saisit) and gives his lesson; the fable never says he eats it in front of the crow.', 'Pas dans le texte : le renard prend le fromage (s’en saisit) et donne sa leçon ; la fable ne dit pas qu’il le mange devant le corbeau.', 'Steht nicht im Text: Der Fuchs nimmt den Käse (s’en saisit) und erteilt seine Lehre; dass er ihn vor dem Raben frisst, steht nicht da.')),
    ] },
  ],
} satisfies ReadingDefinition;
