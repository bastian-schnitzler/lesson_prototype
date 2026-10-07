import { parseRichText, type Inline } from '../domain/richText.ts';

function Inlines({ inlines, lang }: { inlines: Inline[]; lang: string }) {
  return (
    <>
      {inlines.map((inline, n) =>
        inline.kind === 'strong' ? <strong key={n}>{inline.text}</strong>
          : inline.kind === 'learning' ? <span key={n} className="learning-form" lang={lang}>{inline.text}</span>
          : <span key={n}>{inline.text}</span>,
      )}
    </>
  );
}

/**
 * Renders validated restricted Markdown (D46) as semantic React elements, never as HTML.
 * Learning-language forms carry the course language for screen readers, fonts and highlighting.
 */
export function RichText({ text, lang, className = 'rich-text' }: { text: string; lang: string; className?: string }) {
  const { blocks } = parseRichText(text);
  return (
    <div className={className}>
      {blocks.map((block, n) =>
        block.kind === 'paragraph' ? <p key={n}><Inlines inlines={block.inlines} lang={lang} /></p>
          : block.ordered ? <ol key={n}>{block.items.map((item, m) => <li key={m}><Inlines inlines={item} lang={lang} /></li>)}</ol>
          : <ul key={n}>{block.items.map((item, m) => <li key={m}><Inlines inlines={item} lang={lang} /></li>)}</ul>,
      )}
    </div>
  );
}
