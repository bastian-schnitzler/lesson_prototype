import { READING_WORDS, type ReadingBrief } from '../schemas/reading.ts';
import type { Level } from '../schemas/common.ts';
import { BriefBlock, Learn, ScoringNote, SummaryLine, useBriefText } from './briefParts.tsx';
import type { ArtifactViewProps } from './registry.ts';

const COPY = {
  en: { keywords: 'Key words', count: '{n} key words', genre: 'Genre', situation: 'Situation', task: 'What the learner looks for', keyword: 'Key word', explanation: 'Explanation', documents: 'Documents', main: 'Main document', exam: 'Exam document', words: '{n} words (allowed {min}–{max})', questions: 'Questions', skim: 'Skim', detail: 'Detail', examQuestions: '5 questions: {types}', focus: { genre: 'what kind of document it is', author: 'who wrote it', purpose: 'why it was written' }, type: { reading_choice: 'multiple choice', reading_true_false: 'true / false' } },
  fr: { keywords: 'Mots clés', count: '{n} mots clés', genre: 'Genre', situation: 'Situation', task: 'Ce que l’apprenant cherche', keyword: 'Mot clé', explanation: 'Explication', documents: 'Documents', main: 'Document principal', exam: 'Document d’examen', words: '{n} mots (autorisés : {min}–{max})', questions: 'Questions', skim: 'Survol', detail: 'Détails', examQuestions: '5 questions : {types}', focus: { genre: 'le type de document', author: 'qui l’a écrit', purpose: 'pourquoi il a été écrit' }, type: { reading_choice: 'choix multiple', reading_true_false: 'vrai / faux' } },
  de: { keywords: 'Schlüsselwörter', count: '{n} Schlüsselwörter', genre: 'Textsorte', situation: 'Situation', task: 'Was die Lernenden suchen', keyword: 'Schlüsselwort', explanation: 'Erläuterung', documents: 'Dokumente', main: 'Hauptdokument', exam: 'Prüfungsdokument', words: '{n} Wörter (erlaubt {min}–{max})', questions: 'Fragen', skim: 'Überfliegen', detail: 'Details', examQuestions: '5 Fragen: {types}', focus: { genre: 'welche Art Dokument es ist', author: 'wer es geschrieben hat', purpose: 'warum es geschrieben wurde' }, type: { reading_choice: 'Multiple Choice', reading_true_false: 'richtig / falsch' } },
};

const fill = (s: string, values: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));

/** Draft view of a validated reading brief (SPEC section 9, D54). */
export function ReadingBriefView({ data }: ArtifactViewProps) {
  const brief = data as ReadingBrief;
  const text = useBriefText(brief.lang);
  const { t, ui, native } = text;
  const copy = COPY[text.locale];
  const range = READING_WORDS[brief.level as Level];
  const genre = brief.genre.replace(/_/g, ' ');

  return (
    <div className="brief">
      <SummaryLine
        items={[
          fill(copy.count, { n: brief.keywords.length }),
          `${copy.genre}: ${genre}`,
          t('brief.summary.minutes', { minutes: brief.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(brief.objective)}</p>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={copy.situation}><p>{ui(brief.situation)}</p></BriefBlock>
        <BriefBlock title={copy.task}><p>{ui(brief.readerTask)}</p></BriefBlock>
      </div>

      <BriefBlock title={`${copy.keywords} (${brief.keywords.length})`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th scope="col">{copy.keyword}</th><th scope="col">{t('brief.col.translation', { locale: t(`locale.${text.nativeLocale}`) })}</th><th scope="col">{copy.explanation}</th></tr></thead>
            <tbody>
              {brief.keywords.map((k) => (
                <tr key={k.id}>
                  <th scope="row"><Learn lang={brief.lang}>{k.term}</Learn></th>
                  <td lang={text.nativeLocale}>{native(k.translations)?.join(' / ')}</td>
                  <td>{ui(k.explanation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BriefBlock>

      <BriefBlock title={copy.documents}>
        <div className="brief-columns">
          {(['main', 'exam'] as const).map((id) => (
            <section key={id}>
              <h4>{copy[id]} <small className="muted">{fill(copy.words, { n: brief.documents[id].targetWords, min: range[id][0], max: range[id][1] })}</small></h4>
              <p>{ui(brief.documents[id].contents)}</p>
            </section>
          ))}
        </div>
      </BriefBlock>

      <BriefBlock title={copy.questions}>
        <div className="table-wrap">
          <table className="data-table">
            <tbody>
              <tr><th scope="row">{copy.skim}</th><td>{copy.focus[brief.skim.focus]}</td></tr>
              {brief.detailQuestions.map((q, n) => (
                <tr key={q.id}><th scope="row">{n === 0 ? copy.detail : ''}</th><td>{ui(q.focus)} <span className="muted">({copy.type[q.type]})</span></td></tr>
              ))}
              <tr><th scope="row">{t('stage.exam')}</th><td>{fill(copy.examQuestions, { types: brief.exam.types.map((type) => copy.type[type]).join(', ') })}</td></tr>
            </tbody>
          </table>
        </div>
        <ScoringNote scoring={brief.scoring} />
      </BriefBlock>
    </div>
  );
}
