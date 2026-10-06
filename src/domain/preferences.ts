import { z } from 'zod';

import { LOCALES, LocaleSchema, type Locale } from '../schemas/common.ts';

export interface Preferences {
  motherTongue: Locale;
  interfaceLanguage: Locale;
}

export const DEFAULT_PREFERENCES: Preferences = { motherTongue: 'en', interfaceLanguage: 'en' };

/** Browser-storage key for the persisted preferences (D45). */
export const PREFERENCES_KEY = 'lessonPrototype.preferences.v1';

const StoredPreferencesSchema = z.object({ motherTongue: LocaleSchema, interfaceLanguage: LocaleSchema });

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Stored preferences, or en/en on a first visit or when storage is unavailable or corrupt. */
export function loadPreferences(storage: StorageLike | undefined = defaultStorage()): Preferences {
  try {
    const raw = storage?.getItem(PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = StoredPreferencesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/** Returns false when the preferences could not be stored. */
export function savePreferences(prefs: Preferences, storage: StorageLike | undefined = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

/** A mother tongue may not equal the course language (D38). */
export function isMotherTongueAllowed(locale: Locale, courseLang: string | undefined): boolean {
  return locale !== courseLang;
}

/**
 * Keeps the mother tongue unless it equals the course language; then picks the
 * first other option in en, fr, de order.
 */
export function resolveMotherTongue(current: Locale, courseLang: string | undefined): Locale {
  if (isMotherTongueAllowed(current, courseLang)) return current;
  return LOCALES.find((l) => l !== courseLang) ?? current;
}
