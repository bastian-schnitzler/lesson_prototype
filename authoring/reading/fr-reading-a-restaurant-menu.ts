import { choice, headings, L, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** Ported from the reading prototype (lesson-prototype, A1); texts and questions unchanged. */
export default {
  id: 'fr-reading-a-restaurant-menu',
  genre: 'menu',
  objective: L('Read the menu of a small restaurant and find the dishes, the drinks, the prices and what the set menu includes.', 'Lire la carte d’un petit restaurant et trouver les plats, les boissons, les prix et ce que comprend la formule.', 'Die Karte eines kleinen Restaurants lesen und Gerichte, Getränke, Preise und den Inhalt des Tagesmenüs finden.'),
  situation: L('The lunch menu of a small Paris bistro, posted at the door.', 'La carte du midi d’un petit bistrot parisien, affichée à la porte.', 'Die Mittagskarte eines kleinen Pariser Bistros, an der Tür ausgehängt.'),
  readerTask: L('Find dishes, drinks and prices, and what the set menu (formule) includes.', 'Trouver les plats, les boissons, les prix et ce que comprend la formule.', 'Gerichte, Getränke und Preise finden und was die formule enthält.'),
  coverageNotes: L('Menu sections (starters, mains, desserts, drinks), prices in euros, the formule. Not covered: ordering (see the café and restaurant lessons).', 'Rubriques d’une carte (entrées, plats, desserts, boissons), prix en euros, la formule. Non traité : commander (voir les leçons au café et au restaurant).', 'Rubriken einer Karte (Vorspeisen, Hauptgerichte, Desserts, Getränke), Preise in Euro, die formule. Nicht behandelt: bestellen (siehe Café- und Restaurantlektionen).'),
  prerequisites: [L('Numbers up to 20', 'Les nombres jusqu’à 20', 'Die Zahlen bis 20')],
  keywords: [
    { id: 'formule', term: 'la formule', translations: { en: ['set menu'], de: ['das Menü', 'das Tagesmenü'] }, explanation: L('A fixed price for several courses, often at lunchtime.', 'Un prix fixe pour plusieurs plats, souvent le midi.', 'Ein Festpreis für mehrere Gänge, oft mittags.'), matching: L('la formule = set menu at a fixed price.', 'la formule : plusieurs plats à prix fixe.', 'la formule = Menü zum Festpreis.') },
    { id: 'entree', term: 'une entrée', translations: { en: ['starter'], de: ['die Vorspeise'] }, explanation: L('The first course. Careful: not the main course as in American English.', 'Le premier plat du repas.', 'Der erste Gang. Achtung: nicht das Hauptgericht.'), matching: L('une entrée = starter, the first course.', 'une entrée : le premier plat.', 'une entrée = Vorspeise, der erste Gang.') },
    { id: 'plat', term: 'un plat', translations: { en: ['main course', 'dish'], de: ['das Hauptgericht', 'das Gericht'] }, explanation: L('The main course; also any dish.', 'Le plat principal ; aussi un plat en général.', 'Das Hauptgericht; auch allgemein ein Gericht.'), matching: L('un plat = main course.', 'un plat : le plat principal.', 'un plat = Hauptgericht.') },
    { id: 'offert', term: 'offert', translations: { en: ['free', 'on the house'], de: ['gratis', 'aufs Haus'] }, explanation: L('Given by the restaurant, you do not pay for it.', 'Donné par le restaurant, on ne le paie pas.', 'Vom Restaurant geschenkt, man zahlt nicht dafür.'), matching: L('offert = free, on the house.', 'offert : gratuit.', 'offert = gratis, aufs Haus.') },
    { id: 'poisson', term: 'le poisson', translations: { en: ['fish'], de: ['der Fisch'] }, explanation: L('Poisson du jour: the fish of the day, it changes daily.', 'Poisson du jour : le poisson change chaque jour.', 'Poisson du jour: der Fisch des Tages, er wechselt täglich.'), matching: L('le poisson = fish.', 'le poisson : un animal qui vit dans l’eau.', 'le poisson = Fisch.') },
  ],
  main: {
    contents: L('Five sections without titles: two starters, three mains, two desserts, three drinks, and the set menu (starter + main + dessert 15 €, coffee free).', 'Cinq rubriques sans titre : deux entrées, trois plats, deux desserts, trois boissons, et la formule (entrée + plat + dessert 15 €, café offert).', 'Fünf Rubriken ohne Titel: zwei Vorspeisen, drei Hauptgerichte, zwei Desserts, drei Getränke und die formule (Vorspeise + Hauptgericht + Dessert 15 €, Kaffee gratis).'),
    title: 'Le Petit Zinc',
    meta: ['Menu du midi · du lundi au vendredi'],
    parts: [
      { id: 'm-starters', segments: [['Soupe de légumes', '6 €'], ['Salade de tomates', '5 €']] },
      { id: 'm-mains', segments: [['Poulet rôti et frites', '12 €'], ['Poisson du jour et riz', '14 €'], ['Omelette au fromage', '9 €']] },
      { id: 'm-desserts', segments: [['Tarte aux pommes', '5 €'], ['Mousse au chocolat', '5 €']] },
      { id: 'm-drinks', segments: [['Eau minérale', '2 €'], ['Jus d’orange', '3 €'], ['Café', '2 €']] },
      { id: 'm-set', segments: [['Entrée + plat + dessert', '15 €'], 'Café offert avec la formule'] },
    ],
    highlights: [['formule', 'm-s12', 'formule'], ['entree', 'm-s11', 'Entrée'], ['plat', 'm-s11', 'plat'], ['offert', 'm-s12'], ['poisson', 'm-s4', 'Poisson']],
  },
  exam: {
    contents: L('A crêperie open every day: three crêpes with prices, cider by the bottle, lemonade, a children’s menu.', 'Une crêperie ouverte tous les jours : trois crêpes et leurs prix, du cidre en bouteille, une limonade, un menu enfant.', 'Eine täglich geöffnete Crêperie: drei Crêpes mit Preisen, Cidre in der Flasche, Limonade, ein Kindermenü.'),
    title: 'Crêperie Ty Breizh',
    meta: ['Ouvert tous les jours'],
    parts: [
      { id: 'x-crepes', segments: [['Crêpe jambon fromage', '8 €'], ['Crêpe au sucre', '4 €'], ['Crêpe chocolat banane', '6 €']] },
      { id: 'x-drinks', segments: [['Cidre (bouteille)', '9 €'], ['Limonade', '3 €'], ['Menu enfant : crêpe + boisson', '7 €']] },
    ],
  },
  skim: { focus: 'genre', question: 'Qu’est-ce que c’est ?', right: 'La carte d’un restaurant', wrong: ['Une liste de courses', 'Un ticket de caisse', 'Une recette de cuisine'], explanation: L('A name, dishes with prices and menu du midi: a restaurant menu.', 'Un nom, des plats avec des prix et menu du midi : la carte d’un restaurant.', 'Ein Name, Gerichte mit Preisen und menu du midi: eine Restaurantkarte.') },
  detail: [
    short('q-set-price', 'Combien coûte la formule ?', ['15 €', '15 euros', '15€', '15', 'quinze euros'], ['m-s11'], L('Entrée + plat + dessert: 15 €. That is the formule.', 'Entrée + plat + dessert : 15 €. C’est la formule.', 'Entrée + plat + dessert: 15 €. Das ist die formule.'), L('The price of the set menu', 'Le prix de la formule', 'Der Preis der formule')),
    choice('q-cheapest', 'Quel est le plat le moins cher ?', 'L’omelette au fromage', ['Le poulet rôti et frites', 'Le poisson du jour et riz'], ['m-s3', 'm-s4', 'm-s5'], L('Omelette 9 €, chicken 12 €, fish 14 €.', 'Omelette 9 €, poulet 12 €, poisson 14 €.', 'Omelette 9 €, Hähnchen 12 €, Fisch 14 €.'), L('Comparing prices of the mains', 'Comparer les prix des plats', 'Preise der Hauptgerichte vergleichen')),
    tf('q-coffee', 'Avec la formule, on ne paie pas le café.', 'true', ['m-s12'], L('True: café offert avec la formule, the coffee is free.', 'Vrai : café offert avec la formule, le café est gratuit.', 'Richtig: café offert avec la formule, der Kaffee ist gratis.'), L('What the set menu includes (free coffee)', 'Ce que comprend la formule (café offert)', 'Was die formule enthält (Kaffee gratis)')),
    choice('q-juice', 'Combien coûte un jus d’orange ?', '3 €', ['2 €', '5 €', '6 €'], ['m-s9'], L('Jus d’orange: 3 €. Water and coffee cost 2 €.', 'Jus d’orange : 3 €. L’eau et le café coûtent 2 €.', 'Jus d’orange: 3 €. Wasser und Kaffee kosten 2 €.'), L('The price of a drink', 'Le prix d’une boisson', 'Der Preis eines Getränks')),
  ],
  structure: {
    instructions: L('The menu lost its titles. Match a title to each section.', 'La carte a perdu ses titres. Associez un titre à chaque rubrique.', 'Die Karte hat ihre Überschriften verloren. Ordne jeder Rubrik eine Überschrift zu.'),
    item: headings('menu-headings', [
      ['m-starters', 'Entrées', L('Soup and salad come first: starters.', 'Soupe et salade se mangent en premier : les entrées.', 'Suppe und Salat kommen zuerst: Vorspeisen.')],
      ['m-mains', 'Plats', L('Chicken, fish, omelette: the mains, and the dearest dishes.', 'Poulet, poisson, omelette : les plats, et les plus chers.', 'Hähnchen, Fisch, Omelett: die Hauptgerichte, und die teuersten.')],
      ['m-desserts', 'Desserts', L('Apple tart and chocolate mousse are sweet: desserts.', 'Tarte aux pommes et mousse au chocolat : des desserts.', 'Apfelkuchen und Schokoladenmousse sind süß: Desserts.')],
      ['m-drinks', 'Boissons', L('Water, juice, coffee: drinks.', 'Eau, jus, café : des boissons.', 'Wasser, Saft, Kaffee: Getränke.')],
      ['m-set', 'Formule du jour', L('Entrée + plat + dessert for one price: the set menu.', 'Entrée + plat + dessert à un prix : la formule.', 'Entrée + plat + dessert zu einem Preis: die formule.')],
    ]),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      short('x-sugar', 'Combien coûte la crêpe au sucre ?', ['4 €', '4 euros', '4€', '4', 'quatre euros'], ['x-s2'], L('Crêpe au sucre: 4 €.', 'Crêpe au sucre : 4 €.', 'Crêpe au sucre: 4 €.')),
      choice('x-six', 'Quelle crêpe coûte 6 € ?', 'La crêpe chocolat banane', ['La crêpe jambon fromage', 'La crêpe au sucre'], ['x-s3'], L('Crêpe chocolat banane: 6 €.', 'Crêpe chocolat banane : 6 €.', 'Crêpe chocolat banane: 6 €.')),
      choice('x-kids', 'Qu’est-ce qu’il y a dans le menu enfant ?', 'Une crêpe et une boisson', ['Deux crêpes', 'Une crêpe et un dessert', 'Une boisson seulement'], ['x-s6'], L('Menu enfant: crêpe + boisson, a crêpe and a drink.', 'Menu enfant : crêpe + boisson.', 'Menu enfant: crêpe + boisson, eine Crêpe und ein Getränk.')),
      tf('x-compare', 'Une crêpe au sucre coûte plus cher qu’une limonade.', 'true', ['x-s2', 'x-s5'], L('True: crêpe au sucre 4 €, limonade 3 €.', 'Vrai : crêpe au sucre 4 €, limonade 3 €.', 'Richtig: crêpe au sucre 4 €, limonade 3 €.')),
      tf('x-cider', 'Le cidre est vendu en bouteille.', 'true', ['x-s4'], L('True: Cidre (bouteille), 9 €.', 'Vrai : Cidre (bouteille), 9 €.', 'Richtig: Cidre (bouteille), 9 €.')),
    ] },
  ],
  // The prototype's page estimates, kept as authored.
  durations: { keywords: [40, 50], skim: 65, detail: 150, structure: 75, exam: [[150, 225]] },
} satisfies ReadingDefinition;
