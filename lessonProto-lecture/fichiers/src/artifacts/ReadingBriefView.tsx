import type { Level } from '../schemas/common.ts';
import { examWordRange, READING_WORDS, type ReadingBrief } from '../schemas/reading.ts';
import { BriefBlock, Learn, ScoringNote, SummaryLine, TextList, useBriefText } from './briefParts.tsx';
import type { ArtifactViewProps } from './registry.ts';

/** Draft view of a validated reading brief: key words, documents, lesson plan and exam plan. */
export function ReadingBriefView({ data }: ArtifactViewProps) {
  const brief = data as ReadingBrief;
  const text = useBriefText(brief.lang);
  const { t, ui, native, duration } = text;
  const level = brief.level as Level;
  const { keywords, skim, detail, structure } = brief.stages;
  const genre = t(`genre.${brief.genre}`);
  const stages = [
    { key: 'keywords', activity: t('activity.reading.keywords', { count: brief.keywords.length }), seconds: keywords.estimatedDurationS },
    { key: 'skim', activity: t('activity.reading.skim', { seconds: skim.skimSeconds }), seconds: skim.estimatedDurationS },
    { key: 'detail', activity: t('activity.reading.detail', { count: detail.questions.length }), seconds: detail.estimatedDurationS },
    { key: 'structure', activity: t(`activity.reading.${structure.task}`, { count: brief.documents.main.partCount }), seconds: structure.estimatedDurationS },
  ] as const;
  const documents = [
    { key: 'main', title: t('reading.documentMain'), plan: brief.documents.main, range: READING_WORDS[level] },
    { key: 'exam', title: t('reading.documentExam'), plan: brief.documents.exam, range: examWordRange(level) },
  ];
  const examItems = brief.exam.pages.reduce((n, pg) => n + pg.itemCount, 0);

  return (
    <div className="brief">
      <SummaryLine
        items={[
          t('brief.summary.keywords', { count: brief.keywords.length }),
          t('brief.summary.genre', { genre }),
          t('brief.summary.minutes', { minutes: brief.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(brief.objective)}</p>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={t('brief.situation')}>
          <p>{ui(brief.situation)}</p>
        </BriefBlock>
        <BriefBlock title={t('brief.readerTask')}>
          <p>{ui(brief.readerTask)}</p>
        </BriefBlock>
      </div>
      <div className="brief-columns">
        <BriefBlock title={t('brief.prerequisites')}>
          <TextList items={brief.prerequisites.map(ui)} empty={t('brief.none')} />
        </BriefBlock>
        <BriefBlock title={t('brief.coverage')}>
          <p>{ui(brief.coverageNotes)}</p>
        </BriefBlock>
      </div>

      <BriefBlock title={t('brief.keywords')}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.keyword')}</th>
                <th scope="col">{t('brief.col.translation', { locale: t(`locale.${text.nativeLocale}`) })}</th>
                <th scope="col">{t('brief.col.explanation')}</th>
              </tr>
            </thead>
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

      <BriefBlock title={t('brief.documents')}>
        <div className="brief-columns">
          {documents.map((d) => (
            <section key={d.key}>
              <h4>{d.title}</h4>
              <p className="muted">{genre} · {t('brief.documentSize', { words: d.plan.targetWords, min: d.range[0], max: d.range[1], parts: d.plan.partCount })}</p>
              <p>{ui(d.plan.contents)}</p>
            </section>
          ))}
        </div>
      </BriefBlock>

      <BriefBlock title={t('brief.plan')}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.stage')}</th>
                <th scope="col">{t('brief.col.activity')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.assessment')}</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, n) => (
                <tr key={s.key}>
                  <th scope="row"><span className="step-number">{String(n + 1).padStart(2, '0')}</span> {t(`stage.${s.key}`)}</th>
                  <td>{s.activity}</td>
                  <td>{duration(s.seconds)}</td>
                  <td>{t('assessment.practice')}</td>
                </tr>
              ))}
              <tr>
                <th scope="row"><span className="step-number">{String(stages.length + 1).padStart(2, '0')}</span> {t('stage.exam')}</th>
                <td>{t('activity.reading.exam', { genre, count: examItems, pages: brief.exam.pages.length })}</td>
                <td>{duration(brief.exam.pages.reduce((n, pg) => n + pg.estimatedDurationS, 0))}</td>
                <td>{t('assessment.exam')}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted">{t('brief.skimFocus', { focus: t(`skimFocus.${skim.focus}`), seconds: skim.skimSeconds })}</p>
      </BriefBlock>

      <BriefBlock title={t('brief.detailQuestions')}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.question')}</th>
                <th scope="col">{t('brief.col.task')}</th>
                <th scope="col">{t('brief.col.focus')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.questions.map((q, n) => (
                <tr key={q.id}>
                  <th scope="row">{n + 1}</th>
                  <td>{t(`exercise.${q.type}`)}</td>
                  <td>{ui(q.focus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BriefBlock>

      <BriefBlock title={t('brief.examPlan')}>
        <p className="muted">{t('brief.examPlanNote')}</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.page')}</th>
                <th scope="col">{t('brief.col.task')}</th>
                <th scope="col">{t('brief.col.items')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.timeLimit')}</th>
              </tr>
            </thead>
            <tbody>
              {brief.exam.pages.map((pg, n) => (
                <tr key={pg.pageId}>
                  <th scope="row">{n + 1}</th>
                  <td>{pg.types.map((type) => t(`exercise.${type}`)).join(', ')}</td>
                  <td>{pg.itemCount}</td>
                  <td>{duration(pg.estimatedDurationS)}</td>
                  <td>{duration(pg.timeLimitS)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScoringNote scoring={brief.scoring} />
      </BriefBlock>
    </div>
  );
}
