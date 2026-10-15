import type { LocalizedText } from '../schemas/artifactCommon.ts';

const L = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de });

/** Step labels and page instructions are application copy, not generated text. */
export const COPY = {
  introduction: [L('Introduction', 'Introduction', 'Einführung'), L('Read the introduction and listen to the new words.', 'Lisez l’introduction et écoutez les nouveaux mots.', 'Lies die Einführung und hör dir die neuen Wörter an.')],
  flashcards: [L('Flashcards', 'Cartes mémoire', 'Karteikarten'), L('Recall each word, then turn the card to check it.', 'Rappelez-vous chaque mot, puis retournez la carte pour vérifier.', 'Erinnere dich an jedes Wort und dreh dann die Karte um.')],
  matching: [L('Matching', 'Association', 'Zuordnen'), L('Match each word with its translation.', 'Associez chaque mot à sa traduction.', 'Ordne jedem Wort seine Übersetzung zu.')],
  gender: [L('Gender', 'Genre', 'Genus'), L('Choose the gender of each noun.', 'Choisissez le genre de chaque nom.', 'Wähle das Genus jedes Nomens.')],
  overview: [L('Overview', 'Vue d’ensemble', 'Übersicht'), L('Review all words of this lesson.', 'Revoyez tous les mots de cette leçon.', 'Sieh dir alle Wörter dieser Lektion an.')],
  practice: [L('Practice', 'Entraînement', 'Übung'), L('Choose the right word and type it.', 'Choisissez le bon mot et écrivez-le.', 'Wähle das richtige Wort und schreibe es.')],
  listening: [L('Listening', 'Écoute', 'Hören'), L('Listen and choose the word you hear.', 'Écoutez et choisissez le mot entendu.', 'Hör zu und wähle das Wort, das du hörst.')],
  exam: [L('Final exam', 'Examen final', 'Abschlussprüfung'), L('Translate each word into French, with its article for nouns.', 'Traduisez chaque mot en français, avec l’article pour les noms.', 'Übersetze jedes Wort ins Französische, bei Nomen mit Artikel.')],
  dictation: [L('Dictation', 'Dictée', 'Diktat'), L('Listen and write the word, with its article for nouns.', 'Écoutez et écrivez le mot, avec l’article pour les noms.', 'Hör zu und schreib das Wort, bei Nomen mit Artikel.')],
  explanation: [L('Explanation', 'Explication', 'Erklärung'), L('Read the explanation and the examples.', 'Lisez l’explication et les exemples.', 'Lies die Erklärung und die Beispiele.')],
  feedback: [L('Your feedback', 'Votre retour', 'Dein Feedback'), L('Continue to the final exam.', 'Passez à l’examen final.', 'Weiter zur Abschlussprüfung.')],
  grammarExam: [L('Final exam', 'Examen final', 'Abschlussprüfung'), L('Answer every item before the time runs out.', 'Répondez à chaque question avant la fin du temps imparti.', 'Beantworte jede Aufgabe, bevor die Zeit abläuft.')],
} as const;

export const EXERCISE_INSTRUCTIONS = {
  grammar_person_matching: L('Connect each pronoun with its partner.', 'Reliez chaque pronom à son partenaire.', 'Verbinde jedes Pronomen mit seinem Partner.'),
  grammar_pronoun_form_match: L('Choose the form for each pronoun.', 'Choisissez la forme pour chaque pronom.', 'Wähle die Form für jedes Pronomen.'),
  grammar_pronoun_form_typing: L('Type the form for each pronoun.', 'Écrivez la forme pour chaque pronom.', 'Schreib die Form zu jedem Pronomen.'),
  grammar_gap_choice: L('Choose the word that completes the sentence.', 'Choisissez le mot qui complète la phrase.', 'Wähle das Wort, das den Satz ergänzt.'),
  grammar_gap_typing: L('Type the missing words.', 'Écrivez les mots manquants.', 'Schreib die fehlenden Wörter.'),
  grammar_word_order: L('Put the words in the right order.', 'Mettez les mots dans le bon ordre.', 'Bring die Wörter in die richtige Reihenfolge.'),
  grammar_error_spotter: L('Find the wrong word and correct it.', 'Trouvez le mot faux et corrigez-le.', 'Finde das falsche Wort und korrigiere es.'),
} as const;

/** Step labels and page instructions of function lessons (SPEC section 8); application copy, not generated text. */
export const FUNCTIONS_COPY = {
  flashcards: [L('Flashcards', 'Cartes mémoire', 'Karteikarten'), L('Recall each expression, then turn the card to check it.', 'Rappelez-vous chaque expression, puis retournez la carte pour vérifier.', 'Erinnere dich an jeden Ausdruck und dreh dann die Karte um.')],
  wordCards: L('Recall each word, then turn the card to check it.', 'Rappelez-vous chaque mot, puis retournez la carte pour vérifier.', 'Erinnere dich an jedes Wort und dreh dann die Karte um.'),
  dialogue: [L('Dialogue', 'Dialogue', 'Dialog'), L('Read and listen. Turn a line to see its translation and a note.', 'Lisez et écoutez. Retournez une réplique pour voir sa traduction et une remarque.', 'Lies und hör zu. Dreh eine Zeile um, um Übersetzung und Hinweis zu sehen.')],
  matching: [L('Matching', 'Association', 'Zuordnen'), L('Match each expression with its translation.', 'Associez chaque expression à sa traduction.', 'Ordne jedem Ausdruck seine Übersetzung zu.')],
  wordMatching: L('Match each word with its translation.', 'Associez chaque mot à sa traduction.', 'Ordne jedem Wort seine Übersetzung zu.'),
  gender: [L('Gender', 'Genre', 'Genus'), L('Choose the gender of each noun.', 'Choisissez le genre de chaque nom.', 'Wähle das Genus jedes Nomens.')],
  wordOrder: [L('Word order', 'Ordre des mots', 'Wortstellung'), L('Put the words in order.', 'Mettez les mots dans l’ordre.', 'Bring die Wörter in die richtige Reihenfolge.')],
  dialogueGaps: [L('Dialogue gaps', 'Dialogue à trous', 'Dialoglücken'), L('Choose the expression that fits the gap.', 'Choisissez l’expression qui complète la réplique.', 'Wähle den Ausdruck, der in die Lücke passt.')],
  exam: [L('Final exam', 'Examen final', 'Abschlussprüfung'), L('Build the answer. Not every word fits.', 'Construisez la réponse. Tous les mots ne servent pas.', 'Bilde die Antwort. Nicht jedes Wort passt.')],
  listening: [L('Listening', 'Écoute', 'Hören'), L('Listen, then choose the reply that fits.', 'Écoutez, puis choisissez la réponse qui convient.', 'Hör zu und wähle dann die passende Antwort.')],
  examWords: L('Translate each word into French, with its article for nouns.', 'Traduisez chaque mot en français, avec l’article pour les noms.', 'Übersetze jedes Wort ins Französische, bei Nomen mit Artikel.'),
  examDialogue: L('Fill each gap with an expression from this lesson.', 'Complétez chaque trou avec une expression de la leçon.', 'Fülle jede Lücke mit einem Ausdruck aus dieser Lektion.'),
} as const;
