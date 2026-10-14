import type { ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import type { ReadingDocument as ReadingDocumentData, ReadingGenre } from '../schemas/reading.ts';

type Part = ReadingDocumentData['parts'][number];
type Segment = Part['segments'][number];

/**
 * Genre skins: how a document looks on its page. A genre without its own skin uses the generic
 * page; a skin is added only where the generic page renders the genre badly (docs/reading-lessons.md).
 */
const SKINS: Partial<Record<ReadingGenre, string>> = {
  text_message: 'skin-message',
  menu: 'skin-menu',
  article: 'skin-article',
  contract: 'skin-contract',
  sign: 'skin-sign',
  dictionary_entry: 'skin-dictionary',
  poem: 'skin-poem',
  recipe: 'skin-recipe',
};
/** Skins whose segments are lines of their own (verse, sign lines, definitions, recipe steps), not running text. */
const LINE_SKINS = new Set(['skin-sign', 'skin-dictionary', 'skin-poem', 'skin-recipe']);

/** Splits a segment's text on its highlighted key words. */
function marked(text: string, words: string[], label: string): ReactNode {
  const found = words.map((w) => ({ w, at: text.indexOf(w) })).filter((f) => f.at >= 0).sort((a, b) => a.at - b.at);
  if (!found.length) return text;
  const out: ReactNode[] = [];
  let from = 0;
  for (const { w, at } of found) {
    if (at < from) continue;
    out.push(text.slice(from, at), <mark key={at} className="reading-keyword" title={label}>{w}</mark>);
    from = at + w.length;
  }
  out.push(text.slice(from));
  return out;
}

interface Props {
  doc: ReadingDocumentData;
  lang: string;
  /** Mark the key words of the document (skim and detail; never in the exam). */
  highlightKeywords: boolean;
  /** Segments to mark as proof of an answer (after Check). */
  evidence?: ReadonlySet<string>;
  /** The skim time is over: the document stays in place but cannot be read. */
  blurred?: boolean;
}

/** A reading document in its genre skin, with key word highlights and evidence marks. */
export function ReadingDocument({ doc, lang, highlightKeywords, evidence, blurred = false }: Props) {
  const { t } = useI18n();
  const skin = SKINS[doc.genre] ?? 'skin-generic';
  const keywordLabel = t('reading.keyword');
  const wordsOf = (segmentId: string) => (highlightKeywords ? doc.highlights.filter((h) => h.segmentId === segmentId).map((h) => h.text) : []);
  // Parts without headings are numbered, so structure tasks can name them ("2. Le nombre de bises…").
  const numbered = doc.parts.length > 1 && doc.parts.every((p) => p.heading === null) && skin !== 'skin-message';

  const segment = (s: Segment, Tag: 'span' | 'li' = 'span') => {
    const proof = evidence?.has(s.segmentId);
    return (
      <Tag key={s.segmentId} className={`reading-segment${proof ? ' is-evidence' : ''}`} data-segment={s.segmentId}>
        {proof && <span className="visually-hidden">{t('reading.evidence')}: </span>}
        <span className="reading-text">{marked(s.text, wordsOf(s.segmentId), keywordLabel)}</span>
        {s.value !== null && (
          <>
            <span className="reading-leader" aria-hidden="true" />
            <span className="reading-value">{s.value}</span>
          </>
        )}
      </Tag>
    );
  };
  const inline = (part: Part) => <p>{part.segments.map((s, n) => [n > 0 && ' ', segment(s)])}</p>;
  const partBody = (part: Part) =>
    skin === 'skin-menu' || part.segments.some((s) => s.value !== null) ? <ul className="reading-rows">{part.segments.map((s) => segment(s, 'li'))}</ul>
      : LINE_SKINS.has(skin) ? <p className="reading-lines">{part.segments.map((s) => segment(s))}</p>
      : inline(part);

  return (
    <article className={`reading-document ${skin}${blurred ? ' is-blurred' : ''}`} lang={lang} aria-label={t('reading.document')} aria-hidden={blurred || undefined} inert={blurred || undefined}>
      {skin === 'skin-message' ? (
        <>
          {doc.meta.length > 0 && (
            <header className="reading-meta">
              {doc.meta.map((m, n) => (n === 0 ? <strong key={n}>{m}</strong> : <span key={n}>{m}</span>))}
            </header>
          )}
          {doc.title && <p className="reading-title">{doc.title}</p>}
          <ol className="reading-bubbles">
            {doc.parts.map((part) => (
              <li key={part.partId} className="reading-part reading-bubble" data-part={part.partId}>
                {part.heading && <span className="reading-sender">{part.heading}</span>}
                {inline(part)}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          {doc.title && <h2 className="reading-title">{doc.title}</h2>}
          {doc.meta.length > 0 && <p className="reading-meta">{doc.meta.map((m, n) => <span key={n}>{m}</span>)}</p>}
          {doc.parts.map((part, n) => (
            <section key={part.partId} className="reading-part" data-part={part.partId}>
              {numbered && <span className="reading-part-number" aria-label={t('reading.part', { n: n + 1 })}>{n + 1}</span>}
              {part.heading && <h3 className="reading-heading">{part.heading}</h3>}
              {partBody(part)}
            </section>
          ))}
        </>
      )}
    </article>
  );
}
