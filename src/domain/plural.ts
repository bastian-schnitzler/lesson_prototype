/**
 * French plurals for the vocabulary exam (P4-05 review): a noun may also be answered in the plural with
 * "des" when the right gender is chosen, because "des" does not show the gender. Briefs store no
 * plural forms, so they are derived with the regular rules and the common exceptions.
 */
const IRREGULAR: Record<string, string> = {
  œil: 'yeux', oeil: 'yeux', monsieur: 'messieurs', madame: 'mesdames', mademoiselle: 'mesdemoiselles',
  ciel: 'cieux', travail: 'travaux', vitrail: 'vitraux', corail: 'coraux', émail: 'émaux',
  bijou: 'bijoux', caillou: 'cailloux', chou: 'choux', genou: 'genoux', hibou: 'hiboux', joujou: 'joujoux', pou: 'poux',
};
const AL_WITH_S = new Set(['bal', 'carnaval', 'chacal', 'festival', 'récital', 'régal', 'cérémonial']);
const EU_WITH_S = new Set(['bleu', 'pneu', 'émeu']);

/** Plural of one French word. */
export function pluralWord(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR[lower]) return IRREGULAR[lower];
  if (/[sxz]$/.test(lower)) return word;
  if (/(eau|au)$/.test(lower) || (/eu$/.test(lower) && !EU_WITH_S.has(lower))) return `${word}x`;
  if (/al$/.test(lower) && !AL_WITH_S.has(lower)) return `${word.slice(0, -2)}aux`;
  return `${word}s`;
}

/**
 * Plural of a noun phrase without article: the head noun changes; an adjective directly after it
 * agrees as well, while a complement after de/d'/à/au/en stays (jus d'orange → jus d'orange,
 * salle de classe → salles de classe, stylo bleu → stylos bleus).
 */
export function pluralPhrase(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  const out: string[] = [];
  for (const [n, w] of words.entries()) {
    const isComplement = /^(de|du|des|d'|d’|à|au|aux|en)/i.test(w);
    if (isComplement) return [...out, ...words.slice(n)].join(' ');
    out.push(n < 2 ? pluralWord(w) : w);
  }
  return out.join(' ');
}

/** "des" + the plural of an indefinite singular form (un livre → des livres); undefined otherwise. */
export function indefinitePlural(form: string): string | undefined {
  const m = /^(un|une)\s+(.+)$/iu.exec(form.trim());
  return m ? `des ${pluralPhrase(m[2])}` : undefined;
}
