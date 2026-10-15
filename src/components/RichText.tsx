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
export function RichText({ text, lang, className = 'rich-text', cards = false, tipLabel }: { text: string; lang: string; className?: string; cards?: boolean; tipLabel?: string }) {
  const { blocks } = parseRichText(text);
  // Visual mode with a tip label (feedback #14): the paragraphs after the last list form one "Good to know" box.
  const lastList = blocks.findLastIndex((block) => block.kind !== 'paragraph');
  const tipFrom = cards && tipLabel && lastList >= 0 && lastList < blocks.length - 1 ? lastList + 1 : blocks.length;
  return (
    <div className={className}>
      {blocks.slice(0, tipFrom).map((block, n) => {
        if (block.kind === 'paragraph') return <p key={n} className={cards && n === 0 ? 'rt-lead' : undefined}><Inlines inlines={block.inlines} lang={lang} /></p>;
        if (block.ordered) return <ol key={n}>{block.items.map((item, m) => <li key={m}><Inlines inlines={item} lang={lang} /></li>)}</ol>;
        // Visual mode (feedback #14): a list whose items each hold a learning-language form becomes cards,
        // the form large on top and the sentence about it below.
        if (cards && block.items.every((item) => item.some((i) => i.kind === 'learning'))) {
          // A list of bare forms (un livre, un cahier…) has nothing to say under each form: one row of chips.
          if (block.items.every((item) => item.every((i) => i.kind === 'learning' || !/[\p{L}\p{N}]/u.test(i.text)))) {
            return <p key={n} className="chips" lang={lang}>{block.items.map((item, m) => <span key={m} className="chip learning-form">{item.find((i) => i.kind === 'learning')!.text}</span>)}</p>;
          }
          return (
            <ul key={n} className="form-cards">
              {block.items.map((item, m) => {
                const at = item.findIndex((i) => i.kind === 'learning');
                const rest = at === 0 ? item.slice(1).map((x, k) => (k === 0 && x.kind === 'text' ? { ...x, text: x.text.replace(/^\s*[–—-]\s*/, '') } : x)) : item;
                return (
                  <li key={m}>
                    <span className="chip learning-chip learning-form" lang={lang}>{item[at].text}</span>
                    {rest.some((i) => /[\p{L}\p{N}]/u.test(i.text)) && <span className="form-note"><Inlines inlines={rest} lang={lang} /></span>}
                  </li>
                );
              })}
            </ul>
          );
        }
        return <ul key={n}>{block.items.map((item, m) => <li key={m}><Inlines inlines={item} lang={lang} /></li>)}</ul>;
      })}
      {tipFrom < blocks.length && (
        <aside className="rt-tip">
          <p className="rt-tip-label">{tipLabel}</p>
          {blocks.slice(tipFrom).map((block, n) => block.kind === 'paragraph' && <p key={n}><Inlines inlines={block.inlines} lang={lang} /></p>)}
        </aside>
      )}
    </div>
  );
}
