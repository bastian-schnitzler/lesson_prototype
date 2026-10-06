import { describe, expect, it } from 'vitest';

import {
  artifactState,
  filterRows,
  initialSelection,
  levelsFor,
  readiness,
  selectLanguage,
} from '../../src/domain/courses.ts';
import { formatScore, roundHalfUp1 } from '../../src/domain/format.ts';
import { childPath, defaultExpanded, ROOT_PATH, visibleNodes } from '../../src/domain/jsonTree.ts';
import { DEFAULT_PREFERENCES, loadPreferences, PREFERENCES_KEY, resolveMotherTongue, savePreferences } from '../../src/domain/preferences.ts';
import type { LessonKind, Level } from '../../src/schemas/common.ts';
import type { Manifest } from '../../src/schemas/manifest.ts';
import type { OutlineEntry } from '../../src/schemas/outline.ts';

const manifest = (courses: [string, Level][]): Manifest => ({
  schemaVersion: 1,
  artifacts: {},
  courses: courses.map(([lang, level]) => ({
    key: `${lang}-${level.toLowerCase()}`,
    lang,
    level,
    outlineUrl: `content/outlines/${lang}-${level.toLowerCase()}.json`,
    sourceHash: 'h',
    lessonIds: [],
  })),
});

describe('course selection', () => {
  it('selects fr/A1 initially when available', () => {
    expect(initialSelection(manifest([['de', 'A1'], ['fr', 'B1'], ['fr', 'A1']]))).toEqual({ lang: 'fr', level: 'A1' });
  });

  it('falls back to the first language and its A1 or lowest level', () => {
    expect(initialSelection(manifest([['es', 'B2'], ['de', 'B1'], ['de', 'A2']]))).toEqual({ lang: 'de', level: 'A2' });
    expect(initialSelection(manifest([]))).toBeUndefined();
  });

  it('sorts levels in CEFR order and never invents options', () => {
    expect(levelsFor(manifest([['fr', 'C1'], ['fr', 'A2'], ['fr', 'B1'], ['de', 'A1']]), 'fr')).toEqual(['A2', 'B1', 'C1']);
  });

  it('keeps the level on a language change only when the new language has it', () => {
    const m = manifest([['fr', 'B1'], ['fr', 'A1'], ['de', 'B1'], ['es', 'A2']]);
    expect(selectLanguage(m, { lang: 'fr', level: 'B1' }, 'de')).toEqual({ lang: 'de', level: 'B1' });
    expect(selectLanguage(m, { lang: 'fr', level: 'B1' }, 'es')).toEqual({ lang: 'es', level: 'A2' });
  });
});

describe('index rows and artifacts', () => {
  const entries = (['functions', 'grammar', 'vocabulary', 'reading', 'grammar'] as LessonKind[]).map(
    (kind, i) => ({ id: `fr-x-${'abcde'[i]}`, kind }) as OutlineEntry,
  );

  it('keeps original ordinals when filtering categories', () => {
    expect(filterRows(entries, new Set<LessonKind>(['grammar'])).map((r) => r.ordinal)).toEqual([2, 5]);
    expect(filterRows(entries, new Set())).toEqual([]);
  });

  it('labels the Content button by the highest artifact present', () => {
    const file = (status: 'valid' | 'invalid' | 'stale' | 'malformed' = 'valid') => ({ url: 'u', sourceHash: 'h', status });
    expect(artifactState(undefined).label).toBe('outline');
    expect(artifactState({ outlineHash: 'h', draft: file() }).label).toBe('draft');
    expect(artifactState({ outlineHash: 'h', draft: file(), content: file() })).toEqual({ label: 'content', incomplete: false, problem: null });
    expect(artifactState({ outlineHash: 'h', content: file() })).toMatchObject({ label: 'content', incomplete: true });
    expect(artifactState({ outlineHash: 'h', draft: file('malformed') }).problem).toBe('malformed');
    expect(artifactState({ outlineHash: 'h', draft: file('stale'), content: file('invalid') }).problem).toBe('invalid');
  });

  it('allows Start only for complete, valid, playable lessons', () => {
    const file = { url: 'u', sourceHash: 'h', status: 'valid' as const };
    const complete = { outlineHash: 'h', draft: file, content: file };
    expect(readiness('grammar', undefined)).toEqual(['missingDraft', 'missingContent', 'unsupported']);
    expect(readiness('grammar', complete)).toEqual(['unsupported']);
    expect(readiness('grammar', complete, new Set<LessonKind>(['grammar']))).toEqual([]);
    expect(readiness('grammar', { ...complete, content: { ...file, status: 'malformed' } }, new Set<LessonKind>(['grammar']))).toEqual(['malformed']);
    expect(readiness('grammar', { ...complete, draft: { ...file, status: 'stale' } }, new Set<LessonKind>(['grammar']))).toEqual(['stale']);
    expect(readiness('grammar', { ...complete, draft: { ...file, status: 'invalid' } }, new Set<LessonKind>(['grammar']))).toEqual(['invalid']);
  });
});

