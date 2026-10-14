import { choice, headings, L, short, tf, type ReadingDefinition } from '../../scripts/author-reading-items.ts';

/** A1: signs in a station hall; the exam reads the signs of a museum. */
export default {
  id: 'fr-reading-public-signs',
  genre: 'sign',
  objective: L('Understand short signs in a public place and know where to go and what is forbidden.', 'Comprendre des panneaux courts dans un lieu public et savoir où aller et ce qui est interdit.', 'Kurze Schilder an einem öffentlichen Ort verstehen und wissen, wohin man geht und was verboten ist.'),
  situation: L('You arrive at a train station in Lyon and look at the signs in the hall.', 'Vous arrivez dans une gare à Lyon et vous regardez les panneaux dans le hall.', 'Du kommst in einem Bahnhof in Lyon an und schaust dir die Schilder in der Halle an.'),
  readerTask: L('Find the way in and out, the opening days and what you must not do.', 'Trouver l’entrée et la sortie, les jours d’ouverture et ce qu’il ne faut pas faire.', 'Eingang und Ausgang, die Öffnungstage und das, was man nicht tun darf, finden.'),
  coverageNotes: L('Sign words in capitals (ENTRÉE, SORTIE, FERMÉ, DÉFENSE DE…), days and opening hours, à gauche / à droite. Not covered: road signs.', 'Mots des panneaux en majuscules (ENTRÉE, SORTIE, FERMÉ, DÉFENSE DE…), jours et horaires, à gauche / à droite. Non traité : les panneaux de la route.', 'Schilderwörter in Großbuchstaben (ENTRÉE, SORTIE, FERMÉ, DÉFENSE DE…), Tage und Öffnungszeiten, à gauche / à droite. Nicht behandelt: Verkehrsschilder.'),
  prerequisites: [L('Days of the week', 'Les jours de la semaine', 'Die Wochentage'), L('Telling the time (6 h, 21 h)', 'Dire l’heure (6 h, 21 h)', 'Die Uhrzeit (6 h, 21 h)')],
  keywords: [
    { id: 'entree', term: 'l’entrée', translations: { en: ['the entrance', 'the way in'], de: ['der Eingang'] }, explanation: L('Where you go in. On a sign it is written ENTRÉE.', 'L’endroit où on entre. Sur un panneau : ENTRÉE.', 'Wo man hineingeht. Auf einem Schild steht ENTRÉE.'), matching: L('l’entrée = the entrance, where you go in.', 'l’entrée : là où on entre.', 'l’entrée = der Eingang.') },
    { id: 'sortie', term: 'la sortie', translations: { en: ['the exit', 'the way out'], de: ['der Ausgang'] }, explanation: L('Where you go out, the opposite of l’entrée.', 'L’endroit où on sort, le contraire de l’entrée.', 'Wo man hinausgeht, das Gegenteil von l’entrée.'), matching: L('la sortie = the exit, where you go out.', 'la sortie : là où on sort.', 'la sortie = der Ausgang.') },
    { id: 'ferme', term: 'fermé', translations: { en: ['closed'], de: ['geschlossen'] }, explanation: L('Not open. The opposite is ouvert.', 'Pas ouvert. Le contraire est ouvert.', 'Nicht offen. Das Gegenteil ist ouvert.'), matching: L('fermé = closed, not open.', 'fermé : pas ouvert.', 'fermé = geschlossen.') },
    { id: 'defense', term: 'défense de…', translations: { en: ['… is forbidden', 'no …'], de: ['… verboten'] }, explanation: L('On a sign, défense de + verb means you must not do it: défense de fumer = no smoking.', 'Sur un panneau, défense de + verbe veut dire : c’est interdit. Défense de fumer : on ne fume pas.', 'Auf einem Schild heißt défense de + Verb: Das ist verboten. Défense de fumer = Rauchen verboten.'), matching: L('défense de… = … is forbidden.', 'défense de… : c’est interdit de…', 'défense de… = … verboten.') },
    { id: 'poussez', term: 'poussez', translations: { en: ['push'], de: ['drücken'] }, explanation: L('On a door: push it to open it. The opposite is tirez (pull).', 'Sur une porte : on pousse pour ouvrir. Le contraire est tirez.', 'An einer Tür: zum Öffnen drücken. Das Gegenteil ist tirez (ziehen).'), matching: L('poussez = push (the door).', 'poussez : on pousse la porte.', 'poussez = drücken (die Tür).') },
  ],
  main: {
    contents: L('Six signs in a station hall: entrance to the platforms; ticket offices closed on Sundays, open Monday to Saturday 6 h–21 h; no smoking; push, the automatic door is broken; exit with taxis and buses on the right; free toilets at the end of the corridor on the left.', 'Six panneaux dans le hall d’une gare : entrée vers les quais ; guichets fermés le dimanche, ouverts du lundi au samedi de 6 h à 21 h ; défense de fumer ; poussez, la porte automatique est en panne ; sortie avec taxis et bus à droite ; toilettes gratuites au fond du couloir à gauche.', 'Sechs Schilder in einer Bahnhofshalle: Eingang zu den Gleisen; Schalter sonntags geschlossen, Montag bis Samstag 6–21 h offen; Rauchen verboten; drücken, die automatische Tür ist kaputt; Ausgang mit Taxis und Bussen rechts; kostenlose Toiletten hinten im Gang links.'),
    title: 'Gare de Lyon-Perrache',
    meta: [],
    parts: [
      { id: 'm-entry', segments: ['ENTRÉE', 'Accès aux quais'] },
      { id: 'm-tickets', segments: ['GUICHETS', 'Fermé le dimanche', 'Ouvert du lundi au samedi, 6 h – 21 h'] },
      { id: 'm-smoking', segments: ['DÉFENSE DE FUMER', 'Merci de fumer dehors.'] },
      { id: 'm-door', segments: ['POUSSEZ', 'Porte automatique en panne'] },
      { id: 'm-exit', segments: ['SORTIE', 'Taxis et bus à droite'] },
      { id: 'm-toilets', segments: ['TOILETTES', 'Au fond du couloir, à gauche', 'Gratuit'] },
    ],
    highlights: [['entree', 'm-s1', 'ENTRÉE'], ['ferme', 'm-s4', 'Fermé'], ['defense', 'm-s6', 'DÉFENSE DE'], ['poussez', 'm-s8', 'POUSSEZ'], ['sortie', 'm-s10', 'SORTIE']],
  },
  exam: {
    contents: L('Five signs in a museum: free entrance on the first Sunday of the month; no photos; closed on Tuesdays; exit with the shop and café on the left; pull.', 'Cinq panneaux dans un musée : entrée gratuite le premier dimanche du mois ; photos interdites ; fermé le mardi ; sortie avec boutique et café à gauche ; tirez.', 'Fünf Schilder in einem Museum: freier Eintritt am ersten Sonntag im Monat; Fotos verboten; dienstags geschlossen; Ausgang mit Laden und Café links; ziehen.'),
    title: 'Musée des Beaux-Arts',
    meta: [],
    parts: [
      { id: 'x-free', segments: ['ENTRÉE GRATUITE', 'Le premier dimanche du mois'] },
      { id: 'x-photos', segments: ['PHOTOS INTERDITES'] },
      { id: 'x-closed', segments: ['FERMÉ LE MARDI'] },
      { id: 'x-exit', segments: ['SORTIE', 'Boutique et café à gauche'] },
      { id: 'x-door', segments: ['TIREZ'] },
    ],
  },
  skim: { focus: 'genre', question: 'Où voit-on ces panneaux ?', right: 'Dans une gare', wrong: ['Dans un restaurant', 'Dans une école', 'Dans un hôpital'], explanation: L('The title says Gare, and the signs talk about quais (platforms) and guichets (ticket offices).', 'Le titre dit Gare, et les panneaux parlent de quais et de guichets.', 'Im Titel steht Gare, und die Schilder sprechen von quais (Gleisen) und guichets (Schaltern).') },
  detail: [
    choice('q-closed', 'Quel jour les guichets sont-ils fermés ?', 'le dimanche', ['le lundi', 'le samedi', 'le mercredi'], ['m-s4'], L('GUICHETS – Fermé le dimanche. They are open from Monday to Saturday.', 'GUICHETS – Fermé le dimanche. Ils sont ouverts du lundi au samedi.', 'GUICHETS – Fermé le dimanche. Von Montag bis Samstag sind sie offen.'), L('The day the ticket offices are closed', 'Le jour de fermeture des guichets', 'Der Ruhetag der Schalter')),
    tf('q-smoke', 'On peut fumer dans la gare.', 'false', ['m-s6', 'm-s7'], L('False: DÉFENSE DE FUMER means no smoking; you smoke outside (dehors).', 'Faux : DÉFENSE DE FUMER veut dire qu’on ne fume pas ; on fume dehors.', 'Falsch: DÉFENSE DE FUMER heißt Rauchen verboten; man raucht draußen (dehors).'), L('What is forbidden', 'Ce qui est interdit', 'Was verboten ist')),
    short('q-taxi', 'Les taxis sont à gauche ou à droite ?', ['à droite', 'droite', 'à droite de la sortie'], ['m-s11'], L('SORTIE – Taxis et bus à droite. The toilets are on the left.', 'SORTIE – Taxis et bus à droite. Les toilettes sont à gauche.', 'SORTIE – Taxis et bus à droite. Die Toiletten sind links.'), L('Where the taxis are', 'Où sont les taxis', 'Wo die Taxis sind')),
    choice('q-door', 'Pourquoi faut-il pousser la porte ?', 'La porte automatique ne marche pas.', ['La porte est fermée le dimanche.', 'Il est interdit d’entrer.', 'C’est la sortie des taxis.'], ['m-s8', 'm-s9'], L('Porte automatique en panne: the automatic door is broken, so you push it yourself.', 'Porte automatique en panne : elle ne marche pas, alors on pousse soi-même.', 'Porte automatique en panne: Die automatische Tür ist kaputt, also drückt man selbst.'), L('Why you push the door', 'Pourquoi on pousse la porte', 'Warum man die Tür drückt')),
  ],
  structure: {
    instructions: L('What is each sign for? Match a meaning to each sign.', 'À quoi sert chaque panneau ? Associez un sens à chaque panneau.', 'Wofür ist jedes Schild? Ordne jedem Schild eine Bedeutung zu.'),
    item: headings('signs-meaning', [
      ['m-entry', 'Pour aller aux trains', L('ENTRÉE – Accès aux quais: the way to the platforms and the trains.', 'ENTRÉE – Accès aux quais : on va vers les trains.', 'ENTRÉE – Accès aux quais: der Weg zu den Gleisen und Zügen.')],
      ['m-tickets', 'Pour acheter un billet', L('The guichets are the ticket offices, with their opening days.', 'Les guichets vendent les billets ; le panneau donne les jours d’ouverture.', 'Die guichets sind die Fahrkartenschalter, mit ihren Öffnungstagen.')],
      ['m-smoking', 'Ce qui est interdit', L('DÉFENSE DE FUMER: smoking is forbidden.', 'DÉFENSE DE FUMER : fumer est interdit.', 'DÉFENSE DE FUMER: Rauchen ist verboten.')],
      ['m-door', 'La porte ne s’ouvre pas seule', L('POUSSEZ – the automatic door is broken (en panne).', 'POUSSEZ – la porte automatique est en panne.', 'POUSSEZ – die automatische Tür ist kaputt (en panne).')],
      ['m-exit', 'Pour prendre un taxi', L('SORTIE – Taxis et bus à droite.', 'SORTIE – Taxis et bus à droite.', 'SORTIE – Taxis et bus à droite.')],
      ['m-toilets', 'Pour aller aux toilettes', L('TOILETTES – at the end of the corridor, on the left, free.', 'TOILETTES – au fond du couloir, à gauche, gratuit.', 'TOILETTES – hinten im Gang, links, kostenlos.')],
    ]),
  },
  examPages: [
    { pageId: 'exam-1', questions: [
      choice('x-closed', 'Quel jour le musée est-il fermé ?', 'le mardi', ['le dimanche', 'le lundi', 'le samedi'], ['x-s4'], L('FERMÉ LE MARDI: closed on Tuesdays. Sunday is the free day.', 'FERMÉ LE MARDI : fermé le mardi. Le dimanche, c’est gratuit.', 'FERMÉ LE MARDI: dienstags geschlossen. Sonntag ist der freie Eintritt.')),
      tf('x-photo', 'On peut prendre des photos dans le musée.', 'false', ['x-s3'], L('False: PHOTOS INTERDITES means photos are forbidden.', 'Faux : PHOTOS INTERDITES, les photos sont interdites.', 'Falsch: PHOTOS INTERDITES heißt Fotos verboten.')),
      short('x-cafe', 'Le café est à gauche ou à droite ?', ['à gauche', 'gauche', 'à gauche de la sortie'], ['x-s6'], L('Boutique et café à gauche: on the left, near the exit.', 'Boutique et café à gauche, près de la sortie.', 'Boutique et café à gauche: links, beim Ausgang.')),
      choice('x-free', 'Quand l’entrée est-elle gratuite ?', 'Le premier dimanche du mois', ['Tous les jours', 'Le mardi', 'Le dernier samedi du mois'], ['x-s1', 'x-s2'], L('ENTRÉE GRATUITE – Le premier dimanche du mois.', 'ENTRÉE GRATUITE – Le premier dimanche du mois.', 'ENTRÉE GRATUITE – Le premier dimanche du mois.')),
      tf('x-door', 'Pour ouvrir la porte, on pousse.', 'false', ['x-s7'], L('False: the sign says TIREZ, pull. Poussez would be push.', 'Faux : le panneau dit TIREZ. Poussez, c’est le contraire.', 'Falsch: Auf dem Schild steht TIREZ, ziehen. Poussez wäre drücken.')),
    ] },
  ],
} satisfies ReadingDefinition;
