import type { ReactNode } from 'react';

import { highlightRanges } from '../domain/readingLesson.ts';
import type { ReadingDocument as ReadingDocumentData } from '../schemas/reading.ts';

/** Splits a paragraph at every whole-word occurrence of its highlighted key words. */
function marked(text: string, words: string[]): ReactNode {
  const out: ReactNode[] = [];
  let from = 0;
  for (const { at, word } of highlightRanges(text, words)) {
    out.push(text.slice(from, at), <mark key={at} className="reading-keyword">{word}</mark>);
    from = at + word.length;
  }
  out.push(text.slice(from));
  return out;
}

/**
 * A reading document (SPEC section 9). Every genre uses this one layout: title, one meta line (sender,
 * date, byline…) and paragraphs; a line break inside a paragraph starts a new line, so a menu, a poem
 * or a timetable stays readable. Key words are marked in the skim and detail views, never in the exam.
 */
export function ReadingDocument({ doc, lang, label, highlight }: { doc: ReadingDocumentData; lang: string; label: string; highlight: boolean }) {
  const words = highlight ? [...new Set(doc.highlights.map((h) => h.text))] : [];
  return (
    <article className="reading-document" lang={lang} aria-label={label}>
      {doc.title && <h3 className="reading-title">{doc.title}</h3>}
      {doc.meta.length > 0 && <p className="reading-meta">{doc.meta.map((m, n) => <span key={n}>{m}</span>)}</p>}
      {doc.paragraphs.map((text, n) => <p key={n} className="reading-paragraph">{marked(text, words)}</p>)}
    </article>
  );
}
