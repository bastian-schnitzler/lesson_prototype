import { choice, L, order, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** Ported from the reading prototype (lesson-prototype, A1); texts and questions unchanged. */
export default {
  id: 'fr-reading-a-text-message',
  genre: 'text_message',
  objective: L('Read a short text message from a friend and find the day, the time and the place of the meeting, and what happens first.', 'Lire un court SMS d’un ami et retrouver le jour, l’heure et le lieu du rendez-vous, et ce qui se passe en premier.', 'Eine kurze SMS von einer Freundin lesen und Tag, Uhrzeit und Ort des Treffens finden, und was zuerst passiert.'),
  situation: L('Léa sends her friend Tom a text message on Thursday evening to plan Saturday.', 'Jeudi soir, Léa envoie un SMS à son ami Tom pour organiser samedi.', 'Léa schickt ihrem Freund Tom am Donnerstagabend eine SMS, um den Samstag zu planen.'),
  readerTask: L('Find the day, the time and the place of the meeting, and put Saturday’s plans in order.', 'Retrouver le jour, l’heure et le lieu du rendez-vous, et remettre le programme de samedi dans l’ordre.', 'Tag, Uhrzeit und Ort des Treffens finden und das Programm für Samstag ordnen.'),
  coverageNotes: L('Days and times (15 h), places with au / chez, and avant / après to order plans. Not covered: replying to the message.', 'Jours et heures (15 h), lieux avec au / chez, et avant / après pour ordonner un programme. Non traité : répondre au message.', 'Tage und Uhrzeiten (15 h), Orte mit au / chez und avant / après für die Reihenfolge. Nicht behandelt: auf die SMS antworten.'),
  prerequisites: [L('Days of the week', 'Les jours de la semaine', 'Die Wochentage'), L('Numbers up to 20', 'Les nombres jusqu’à 20', 'Die Zahlen bis 20')],
  keywords: [
    { id: 'samedi', term: 'samedi', translations: { en: ['Saturday'], de: ['Samstag'] }, explanation: L('A day of the week. Days take no capital letter in French.', 'Un jour de la semaine. Les jours s’écrivent sans majuscule.', 'Ein Wochentag. Wochentage schreibt man im Französischen klein.'), matching: L('samedi = Saturday.', 'samedi : le jour après vendredi.', 'samedi = Samstag.') },
    { id: 'on-se-voit', term: 'on se voit', translations: { en: ['we meet', 'shall we meet'], de: ['wir treffen uns', 'sehen wir uns'] }, explanation: L('Friendly way to suggest meeting: on means nous in everyday French.', 'Façon amicale de proposer de se retrouver : on veut dire nous à l’oral.', 'Freundliche Art, ein Treffen vorzuschlagen: on bedeutet im Alltag nous (wir).'), matching: L('on se voit = we meet (on = nous).', 'on se voit = nous nous voyons.', 'on se voit = wir treffen uns (on = nous).') },
    { id: 'la-gare', term: 'la gare', translations: { en: ['the train station'], de: ['der Bahnhof'] }, explanation: L('Where trains stop. Le café de la gare is the café at the station.', 'Là où les trains s’arrêtent. Le café de la gare est le café près de la gare.', 'Wo die Züge halten. Le café de la gare ist das Café am Bahnhof.'), matching: L('la gare = the train station.', 'la gare : là où on prend le train.', 'la gare = der Bahnhof.') },
    { id: 'avant', term: 'avant', translations: { en: ['before'], de: ['vorher', 'vor'] }, explanation: L('Earlier in time. Watch it: it tells you what comes first.', 'Plus tôt dans le temps. Attention : il dit ce qui vient en premier.', 'Früher. Achtung: Es zeigt, was zuerst kommt.'), matching: L('avant = before, earlier.', 'avant : plus tôt.', 'avant = vorher, früher.') },
    { id: 'apres', term: 'après', translations: { en: ['after', 'afterwards'], de: ['danach', 'nach'] }, explanation: L('Later in time, the opposite of avant.', 'Plus tard dans le temps, le contraire de avant.', 'Später, das Gegenteil von avant.'), matching: L('après = after, later.', 'après : plus tard.', 'après = danach, später.') },
  ],
  main: {
    contents: L('Three bubbles from Léa: hello and are you free on Saturday afternoon; the plan (dinner at hers in the evening, but first the station café at 15 h, then the cinema at 17 h); answer before Friday.', 'Trois bulles de Léa : salut, tu es libre samedi après-midi ; le programme (dîner chez elle le soir, mais avant le café de la gare à 15 h, puis cinéma à 17 h) ; réponds avant vendredi.', 'Drei Blasen von Léa: Hallo, hast du Samstagnachmittag Zeit; der Plan (abends Essen bei ihr, aber vorher 15 h Bahnhofscafé, dann 17 h Kino); Antwort bis Freitag.'),
    title: null,
    meta: ['Léa', 'Jeudi 18:42'],
    parts: [
      { id: 'm-hello', segments: ['Salut Tom !', 'Tu es libre samedi après-midi ?'] },
      { id: 'm-plan', segments: ['Samedi soir, on mange chez moi avec Paul.', 'On fait des crêpes !', 'Mais avant, on se voit à 15 h au café de la gare ?', 'Après le café, on va au cinéma à 17 h.'] },
      { id: 'm-bye', segments: ['Si tu ne peux pas, dis-le-moi avant vendredi.', 'Bisous, Léa'] },
    ],
    highlights: [['samedi', 'm-s2'], ['on-se-voit', 'm-s5'], ['la-gare', 'm-s5'], ['avant', 'm-s5'], ['apres', 'm-s6', 'Après']],
  },
  exam: {
    contents: L('Paul suggests football in the park on Sunday at 10 h at the entrance, then a picnic; Tom brings water.', 'Paul propose du foot au parc dimanche à 10 h devant l’entrée, puis un pique-nique ; Tom apporte de l’eau.', 'Paul schlägt Sonntag um 10 h Fußball im Park vor, Treffpunkt am Eingang, danach Picknick; Tom bringt Wasser mit.'),
    title: null,
    meta: ['Paul', 'Vendredi 9:15'],
    parts: [
      { id: 'x-plan', segments: ['Salut Tom !', 'Dimanche matin, on joue au foot au parc Monceau ?', 'Rendez-vous à 10 h devant l’entrée.'] },
      { id: 'x-more', segments: ['Après le match, pique-nique !', 'Apporte de l’eau, j’ai les sandwichs.', 'Paul'] },
    ],
  },
  skim: { focus: 'purpose', question: 'Pourquoi Léa écrit-elle à Tom ?', right: 'Pour proposer de se voir samedi', wrong: ['Pour dire merci pour un cadeau', 'Pour annuler un rendez-vous', 'Pour demander l’heure du train'], explanation: L('Tu es libre samedi ? and on se voit… ? are invitations: Léa suggests meeting.', 'Tu es libre samedi ? et on se voit… ? sont des propositions : Léa propose de se voir.', 'Tu es libre samedi ? und on se voit… ? sind Vorschläge: Léa möchte sich treffen.') },
  detail: [
    choice('q-day', 'Quel jour Léa propose-t-elle de se voir ?', 'samedi', ['vendredi', 'jeudi', 'dimanche'], ['m-s2'], L('Léa asks: Tu es libre samedi après-midi ? Jeudi is the day she writes, vendredi the day to answer by.', 'Léa demande : Tu es libre samedi après-midi ? Jeudi est le jour du message, vendredi le jour limite pour répondre.', 'Léa fragt: Tu es libre samedi après-midi ? Jeudi ist der Tag der SMS, vendredi der Tag für die Antwort.'), L('The day of the meeting', 'Le jour du rendez-vous', 'Der Tag des Treffens')),
    short('q-time', 'À quelle heure est le rendez-vous au café ?', ['15 h', '15h', 'à 15 h', 'à 15h', '15 heures', 'à 15 heures', 'quinze heures', '15:00'], ['m-s5'], L('On se voit à 15 h au café de la gare. 17 h is the cinema.', 'On se voit à 15 h au café de la gare. 17 h, c’est le cinéma.', 'On se voit à 15 h au café de la gare. 17 h ist das Kino.'), L('The time of the meeting', 'L’heure du rendez-vous', 'Die Uhrzeit des Treffens')),
    choice('q-place', 'Où Tom et Léa se retrouvent-ils à 15 h ?', 'Au café de la gare', ['Au cinéma', 'Chez Léa', 'Chez Paul'], ['m-s5'], L('The meeting point is au café de la gare. They eat at Léa’s (chez moi) in the evening.', 'Le lieu du rendez-vous est au café de la gare. Ils mangent chez Léa (chez moi) le soir.', 'Treffpunkt ist au café de la gare. Abends essen sie bei Léa (chez moi).'), L('The meeting place', 'Le lieu du rendez-vous', 'Der Treffpunkt')),
    tf('q-dinner', 'Samedi soir, Tom, Léa et Paul mangent au restaurant.', 'false', ['m-s3'], L('False: on mange chez moi means at Léa’s home, not in a restaurant.', 'Faux : on mange chez moi veut dire chez Léa, pas au restaurant.', 'Falsch: on mange chez moi heißt bei Léa zu Hause, nicht im Restaurant.'), L('Where they eat in the evening', 'Où ils mangent le soir', 'Wo sie abends essen')),
  ],
  structure: {
    instructions: L('What happens on Saturday? Put it in order, from first to last.', 'Que se passe-t-il samedi ? Remettez dans l’ordre, du premier au dernier.', 'Was passiert am Samstag? Bring es in die Reihenfolge, vom Ersten bis zum Letzten.'),
    item: order('order-saturday', 'information', ['Tom et Léa se voient au café de la gare.', 'Ils vont au cinéma.', 'Ils mangent des crêpes chez Léa avec Paul.'], L('Café at 15 h (Mais avant…), then cinema at 17 h (Après le café…), then dinner in the evening (Samedi soir). The message gives the evening first.', 'Café à 15 h (Mais avant…), puis cinéma à 17 h (Après le café…), puis dîner le soir (Samedi soir). Le message parle du soir en premier.', 'Café um 15 h (Mais avant…), dann Kino um 17 h (Après le café…), dann abends Essen (Samedi soir). Die SMS nennt den Abend zuerst.')),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      choice('x-day', 'Quel jour est le match ?', 'dimanche', ['samedi', 'vendredi', 'lundi'], ['x-s2'], L('Dimanche matin, on joue au foot. Vendredi is the day Paul writes.', 'Dimanche matin, on joue au foot. Vendredi est le jour du message.', 'Dimanche matin, on joue au foot. Vendredi ist der Tag der SMS.')),
      short('x-time', 'À quelle heure est le rendez-vous ?', ['10 h', '10h', 'à 10 h', 'à 10h', '10 heures', 'à 10 heures', 'dix heures', '10:00'], ['x-s3'], L('Rendez-vous à 10 h devant l’entrée.', 'Rendez-vous à 10 h devant l’entrée.', 'Rendez-vous à 10 h devant l’entrée.')),
      choice('x-place', 'Où est le rendez-vous ?', 'Devant l’entrée du parc', ['Au café de la gare', 'Chez Paul', 'Devant le cinéma'], ['x-s2', 'x-s3'], L('They play au parc Monceau and meet devant l’entrée, in front of the entrance.', 'Ils jouent au parc Monceau et se retrouvent devant l’entrée.', 'Sie spielen au parc Monceau und treffen sich devant l’entrée, vor dem Eingang.')),
      tf('x-bring', 'Tom apporte les sandwichs.', 'false', ['x-s5'], L('False: Tom brings water (de l’eau); Paul has the sandwiches (j’ai les sandwichs).', 'Faux : Tom apporte de l’eau ; Paul a les sandwichs (j’ai les sandwichs).', 'Falsch: Tom bringt Wasser (de l’eau); Paul hat die Sandwiches (j’ai les sandwichs).')),
      choice('x-after', 'Qu’est-ce qu’ils font après le match ?', 'Un pique-nique', ['Du cinéma', 'Des crêpes chez Léa', 'Un café à la gare'], ['x-s4'], L('Après le match, pique-nique !', 'Après le match, pique-nique !', 'Après le match, pique-nique !')),
    ] },
  ],
  // The prototype's page estimates, kept as authored.
  durations: { keywords: [40, 50], skim: 65, detail: 150, structure: 60, exam: [[150, 225]] },
} satisfies ReadingDefinition;
