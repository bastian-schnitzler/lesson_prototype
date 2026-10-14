import { choice, L, order, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** A2: a yoghurt cake recipe; the exam reads a crêpe batter recipe. */
export default {
  id: 'fr-reading-a-recipe',
  genre: 'recipe',
  objective: L('Read a simple recipe, find the ingredients, the quantities and the order of the steps, and understand instructions in the imperative.', 'Lire une recette simple, retrouver les ingrédients, les quantités et l’ordre des étapes, et comprendre les consignes à l’impératif.', 'Ein einfaches Rezept lesen, Zutaten, Mengen und die Reihenfolge der Schritte finden und Anweisungen im Imperativ verstehen.'),
  situation: L('A grandmother’s yoghurt cake recipe, copied on a card for the family.', 'La recette du gâteau au yaourt de Mamie, recopiée sur une fiche pour la famille.', 'Das Joghurtkuchen-Rezept der Oma, für die Familie auf eine Karte geschrieben.'),
  readerTask: L('Find the quantities, the baking time and the real order of the steps.', 'Retrouver les quantités, le temps de cuisson et l’ordre réel des étapes.', 'Mengen, Backzeit und die tatsächliche Reihenfolge der Schritte finden.'),
  coverageNotes: L('Kitchen verbs in the imperative (versez, ajoutez, faites cuire), quantities with pot, sachet, g, and après l’avoir / quand to order steps. Not covered: cooking vocabulary beyond baking.', 'Verbes de cuisine à l’impératif (versez, ajoutez, faites cuire), quantités avec pot, sachet, g, et après l’avoir / quand pour ordonner les étapes. Non traité : le vocabulaire de cuisine hors pâtisserie.', 'Küchenverben im Imperativ (versez, ajoutez, faites cuire), Mengen mit pot, sachet, g, und après l’avoir / quand für die Reihenfolge. Nicht behandelt: Kochwortschatz außerhalb des Backens.'),
  prerequisites: [L('The imperative with vous', 'L’impératif avec vous', 'Der Imperativ mit vous'), L('Food and quantities', 'Les aliments et les quantités', 'Lebensmittel und Mengen')],
  keywords: [
    { id: 'four', term: 'le four', translations: { en: ['the oven'], de: ['der Ofen', 'der Backofen'] }, explanation: L('The hot box where you bake a cake. Préchauffer le four: heat it before baking.', 'L’appareil chaud où on cuit le gâteau. Préchauffer le four : le chauffer avant.', 'Der heiße Kasten zum Backen. Préchauffer le four: vorheizen.'), matching: L('le four = the oven.', 'le four : on y cuit le gâteau.', 'le four = der Backofen.') },
    { id: 'saladier', term: 'un saladier', translations: { en: ['a mixing bowl', 'a large bowl'], de: ['eine Schüssel', 'eine Rührschüssel'] }, explanation: L('A big bowl where you mix the ingredients.', 'Un grand bol où on mélange les ingrédients.', 'Eine große Schüssel zum Verrühren der Zutaten.'), matching: L('un saladier = a mixing bowl.', 'un saladier : un grand bol.', 'un saladier = eine Rührschüssel.') },
    { id: 'melangez', term: 'mélangez', translations: { en: ['mix', 'stir'], de: ['verrühren', 'mischen'] }, explanation: L('Turn the ingredients together until they are one. From mélanger.', 'Tournez les ingrédients ensemble. Du verbe mélanger.', 'Die Zutaten zusammenrühren. Von mélanger.'), matching: L('mélangez = mix.', 'mélangez : tournez ensemble.', 'mélangez = verrühren.') },
    { id: 'pate', term: 'la pâte', translations: { en: ['the batter', 'the dough'], de: ['der Teig'] }, explanation: L('The mixture before baking. Not les pâtes (pasta)!', 'Le mélange avant la cuisson. Attention : les pâtes, c’est autre chose !', 'Die Mischung vor dem Backen. Nicht les pâtes (Nudeln)!'), matching: L('la pâte = the batter.', 'la pâte : le mélange avant la cuisson.', 'la pâte = der Teig.') },
    { id: 'moule', term: 'le moule', translations: { en: ['the cake tin', 'the baking tin'], de: ['die Backform', 'die Form'] }, explanation: L('The tin that gives the cake its shape. Beurrer le moule: put butter inside it.', 'Le récipient qui donne sa forme au gâteau. Beurrer le moule : y mettre du beurre.', 'Die Form, die dem Kuchen seine Gestalt gibt. Beurrer le moule: einfetten.'), matching: L('le moule = the cake tin.', 'le moule : il donne la forme au gâteau.', 'le moule = die Backform.') },
    { id: 'demoulez', term: 'démoulez', translations: { en: ['turn out (of the tin)', 'take out of the tin'], de: ['stürzen', 'aus der Form lösen'] }, explanation: L('Take the cake out of the tin: dé- + moule.', 'Sortez le gâteau du moule : dé- + moule.', 'Den Kuchen aus der Form holen: dé- + moule.'), matching: L('démoulez = take the cake out of the tin.', 'démoulez : sortez le gâteau du moule.', 'démoulez = aus der Form lösen.') },
  ],
  main: {
    contents: L('A recipe card: for 6 people, 10 min preparation, 35 min baking; ingredients measured with the yoghurt pot (1 yoghurt, 2 pots of sugar, 3 of flour, 3 eggs, half a pot of oil, 1 sachet of baking powder); seven steps whose sentences do not follow the real order (the tin is buttered before the batter goes in, the cake cools before you turn it out); grandma’s tip: lemon zest.', 'Une fiche recette : pour 6 personnes, 10 min de préparation, 35 min de cuisson ; ingrédients mesurés avec le pot de yaourt (1 yaourt, 2 pots de sucre, 3 de farine, 3 œufs, ½ pot d’huile, 1 sachet de levure) ; sept étapes dont les phrases ne suivent pas l’ordre réel (on beurre le moule avant d’y verser la pâte, le gâteau refroidit avant d’être démoulé) ; le conseil de Mamie : le zeste de citron.', 'Eine Rezeptkarte: für 6 Personen, 10 Min. Vorbereitung, 35 Min. Backzeit; Zutaten mit dem Joghurtbecher gemessen (1 Joghurt, 2 Becher Zucker, 3 Mehl, 3 Eier, ½ Becher Öl, 1 Päckchen Backpulver); sieben Schritte, deren Sätze nicht der wirklichen Reihenfolge folgen (die Form wird gefettet, bevor der Teig hineinkommt; der Kuchen kühlt ab, bevor man ihn stürzt); Omas Tipp: Zitronenschale.'),
    title: 'Gâteau au yaourt',
    meta: ['Pour 6 personnes · Préparation : 10 min · Cuisson : 35 min'],
    parts: [
      { id: 'm-ingredients', heading: 'Ingrédients', segments: [['yaourt nature', '1 pot'], ['sucre', '2 pots'], ['farine', '3 pots'], ['œufs', '3'], ['huile', '½ pot'], ['levure chimique', '1 sachet']] },
      { id: 'm-steps', heading: 'Préparation', segments: [
        'Préchauffez le four à 180 °C.',
        'Versez le yaourt dans un saladier et gardez le pot : il sert de mesure.',
        'Ajoutez le sucre et les œufs, et mélangez bien.',
        'Ajoutez ensuite la farine, la levure et l’huile.',
        'Versez la pâte dans le moule, après l’avoir beurré.',
        'Faites cuire 35 minutes, sans ouvrir le four.',
        'Démoulez le gâteau quand il est froid.',
      ] },
      { id: 'm-tip', heading: 'Le conseil de Mamie', segments: ['Pour un gâteau plus parfumé, ajoutez le zeste d’un citron.'] },
    ],
    highlights: [['four', 'm-s7', 'four'], ['saladier', 'm-s8', 'saladier'], ['melangez', 'm-s9', 'mélangez'], ['pate', 'm-s11', 'pâte'], ['moule', 'm-s11', 'moule'], ['demoulez', 'm-s13', 'Démoulez']],
  },
  exam: {
    contents: L('A crêpe batter recipe for 15 crêpes, resting 1 hour: flour, half a litre of milk, 4 eggs, 50 g melted butter, a pinch of salt; flour and salt first, then the eggs and the milk little by little, then the butter; the batter rests one hour before cooking.', 'Une recette de pâte à crêpes pour 15 crêpes, repos 1 heure : farine, ½ litre de lait, 4 œufs, 50 g de beurre fondu, une pincée de sel ; d’abord la farine et le sel, puis les œufs et le lait petit à petit, puis le beurre ; la pâte repose une heure avant la cuisson.', 'Ein Crêpeteig-Rezept für 15 Crêpes, 1 Stunde Ruhezeit: Mehl, ½ Liter Milch, 4 Eier, 50 g geschmolzene Butter, eine Prise Salz; zuerst Mehl und Salz, dann Eier und nach und nach Milch, dann Butter; der Teig ruht eine Stunde vor dem Backen.'),
    title: 'Pâte à crêpes',
    meta: ['Pour 15 crêpes · Repos : 1 heure'],
    parts: [
      { id: 'x-ingredients', heading: 'Ingrédients', segments: [['farine', '250 g'], ['lait', '½ litre'], ['œufs', '4'], ['beurre fondu', '50 g'], ['sel', '1 pincée']] },
      { id: 'x-steps', heading: 'Préparation', segments: [
        'Mettez la farine et le sel dans un saladier.',
        'Ajoutez les œufs, puis le lait petit à petit.',
        'Ajoutez le beurre fondu.',
        'Laissez reposer la pâte une heure avant la cuisson.',
      ] },
    ],
  },
  skim: { focus: 'genre', question: 'Qu’est-ce que c’est ?', right: 'Une recette de gâteau', wrong: ['Une liste de courses', 'Le menu d’un restaurant', 'Une publicité pour un four'], explanation: L('A title with a dish, ingredients with quantities and steps in the imperative: a recipe.', 'Un titre avec un plat, des ingrédients avec des quantités et des étapes à l’impératif : c’est une recette.', 'Ein Gericht als Titel, Zutaten mit Mengen und Schritte im Imperativ: ein Rezept.') },
  detail: [
    short('q-time', 'Combien de temps le gâteau cuit-il ?', ['35 minutes', '35 min', 'trente-cinq minutes', '35'], ['m-s12'], L('Faites cuire 35 minutes. The 10 minutes are the preparation.', 'Faites cuire 35 minutes. Les 10 minutes, c’est la préparation.', 'Faites cuire 35 minutes. Die 10 Minuten sind die Vorbereitung.'), L('The baking time', 'Le temps de cuisson', 'Die Backzeit')),
    choice('q-measure', 'À quoi sert le pot de yaourt vide ?', 'À mesurer les ingrédients', ['À faire cuire le gâteau', 'À décorer le gâteau', 'À garder le gâteau au froid'], ['m-s8'], L('Gardez le pot : il sert de mesure. The ingredients are counted in pots.', 'Gardez le pot : il sert de mesure. Les ingrédients se comptent en pots.', 'Gardez le pot : il sert de mesure. Die Zutaten werden in Bechern gemessen.'), L('What the yoghurt pot is for', 'À quoi sert le pot', 'Wofür der Becher dient')),
    tf('q-oven', 'On peut ouvrir le four pendant la cuisson.', 'false', ['m-s12'], L('False: faites cuire 35 minutes, sans ouvrir le four, without opening the oven.', 'Faux : faites cuire 35 minutes, sans ouvrir le four.', 'Falsch: faites cuire 35 minutes, sans ouvrir le four, ohne den Ofen zu öffnen.'), L('A rule during baking', 'Une règle pendant la cuisson', 'Eine Regel beim Backen')),
    choice('q-flour', 'Combien de pots de farine faut-il ?', '3 pots', ['1 pot', '2 pots', '½ pot'], ['m-s3'], L('farine – 3 pots. Two pots are the sugar, half a pot the oil.', 'farine – 3 pots. Deux pots, c’est le sucre ; un demi-pot, l’huile.', 'farine – 3 pots. Zwei Becher sind Zucker, ein halber Öl.'), L('A quantity', 'Une quantité', 'Eine Menge')),
  ],
  structure: {
    instructions: L('In what order do you really do these things? Put them from first to last.', 'Dans quel ordre fait-on vraiment ces actions ? Remettez-les de la première à la dernière.', 'In welcher Reihenfolge macht man das wirklich? Ordne vom Ersten bis zum Letzten.'),
    item: order('order-steps', 'information', ['On beurre le moule.', 'On verse la pâte dans le moule.', 'On fait cuire le gâteau 35 minutes.', 'On attend que le gâteau soit froid.', 'On démoule le gâteau.'], L('Après l’avoir beurré: the tin is buttered before the batter goes in. Quand il est froid: the cake cools before you turn it out, although the sentence names démoulez first.', 'Après l’avoir beurré : on beurre le moule avant d’y verser la pâte. Quand il est froid : le gâteau refroidit avant d’être démoulé, même si la phrase commence par démoulez.', 'Après l’avoir beurré: Die Form wird vor dem Teig gefettet. Quand il est froid: Der Kuchen kühlt ab, bevor man ihn stürzt, auch wenn der Satz mit démoulez beginnt.')),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      short('x-milk', 'Combien de lait faut-il ?', ['½ litre', 'un demi-litre', '1/2 litre', '0,5 litre', 'un demi litre', '50 cl'], ['x-s2'], L('lait – ½ litre, half a litre.', 'lait – ½ litre, un demi-litre.', 'lait – ½ litre, ein halber Liter.')),
      choice('x-rest', 'Combien de temps la pâte repose-t-elle ?', 'une heure', ['dix minutes', 'une nuit', 'deux heures'], ['x-s9'], L('Laissez reposer la pâte une heure; the card also says Repos : 1 heure.', 'Laissez reposer la pâte une heure ; la fiche dit aussi Repos : 1 heure.', 'Laissez reposer la pâte une heure; oben steht auch Repos : 1 heure.')),
      tf('x-butter', 'On met le beurre au début, avec la farine.', 'false', ['x-s6', 'x-s8'], L('False: first flour and salt; the melted butter comes after the eggs and the milk.', 'Faux : d’abord la farine et le sel ; le beurre fondu vient après les œufs et le lait.', 'Falsch: Zuerst Mehl und Salz; die geschmolzene Butter kommt nach Eiern und Milch.')),
      choice('x-first', 'Qu’est-ce qu’on met d’abord dans le saladier ?', 'La farine et le sel', ['Le lait', 'Les œufs', 'Le beurre fondu'], ['x-s6'], L('Mettez la farine et le sel dans un saladier is the first step.', 'Mettez la farine et le sel dans un saladier : c’est la première étape.', 'Mettez la farine et le sel dans un saladier ist der erste Schritt.')),
      choice('x-eggs', 'Combien d’œufs faut-il ?', '4', ['2', '3', '15'], ['x-s3'], L('œufs – 4. The 15 are the crêpes.', 'œufs – 4. 15, c’est le nombre de crêpes.', 'œufs – 4. 15 ist die Zahl der Crêpes.')),
    ] },
  ],
} satisfies ReadingDefinition;
