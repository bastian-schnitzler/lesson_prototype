import { useCallback } from 'react';

import { usePreferences } from '../app/context.tsx';
import { speak } from './speech.ts';

/**
 * Autoplay mode (P4-05 review): returns a function that speaks a learning-language text by itself when
 * the header switch is on (the default) and a voice exists; otherwise it does nothing.
 */
export function useAutoplay(lang: string) {
  const { autoplay } = usePreferences();
  return useCallback((text: string | undefined, options?: { queue?: boolean }) => {
    if (autoplay !== false && text) speak(text, lang, options);
  }, [autoplay, lang]);
}

/** A French pronoun with its verb form, with elision (je + ai → j'ai), for autoplay (P4-05 review). */
export function pronounWithForm(pronoun: string, form: string): string {
  return /^je$/i.test(pronoun.trim()) && /^[aeiouéèêhy]/i.test(form) ? `j'${form}` : `${pronoun} ${form}`;
}

/** A gap sentence with its answer: a comma or full stop follows the answer directly. */
export function gapSentence(before: string | undefined, answer: string, after: string | undefined): string {
  const tail = after ? (/^[,.]/.test(after) ? after : ` ${after}`) : '';
  return `${before ? `${before} ` : ''}${answer}${tail}`.trim();
}
