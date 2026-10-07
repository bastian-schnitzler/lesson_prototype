import { useI18n } from '../app/context.tsx';
import type { RendererProps } from './controls.tsx';

/** Grammar presentation renderers; scored grammar items use the shared `UnitsRenderer`. */

export function ExplanationRenderer({ item, plan, motherTongue }: RendererProps) {
  const { locale, t } = useI18n();
  if (item.type !== 'grammar_explanation') return null;
  return (
    <>
      <h3>{item.heading[locale]}</h3>
      <p className="explanation-text">{item.text[locale]}</p>
      {item.formTable.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('session.subject')}</th>
                <th scope="col">{t('session.form')}</th>
                <th scope="col">{t('brief.col.example')}</th>
              </tr>
            </thead>
            <tbody lang={plan.lang}>
              {item.formTable.map((row, n) => (
                <tr key={n}>
                  <th scope="row">{row.subject}</th>
                  <td>{row.form}</td>
                  <td>{row.example ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ul className="brief-list examples">
        {item.examples.map((ex, n) => (
          <li key={n}>
            <strong lang={plan.lang}>{ex.text}</strong> <span className="muted">– {ex.translation[motherTongue]}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PlaceholderRenderer() {
  const { t } = useI18n();
  return <p className="placeholder-feedback">{t('session.productionPlaceholder')}</p>;
}

