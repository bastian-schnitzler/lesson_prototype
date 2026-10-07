import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RichText } from '../../src/components/RichText.tsx';
import { learningForms, parseRichText, richTextShape } from '../../src/domain/richText.ts';

afterEach(cleanup);

describe('restricted Markdown (D46)', () => {
  it('parses paragraphs, bulleted and numbered lists, bold and learning-language forms', () => {
    const { blocks, errors } = parseRichText('Learn **these** forms:\n\n- `je suis` – I am\n- `tu es` – you are\n\n1. first\n2. second\n\nA line\nbreak joins.');
    expect(errors).toEqual([]);
    expect(richTextShape(blocks)).toBe('p|ul:2|ol:2|p');
    expect(learningForms(blocks)).toEqual(['je suis', 'tu es']);
    expect(blocks[0]).toEqual({ kind: 'paragraph', inlines: [{ kind: 'text', text: 'Learn ' }, { kind: 'strong', text: 'these' }, { kind: 'text', text: ' forms:' }] });
    expect(blocks[3]).toEqual({ kind: 'paragraph', inlines: [{ kind: 'text', text: 'A line break joins.' }] });
  });

  it.each([
    ['# Heading', /headings are not allowed/],
    ['> quote', /block quotes/],
    ['| a | b |', /tables/],
    ['See [this](http://x.y)', /links or images not allowed/],
    ['<b>bold</b>', /HTML not allowed/],
    ['**unclosed', /unclosed or empty \*\*bold\*\*/],
    ['`unclosed', /unclosed or empty `learning-language form`/],
    ['**bold `fr`**', /bold text cannot contain other markup/],
    ['*italic*', /only \*\*bold\*\* and `form` markup is allowed/],
    ['Text\n- item', /separate a list from surrounding text with a blank line/],
    ['* star list', /lists other than/],
    ['literal \\n inside', /literal "\\n"/],
  ])('rejects %j', (source, message) => {
    expect(parseRichText(source).errors.join('\n')).toMatch(message);
  });

  it('accepts plain text as one paragraph', () => {
    expect(parseRichText('Just one sentence, with l\'apostrophe and – dash.')).toMatchObject({ errors: [], blocks: [{ kind: 'paragraph' }] });
  });

  it('renders semantic elements with lang on learning-language forms and never interprets HTML', () => {
    const { container } = render(<RichText text={'Say **this**:\n\n- `un livre`\n- `<script>alert(1)</script>`'} lang="fr" />);
    expect(container.querySelector('strong')).toHaveTextContent('this');
    const forms = container.querySelectorAll('ul > li > .learning-form');
    expect([...forms].map((f) => [f.textContent, f.getAttribute('lang')])).toEqual([['un livre', 'fr'], ['<script>alert(1)</script>', 'fr']]);
    expect(container.querySelector('script')).toBeNull();
  });
});