describe('JSON tree expansion rules', () => {
  it('expands the root, containers with at most three children, and no primitives', () => {
    expect(defaultExpanded({ a: 1, b: 2, c: 3, d: 4 }, true)).toBe(true);
    expect(defaultExpanded([1, 2, 3], false)).toBe(true);
    expect(defaultExpanded([1, 2, 3, 4], false)).toBe(false);
    expect(defaultExpanded({}, false)).toBe(true);
    for (const v of [0, null, false, '', 'x']) expect(defaultExpanded(v, false)).toBe(false);
  });

  it('applies the rule recursively per node, not by descendant count', () => {
    const value = { small: { inner: [1, 2, 3, 4], leaf: 0 }, big: { a: 1, b: 2, c: 3, d: 4 } };
    const shown = visibleNodes(value, new Map()).map((n) => n.path);
    expect(shown).toEqual(['', '/small', '/small/inner', '/small/leaf', '/big']);
  });

  it('always expands an only child, even with more than three children', () => {
    const value = { outline: { a: 1, b: 2, c: 3, d: 4, e: 5 } };
    expect(visibleNodes(value, new Map()).map((n) => n.path)).toEqual(['', '/outline', '/outline/a', '/outline/b', '/outline/c', '/outline/d', '/outline/e']);
    const nested = { wrap: [{ x: 1, y: 2, z: 3, w: 4 }] };
    expect(visibleNodes(nested, new Map()).find((n) => n.path === '/wrap/0')?.expanded).toBe(true);
    expect(visibleNodes(value, new Map([['/outline', false]])).map((n) => n.path)).toEqual(['', '/outline']);
  });

  it('lets user toggles override defaults, including the root', () => {
    const value = { big: { a: 1, b: 2, c: 3, d: 4 } };
    const expanded = visibleNodes(value, new Map([[childPath(ROOT_PATH, 'big'), true]]));
    expect(expanded).toHaveLength(6);
    expect(visibleNodes(value, new Map([[ROOT_PATH, false]]))).toHaveLength(1);
  });

  it('shows a scalar root as a single leaf', () => {
    expect(visibleNodes(42, new Map())).toEqual([{ path: '', key: null, value: 42, depth: 0, parent: null, expanded: false }]);
  });

  it('escapes slashes in keys so paths stay unique', () => {
    expect(childPath('', 'a/b')).toBe('/a~1b');
  });
});

describe('preferences', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
  };

  it('defaults to en/en and round-trips through storage', () => {
    const s = memory();
    expect(loadPreferences(s)).toEqual(DEFAULT_PREFERENCES);
    expect(savePreferences({ motherTongue: 'de', interfaceLanguage: 'fr' }, s)).toBe(true);
    expect(loadPreferences(s)).toEqual({ motherTongue: 'de', interfaceLanguage: 'fr' });
  });

  it('falls back to en/en when storage is corrupt, invalid or throws', () => {
    const s = memory();
    s.data.set(PREFERENCES_KEY, '{"motherTongue":"xx","interfaceLanguage":"fr"}');
    expect(loadPreferences(s)).toEqual(DEFAULT_PREFERENCES);
    s.data.set(PREFERENCES_KEY, 'nope');
    expect(loadPreferences(s)).toEqual(DEFAULT_PREFERENCES);
    const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadPreferences(throwing)).toEqual(DEFAULT_PREFERENCES);
    expect(savePreferences(DEFAULT_PREFERENCES, throwing)).toBe(false);
    expect(loadPreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it('replaces a mother tongue equal to the course language with the next option in en, fr, de order', () => {
    expect(resolveMotherTongue('fr', 'fr')).toBe('en');
    expect(resolveMotherTongue('en', 'en')).toBe('fr');
    expect(resolveMotherTongue('de', 'fr')).toBe('de');
    expect(resolveMotherTongue('en', 'es')).toBe('en');
  });
});

describe('score formatting', () => {
  it('rounds half up to one decimal and shows a real zero', () => {
    expect(roundHalfUp1(78.25)).toBe(78.3);
    expect(roundHalfUp1(69.583)).toBe(69.6);
    expect(formatScore(0, 'en')).toBe('0.0%');
    expect(formatScore(76.5, 'de')).toBe('76,5%');
  });
});
