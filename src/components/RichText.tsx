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
export function RichText({ text, lang, className = 'rich-text', cards = false }: { text: string; lang: string; className?: string; cards?: boolean }) {
  const { blocks } = parseRichText(text);
  return (
    <div className={className}>
      {blocks.map((block, n) => {
        if (cards && block.kind === 'paragraph') {
          // A run of "A /a/, B /be/, …" (an alphabet) becomes tiles: the letter large, its pronunciation small.
          const plain = block.inlines.map((i) => i.text).join('');
          const pairs = [...plain.matchAll(/([A-Z]) \/([^/]+)\//g)];
          if (pairs.length >= 8) {
            const lead = plain.slice(0, pairs[0].index).replace(/[:\s]+$/, '');
            return (
              <div key={n}>
                {lead && <p className="rt-lead">{lead}</p>}
                <ul className="letter-grid" lang={lang}>{pairs.map((m) => <li key={m[1]}><strong>{m[1]}</strong><small>/{m[2]}/</small></li>)}</ul>
              </div>
            );
          }
        }
        if (block.kind === 'paragraph') return <p key={n} className={cards && n === 0 ? 'rt-lead' : undefined}><Inlines inlines={block.inlines} lang={lang} /></p>;
        if (block.ordered) return <ol key={n}>{block.items.map((item, m) => <li key={m}><Inlines inlines={item} lang={lang} /></li>)}</ol>;
        // Visual mode (P6 review): every item that holds a learning-language form becomes a card, the form large on top
        // and the sentence about it below, so introductions read as things to learn rather than as running text.
        if (cards && block.items.every((item) => item.some((i) => i.kind === 'learning'))) {
          return (
            <ul key={n} className="form-cards">
              {block.items.map((item, m) => {
                const at = item.findIndex((i) => i.kind === 'learning');
                const leading = at === 0;
                const rest = leading ? item.slice(1).map((x, k) => (k === 0 && x.kind === 'text' ? { ...x, text: x.text.replace(/^\s*[–—-]\s*/, '') } : x)) : item;
                return (
                  <li key={m}>
                    <span className="chip learning-chip learning-form" lang={lang}>{item[at].text}</span>
                    <span className="form-note"><Inlines inlines={rest} lang={lang} /></span>
                  </li>
                );
              })}
            </ul>
          );
        }
        return <ul key={n}>{block.items.map((item, m) => <li key={m}><Inlines inlines={item} lang={lang} /></li>)}</ul>;
      })}
    </div>
  );
}
