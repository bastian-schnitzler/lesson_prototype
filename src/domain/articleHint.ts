import { normalizeAnswer } from './answers.ts';

/** Learning-language articles that start a noun answer (French only for now). */
const ARTICLE: Record<string, RegExp> = { fr: /^(un|une|des|le|la|les)\s|^l['’]/iu };

/** True when `text` starts with an article of `lang`. */
export function startsWithArticle(text: string, lang: string): boolean {
  return ARTICLE[lang]?.test(normalizeAnswer(text)) ?? false;
}

/**
 * Exam hint (P2-03): the answer looks like the solution without its article – one word fewer than
 * the article-bearing solution, and its first word is not an article.
 */
export function missingArticle(response: string, solution: string, lang: string): boolean {
  const answer = normalizeAnswer(response);
  if (!answer || !startsWithArticle(solution, lang) || startsWithArticle(answer, lang)) return false;
  const words = (s: string) => normalizeAnswer(s).replace(/^l['’]/iu, 'l ').split(' ').length;
  return words(answer) === words(solution) - 1;
}
