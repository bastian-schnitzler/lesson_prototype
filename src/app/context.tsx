import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { loadPreferences, savePreferences, type Preferences } from '../domain/preferences.ts';
import { LANGUAGE_NAMES, MESSAGES, THEME_LABELS, TOPIC_LABELS, type MessageKey } from '../i18n/messages.ts';
import type { Locale, Theme, Topic } from '../schemas/common.ts';

/* ---------------------------------------------------------------- prefs */

interface PreferencesValue extends Preferences {
  setMotherTongue: (l: Locale) => void;
  setInterfaceLanguage: (l: Locale) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children, initial }: { children: ReactNode; initial?: Preferences }) {
  const [prefs, setPrefs] = useState<Preferences>(() => initial ?? loadPreferences());

  useEffect(() => {
    savePreferences(prefs);
    document.documentElement.lang = prefs.interfaceLanguage;
  }, [prefs]);

  const value = useMemo<PreferencesValue>(
    () => ({
      ...prefs,
      setMotherTongue: (motherTongue) => setPrefs((p) => (p.motherTongue === motherTongue ? p : { ...p, motherTongue })),
      setInterfaceLanguage: (interfaceLanguage) => setPrefs((p) => ({ ...p, interfaceLanguage })),
    }),
    [prefs],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences outside PreferencesProvider');
  return value;
}

/* ----------------------------------------------------------------- i18n */

export type TranslateParams = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const template = MESSAGES[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export interface I18n {
  locale: Locale;
  t: (key: MessageKey, params?: TranslateParams) => string;
  topic: (t: Topic) => string;
  theme: (t: Theme) => string;
  languageName: (code: string) => string;
}

export function useI18n(): I18n {
  const { interfaceLanguage: locale } = usePreferences();
  return useMemo(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      topic: (t) => TOPIC_LABELS[locale][t],
      theme: (t) => THEME_LABELS[locale][t],
      languageName: (code) => LANGUAGE_NAMES[locale][code] ?? code.toUpperCase(),
    }),
    [locale],
  );
}

/* --------------------------------------------------------------- last try */

interface LastTryValue {
  /** Weighted total (0–100) of the latest completed attempt in this page load. */
  scores: ReadonlyMap<string, number>;
  recordCompletion: (lessonId: string, score: number) => void;
}

const LastTryContext = createContext<LastTryValue | null>(null);

/**
 * In-memory only (D11): never written to or read from browser storage, so a
 * full reload clears it.
 */
export function LastTryProvider({ children }: { children: ReactNode }) {
  const [scores, setScores] = useState<ReadonlyMap<string, number>>(() => new Map());
  const recordCompletion = useCallback((lessonId: string, score: number) => {
    setScores((prev) => new Map(prev).set(lessonId, score));
  }, []);
  const value = useMemo(() => ({ scores, recordCompletion }), [scores, recordCompletion]);
  return <LastTryContext.Provider value={value}>{children}</LastTryContext.Provider>;
}

export function useLastTry(): LastTryValue {
  const value = useContext(LastTryContext);
  if (!value) throw new Error('useLastTry outside LastTryProvider');
  return value;
}
