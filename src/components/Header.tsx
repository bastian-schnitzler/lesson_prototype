import { useId, type ReactNode } from 'react';

import { useI18n, usePreferences } from '../app/context.tsx';
import { isMotherTongueAllowed } from '../domain/preferences.ts';
import { LOCALES, type Locale } from '../schemas/common.ts';

/** Interface-language combobox order as agreed in D4. */
const INTERFACE_ORDER: readonly Locale[] = ['fr', 'en', 'de'];

interface HeaderProps {
  /** Mother tongue is editable only on the starting page (D37). */
  motherTongueEditable: boolean;
  /** Learning language of the relevant course; that mother-tongue option is disabled (D38). */
  courseLang?: string;
  /** Shown for the mother tongue instead of the current preference (e.g. a session's recorded value). */
  motherTongueOverride?: Locale;
  /** Polite live announcement, e.g. an automatic mother-tongue change. */
  announcement?: string;
  title?: ReactNode;
  actions?: ReactNode;
}

export function Header({ motherTongueEditable, courseLang, motherTongueOverride, announcement, title, actions }: HeaderProps) {
  const { t } = useI18n();
  const prefs = usePreferences();
  const motherTongue = motherTongueOverride ?? prefs.motherTongue;
  const lockedHintId = useId();
  const sameHintId = useId();
  const interfaceId = useId();

  return (
    <header className="app-header">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // Hash routing owns the URL fragment, so move focus without navigating.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t('app.skipToContent')}
      </a>
      <div className="header-inner">
        <div className="prefs">
          <fieldset className="segmented" disabled={!motherTongueEditable} aria-describedby={motherTongueEditable ? undefined : lockedHintId}>
            <legend className="label-muted">{t('prefs.motherTongue')}</legend>
            {LOCALES.map((locale) => {
              const allowed = isMotherTongueAllowed(locale, courseLang);
              return (
                <label key={locale} className="segment" title={allowed ? t(`locale.${locale}`) : t('prefs.sameAsCourse', { locale: t(`locale.${locale}`) })}>
                  <input
                    type="radio"
                    name="mother-tongue"
                    value={locale}
                    checked={motherTongue === locale}
                    disabled={!allowed}
                    aria-describedby={allowed ? undefined : sameHintId}
                    onChange={() => prefs.setMotherTongue(locale)}
                  />
                  <span lang={locale}>{locale}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="select-field">
            <label className="label-muted" htmlFor={interfaceId}>
              {t('prefs.interfaceLanguage')}
            </label>
            <select id={interfaceId} value={prefs.interfaceLanguage} onChange={(e) => prefs.setInterfaceLanguage(e.target.value as Locale)}>
              {INTERFACE_ORDER.map((locale) => (
                <option key={locale} value={locale} lang={locale}>
                  {locale}
                </option>
              ))}
            </select>
          </div>
          {!motherTongueEditable && (
            <p id={lockedHintId} className="visually-hidden">
              {t('prefs.motherTongueLocked')}
            </p>
          )}
          {courseLang && (LOCALES as readonly string[]).includes(courseLang) && (
            <p id={sameHintId} className="visually-hidden">
              {t('prefs.sameAsCourse', { locale: t(`locale.${courseLang as Locale}`) })}
            </p>
          )}
        </div>
        <div className="header-bar">
          <div className="header-title">{title}</div>
          <nav className="header-actions">{actions}</nav>
        </div>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </header>
  );
}
