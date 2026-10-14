import { choice, L, order, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** A1: a birthday party invitation; the exam reads a picnic invitation. */
export default {
  id: 'fr-reading-a-party-invitation',
  genre: 'other',
  objective: L('Read an invitation to a party and find the occasion, the date, the time, the place, what to bring and how to reply.', 'Lire une invitation à une fête et trouver l’occasion, la date, l’heure, le lieu, ce qu’il faut apporter et comment répondre.', 'Eine Einladung zu einem Fest lesen und Anlass, Datum, Uhrzeit, Ort, Mitbringsel und Antwortweg finden.'),
  situation: L('Inès invites her French class to her 30th birthday party with a printed card.', 'Inès invite sa classe de français à la fête de ses 30 ans avec une carte.', 'Inès lädt ihren Französischkurs mit einer Karte zu ihrem 30. Geburtstag ein.'),
  readerTask: L('Find when and where the party is, what to bring and how and when to answer.', 'Trouver quand et où est la fête, ce qu’on apporte, et comment et quand répondre.', 'Finden, wann und wo das Fest ist, was man mitbringt und wie und bis wann man antwortet.'),
  coverageNotes: L('Dates, times and an address, the imperative apportez, avant + day. Not covered: writing a reply.', 'Dates, heures et adresse, l’impératif apportez, avant + jour. Non traité : écrire la réponse.', 'Daten, Uhrzeiten und eine Adresse, der Imperativ apportez, avant + Tag. Nicht behandelt: die Antwort schreiben.'),
  prerequisites: [L('Numbers up to 60', 'Les nombres jusqu’à 60', 'Die Zahlen bis 60'), L('Months and days', 'Les mois et les jours', 'Monate und Wochentage')],
  keywords: [
    { id: 'fete', term: 'une fête', translations: { en: ['a party'], de: ['ein Fest', 'eine Party'] }, explanation: L('A meeting of friends to celebrate. Je fais une fête = I am having a party.', 'Une réunion d’amis pour fêter quelque chose. Je fais une fête : j’organise une fête.', 'Ein Treffen mit Freunden zum Feiern. Je fais une fête = Ich mache ein Fest.'), matching: L('une fête = a party.', 'une fête : on fête quelque chose avec des amis.', 'une fête = ein Fest.') },
    { id: 'etage', term: 'l’étage', translations: { en: ['the floor', 'the storey'], de: ['der Stock', 'die Etage'] }, explanation: L('A level of a building: 2e étage = second floor.', 'Un niveau d’un immeuble : 2e étage.', 'Eine Ebene im Haus: 2e étage = zweiter Stock.'), matching: L('l’étage = the floor of a building.', 'l’étage : le niveau dans l’immeuble.', 'l’étage = der Stock.') },
    { id: 'apportez', term: 'apportez', translations: { en: ['bring'], de: ['bringt mit', 'bringen Sie mit'] }, explanation: L('An instruction: bring something with you. From apporter.', 'Une consigne : venez avec quelque chose. Du verbe apporter.', 'Eine Aufforderung: etwas mitbringen. Von apporter.'), matching: L('apportez = bring (with you).', 'apportez : venez avec.', 'apportez = bringt mit.') },
    { id: 'boisson', term: 'une boisson', translations: { en: ['a drink'], de: ['ein Getränk'] }, explanation: L('Something you drink: water, juice, wine…', 'Quelque chose qu’on boit : de l’eau, un jus, du vin…', 'Etwas zum Trinken: Wasser, Saft, Wein…'), matching: L('une boisson = a drink.', 'une boisson : ce qu’on boit.', 'une boisson = ein Getränk.') },
    { id: 'reponse', term: 'la réponse', translations: { en: ['the reply', 'the answer'], de: ['die Antwort'] }, explanation: L('What you send back. Réponse par SMS = reply by text message.', 'Ce qu’on envoie en retour. Réponse par SMS : on répond par SMS.', 'Was man zurückschickt. Réponse par SMS = Antwort per SMS.'), matching: L('la réponse = the reply.', 'la réponse : on répond.', 'la réponse = die Antwort.') },
  ],
  main: {
    contents: L('Four parts: Inès turns 30 on 14 June and invites everyone; the party is on Saturday 14 June at 19 h at 8 rue des Fleurs, 2nd floor; bring a dessert or a drink, there is music; reply by text message before Thursday.', 'Quatre parties : Inès a 30 ans le 14 juin et invite tout le monde ; la fête est le samedi 14 juin à 19 h, 8 rue des Fleurs, 2e étage ; apportez un dessert ou une boisson, il y a de la musique ; réponse par SMS avant jeudi.', 'Vier Teile: Inès wird am 14. Juni 30 und lädt alle ein; das Fest ist am Samstag, 14. Juni, um 19 h, 8 rue des Fleurs, 2. Stock; Dessert oder Getränk mitbringen, es gibt Musik; Antwort per SMS bis Donnerstag.'),
    title: 'Grande fête chez Inès !',
    meta: ['Invitation'],
    parts: [
      { id: 'm-occasion', segments: ['Le 14 juin, j’ai 30 ans !', 'Je fais une fête et je vous invite.'] },
      { id: 'm-when', segments: ['Rendez-vous le samedi 14 juin à 19 h,', 'au 8, rue des Fleurs, 2e étage.'] },
      { id: 'm-bring', segments: ['Apportez un dessert ou une boisson, s’il vous plaît.', 'Il y a de la musique : on danse !'] },
      { id: 'm-reply', segments: ['Réponse par SMS avant jeudi : 06 12 34 56 78.', 'À samedi ! Inès'] },
    ],
    highlights: [['fete', 'm-s2', 'fête'], ['etage', 'm-s4', 'étage'], ['apportez', 'm-s5', 'Apportez'], ['boisson', 'm-s5', 'boisson'], ['reponse', 'm-s7', 'Réponse']],
  },
  exam: {
    contents: L('A picnic for Tom’s 10th birthday on Sunday 22 June at noon in the park; bring a salad; reply to Léa before Friday.', 'Un pique-nique pour les 10 ans de Tom, le dimanche 22 juin à midi au parc ; apportez une salade ; réponse à Léa avant vendredi.', 'Ein Picknick zu Toms 10. Geburtstag am Sonntag, 22. Juni, mittags im Park; Salat mitbringen; Antwort an Léa bis Freitag.'),
    title: 'Pique-nique !',
    meta: [],
    parts: [
      { id: 'x-when', segments: ['Dimanche 22 juin, pique-nique pour les 10 ans de Tom,', 'au parc de la Tête d’Or, à midi.'] },
      { id: 'x-bring', segments: ['Apportez une salade.', 'Réponse à Léa avant vendredi.'] },
    ],
  },
  skim: { focus: 'purpose', question: 'Pourquoi Inès écrit-elle cette carte ?', right: 'Pour inviter à sa fête d’anniversaire', wrong: ['Pour vendre un appartement', 'Pour annuler une fête', 'Pour commander un dessert'], explanation: L('Grande fête, j’ai 30 ans, je vous invite: it is a birthday invitation.', 'Grande fête, j’ai 30 ans, je vous invite : c’est une invitation d’anniversaire.', 'Grande fête, j’ai 30 ans, je vous invite: eine Geburtstagseinladung.') },
  detail: [
    short('q-time', 'À quelle heure commence la fête ?', ['19 h', '19h', 'à 19 h', 'à 19h', '19 heures', 'à 19 heures', 'dix-neuf heures', '19:00'], ['m-s3'], L('Rendez-vous le samedi 14 juin à 19 h.', 'Rendez-vous le samedi 14 juin à 19 h.', 'Rendez-vous le samedi 14 juin à 19 h.'), L('The time of the party', 'L’heure de la fête', 'Die Uhrzeit des Fests')),
    choice('q-occasion', 'Quelle est l’occasion de la fête ?', 'L’anniversaire d’Inès', ['Le mariage d’Inès', 'La fin des cours', 'Un nouvel appartement'], ['m-s1'], L('J’ai 30 ans: Inès is turning 30, it is her birthday.', 'J’ai 30 ans : c’est l’anniversaire d’Inès.', 'J’ai 30 ans: Inès wird 30, es ist ihr Geburtstag.'), L('The occasion', 'L’occasion', 'Der Anlass')),
    choice('q-bring', 'Qu’est-ce qu’on apporte ?', 'Un dessert ou une boisson', ['Des fleurs', 'Un cadeau', 'De la musique'], ['m-s5'], L('Apportez un dessert ou une boisson. The music is already there.', 'Apportez un dessert ou une boisson. La musique, Inès l’a déjà.', 'Apportez un dessert ou une boisson. Musik gibt es schon.'), L('What to bring', 'Ce qu’il faut apporter', 'Was man mitbringt')),
    tf('q-reply', 'On répond à Inès par téléphone après la fête.', 'false', ['m-s7'], L('False: the reply is par SMS (by text message) and avant jeudi, before Thursday.', 'Faux : la réponse est par SMS et avant jeudi.', 'Falsch: Die Antwort kommt par SMS und avant jeudi, vor Donnerstag.'), L('How and when to reply', 'Comment et quand répondre', 'Wie und bis wann man antwortet')),
  ],
  structure: {
    instructions: L('The invitation is cut into pieces. Put its parts back in the order of the card.', 'L’invitation est découpée. Remettez les parties dans l’ordre de la carte.', 'Die Einladung ist zerschnitten. Bring die Teile in die Reihenfolge der Karte.'),
    item: order('invitation-parts', 'parts', [['m-occasion', 'Inès a 30 ans et fait une fête.'], ['m-when', 'Le jour, l’heure et l’adresse'], ['m-bring', 'Ce qu’il faut apporter'], ['m-reply', 'Comment et quand répondre']], L('An invitation says why first, then when and where, then what to bring, and ends with how to reply.', 'Une invitation dit d’abord pourquoi, puis quand et où, puis quoi apporter, et finit par la réponse.', 'Eine Einladung sagt zuerst warum, dann wann und wo, dann was man mitbringt, und zum Schluss, wie man antwortet.')),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      choice('x-occasion', 'C’est l’anniversaire de qui ?', 'De Tom', ['De Léa', 'D’Inès', 'De la classe'], ['x-s1'], L('Pique-nique pour les 10 ans de Tom: Tom turns 10. Léa receives the replies.', 'Pique-nique pour les 10 ans de Tom. Léa reçoit les réponses.', 'Pique-nique pour les 10 ans de Tom: Tom wird 10. Léa bekommt die Antworten.')),
      short('x-time', 'À quelle heure est le pique-nique ?', ['à midi', 'midi', '12 h', 'à 12 h', '12h', 'à 12h', '12 heures'], ['x-s2'], L('À midi: at noon.', 'À midi.', 'À midi: mittags.')),
      choice('x-place', 'Où est le pique-nique ?', 'Au parc', ['Chez Tom', 'Chez Léa', 'Au restaurant'], ['x-s2'], L('Au parc de la Tête d’Or, a park in Lyon.', 'Au parc de la Tête d’Or.', 'Au parc de la Tête d’Or, ein Park in Lyon.')),
      tf('x-bring', 'On apporte une boisson.', 'false', ['x-s3'], L('False: apportez une salade, bring a salad.', 'Faux : apportez une salade.', 'Falsch: apportez une salade, einen Salat mitbringen.')),
      choice('x-reply', 'On répond avant quel jour ?', 'vendredi', ['dimanche', 'jeudi', 'samedi'], ['x-s4'], L('Réponse à Léa avant vendredi. Sunday is the picnic.', 'Réponse à Léa avant vendredi. Le dimanche, c’est le pique-nique.', 'Réponse à Léa avant vendredi. Sonntag ist das Picknick.')),
    ] },
  ],
} satisfies ReadingDefinition;
