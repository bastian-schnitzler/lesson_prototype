import type { LocalizedText } from '../schemas/artifactCommon.ts';

const L = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de });

/** Step labels and page instructions are application copy, not generated text. */
export const COPY = {
  introduction: [L('Introduction', 'Introduction', 'Einführung'), L('Read the introduction and listen to the new words.', 'Lisez l’introduction et écoutez les nouveaux mots.', 'Lies die Einführung und hör dir die neuen Wörter an.')],
  flashcards: [L('Flashcards', 'Cartes mémoire', 'Karteikarten'), L('Recall each word, then turn the card to check it.', 'Rappelez-vous chaque mot, puis retournez la carte pour vérifier.', 'Erinnere dich an jedes Wort und dreh dann die Karte um.')],
  matching: [L('Matching', 'Association', 'Zuordnen'), L('Match each word with its translation.', 'Associez chaque mot à sa traduction.', 'Ordne jedem Wort seine Übersetzung zu.')],
  gender: [L('Gender and overview', 'Genre et vue d’ensemble', 'Genus und Übersicht'), L('Choose the gender of each noun, then review all words.', 'Choisissez le genre de chaque nom, puis revoyez tous les mots.', 'Wähle das Genus jedes Nomens und sieh dir dann alle Wörter an.')],
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

/** Reading step labels and the page instructions every reading lesson shares (docs/reading-lessons.md). */
export const READING_COPY = {
  keywords: [L('Key words', 'Mots clés', 'Schlüsselwörter'), L('Read the key words of the text and their meaning.', 'Lisez les mots clés du texte et leur sens.', 'Lies die Schlüsselwörter des Textes und ihre Bedeutung.')],
  keywordMatching: [L('Key words', 'Mots clés', 'Schlüsselwörter'), L('Match each key word with its meaning.', 'Associez chaque mot clé à son sens.', 'Ordne jedem Schlüsselwort seine Bedeutung zu.')],
  skim: [L('Skim', 'Survol', 'Überfliegen'), L('Look over the document quickly. It blurs when the time is up; then answer the question.', 'Parcourez rapidement le document. Il se floute à la fin du temps ; répondez ensuite à la question.', 'Überfliege das Dokument. Wenn die Zeit um ist, wird es unscharf; beantworte dann die Frage.')],
  detail: [L('Detail', 'Détails', 'Details'), L('Read the document carefully and answer the questions.', 'Lisez le document attentivement et répondez aux questions.', 'Lies das Dokument genau und beantworte die Fragen.')],
  structure: [L('Structure', 'Structure', 'Aufbau'), L('Put the parts of the document back in order.', 'Remettez les parties du document dans l’ordre.', 'Bring die Teile des Dokuments wieder in die richtige Reihenfolge.')],
  exam: [L('Final exam', 'Examen final', 'Abschlussprüfung'), L('Read the new document and answer the questions. No help this time.', 'Lisez le nouveau document et répondez aux questions. Cette fois, sans aide.', 'Lies das neue Dokument und beantworte die Fragen. Diesmal ohne Hilfe.')],
} as const;
