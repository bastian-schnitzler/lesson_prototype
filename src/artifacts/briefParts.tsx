import type { ReactNode } from 'react';

import { useI18n, usePreferences, type I18n } from '../app/context.tsx';
import type { LocalizedText } from '../schemas/artifactCommon.ts';
import { nativeLocales } from '../schemas/artifactCommon.ts';
import type { Locale } from '../schemas/common.ts';

/** Text helpers for Draft views: support text in the interface language, translations in the mother tongue. */
export interface BriefText extends I18n {
  nativeLocale: Locale;
  ui: (text: LocalizedText) => string;
  native: <T>(map: Partial<Record<Locale, T>>) => T | undefined;
  duration: (seconds: number) => string;
}

export function useBriefText(lang: string): BriefText {
  const i18n = useI18n();
  const { motherTongue } = usePreferences();
  // Artifact pages use the starting-page choice; a mother tongue equal to the course language is never offered (D38).
  const available = nativeLocales(lang);
  const nativeLocale = available.includes(motherTongue) ? motherTongue : available[0];
  return {
    ...i18n,
    nativeLocale,
    ui: (text) => text[i18n.locale],
    native: (map) => map[nativeLocale],
    duration: (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      if (!m) return i18n.t('unit.seconds', { n: s });
      return s ? i18n.t('unit.minutesSeconds', { m, s }) : i18n.t('unit.minutes', { n: m });
    },
  };
}

/** Muted one-line facts under the Draft heading, separated like the mockups. */
export function SummaryLine({ items }: { items: string[] }) {
  return <p className="brief-summary">{items.join('   /   ')}</p>;
}

export function BriefBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="brief-block">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Learning-language text, marked so screen readers and fonts use the course language. */
export function Learn({ lang, children }: { lang: string; children: ReactNode }) {
  return <span lang={lang}>{children}</span>;
}

export function TextList({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return empty ? <p className="muted">{empty}</p> : null;
  return (
    <ul className="brief-list">
      {items.map((item, n) => (
        <li key={n}>{item}</li>
      ))}
    </ul>
  );
}

export function ScoringNote({ scoring }: { scoring: { practiceWeight: number; examWeight: number; orthographyCredit: number } }) {
  const { t } = useI18n();
  return (
    <p className="muted">
      {t('brief.scoring', { practice: scoring.practiceWeight, exam: scoring.examWeight, credit: Math.round(scoring.orthographyCredit * 100) })}
    </p>
  );
}
