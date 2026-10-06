import { describe, expect, it } from 'vitest';

import { translate } from '../../src/app/context.tsx';
import { MESSAGES, THEME_LABELS, TOPIC_LABELS } from '../../src/i18n/messages.ts';
import { LOCALES, THEMES, TOPICS } from '../../src/schemas/common.ts';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('UI message catalog', () => {
  const keys = Object.keys(MESSAGES.en).sort();

  it.each(LOCALES)('%s has every key with a nonempty value and the same placeholders', (locale) => {
    expect(Object.keys(MESSAGES[locale]).sort()).toEqual(keys);
    for (const key of keys) {
      const value = MESSAGES[locale][key as keyof (typeof MESSAGES)['en']];
      expect(value.trim(), `${locale}:${key}`).not.toBe('');
      expect(placeholders(value), `${locale}:${key}`).toEqual(placeholders(MESSAGES.en[key as keyof (typeof MESSAGES)['en']]));
    }
  });

  it.each(LOCALES)('%s labels every topic and theme', (locale) => {
    expect(Object.keys(TOPIC_LABELS[locale]).sort()).toEqual([...TOPICS].sort());
    expect(Object.keys(THEME_LABELS[locale]).sort()).toEqual([...THEMES].sort());
  });

  it('interpolates parameters and leaves unknown ones visible', () => {
    expect(translate('en', 'detail.lessonNumber', { number: 4 })).toBe('Lesson 4');
    expect(translate('de', 'detail.lessonNumber')).toBe('Lektion {number}');
  });
});
