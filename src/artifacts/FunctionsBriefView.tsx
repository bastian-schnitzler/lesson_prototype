import { expressionDisplay } from '../domain/functionsLesson.ts';
import type { FunctionsBrief } from '../schemas/functions.ts';
import { BriefBlock, Learn, ScoringNote, SummaryLine, TextList, useBriefText } from './briefParts.tsx';
import type { ArtifactViewProps } from './registry.ts';

const COPY = {
  en: { expressions: 'Expressions', words: 'Words', count: '{e} expressions · {w} words', situation: 'Situation', roles: 'Roles', coverage: 'Outline coverage', expression: 'Expression', word: 'Word', explanation: 'Explanation', example: 'Example sentence', noWords: 'No additional words.' },
  fr: { expressions: 'Expressions', words: 'Mots', count: '{e} expressions · {w} mots', situation: 'Situation', roles: 'Rôles', coverage: 'Couverture du plan', expression: 'Expression', word: 'Mot', explanation: 'Explication', example: 'Phrase d’exemple', noWords: 'Pas de mots supplémentaires.' },
  de: { expressions: 'Ausdrücke', words: 'Wörter', count: '{e} Ausdrücke · {w} Wörter', situation: 'Situation', roles: 'Rollen', coverage: 'Abdeckung der Gliederung', expression: 'Ausdruck', word: 'Wort', explanation: 'Erläuterung', example: 'Beispielsatz', noWords: 'Keine zusätzlichen Wörter.' },
};

/** Draft view of a validated function brief (SPEC section 8, D51). */
export function FunctionsBriefView({ data }: ArtifactViewProps) {
  const brief = data as FunctionsBrief;
  const text = useBriefText(brief.lang);
  const { t, ui, native } = text;
  const copy = COPY[text.locale];
  const learn = (s: string) => <Learn lang={brief.lang}>{s}</Learn>;
  const translation = t('brief.col.translation', { locale: t(`locale.${text.nativeLocale}`) });

  return (
    <div className="brief">
      <SummaryLine
        items={[
          copy.count.replace('{e}', String(brief.expressions.length)).replace('{w}', String(brief.words.length)),
          t('brief.summary.minutes', { minutes: brief.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(brief.objective)}</p>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={copy.situation}>
          <p>{ui(brief.situation)}</p>
          <h5>{copy.roles}</h5>
          <ul className="brief-list">{brief.roles.map((r) => <li key={r.id}>{learn(r.label)} <span className="muted">– {native(r.translation)}</span></li>)}</ul>
        </BriefBlock>
        <BriefBlock title={t('brief.prerequisites')}>
          <TextList items={brief.prerequisites.map(ui)} empty={t('brief.none')} />
        </BriefBlock>
      </div>
      <BriefBlock title={copy.coverage}>
        <p>{ui(brief.coverageNotes)}</p>
      </BriefBlock>

      <BriefBlock title={`${copy.expressions} (${brief.expressions.length})`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th scope="col">{copy.expression}</th><th scope="col">{translation}</th><th scope="col">{copy.explanation}</th><th scope="col">{copy.example}</th></tr></thead>
            <tbody>
              {brief.expressions.map((e) => (
                <tr key={e.id}>
                  <th scope="row">{learn(expressionDisplay(e))}</th>
                  <td lang={text.nativeLocale}>{native(e.translations)?.join(' / ')}</td>
                  <td>{ui(e.explanation)}</td>
                  <td>{learn(e.example.text)}<br /><small className="muted" lang={text.nativeLocale}>{native(e.example.translation)}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BriefBlock>

      <BriefBlock title={`${copy.words} (${brief.words.length})`}>
        {brief.words.length === 0 ? <p className="muted">{copy.noWords}</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">{copy.word}</th><th scope="col">{translation}</th><th scope="col">{t('brief.col.gender')}</th><th scope="col">{copy.explanation}</th><th scope="col">{copy.example}</th></tr></thead>
              <tbody>
                {brief.words.map((w) => (
                  <tr key={w.id}>
                    <th scope="row">{learn(w.teachingForm)}</th>
                    <td lang={text.nativeLocale}>{native(w.translations)?.join(' / ')}</td>
                    <td>{w.genders.map((g) => t(`gender.${g}`)).join(' / ')}</td>
                    <td>{ui(w.explanation)}</td>
                    <td>{learn(w.example.text)}<br /><small className="muted" lang={text.nativeLocale}>{native(w.example.translation)}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ScoringNote scoring={brief.scoring} />
      </BriefBlock>
    </div>
  );
}
