import type { VocabularyBrief, VocabularyTarget } from '../schemas/vocabulary.ts';
import { BriefBlock, DraftTabs, Learn, ScoringNote, SummaryLine, TextList, useBriefText, type BriefText } from './briefParts.tsx';
import type { ArtifactViewProps } from './registry.ts';
import { ContentReview } from './ContentReview.tsx';
import { VOCABULARY_TIMING, vocabularyLesson } from '../domain/vocabularyLesson.ts';

/** Draft view of a validated vocabulary brief (SPEC section 3, "Structured artifact components"). */
export function VocabularyBriefView({ data }: ArtifactViewProps) {
  const brief = data as VocabularyBrief;
  const text = useBriefText(brief.lang);
  const { t, ui, duration } = text;
  const byId = new Map(brief.targets.map((target) => [target.id, target]));
  const forms = (ids: string[]) => ids.map((id) => byId.get(id)?.teachingForm ?? id).join(', ');
  const demanding = brief.targets.filter((target) => target.difficulty === 'demanding').length;
  // Stages, durations and exam pages are derived from the brief (P2-04); every word takes part in every exercise.
  const lesson = vocabularyLesson(brief);
  const [introduction, flashcards, matching, overview, practice, listening, exam] = lesson.steps;
  const total = (pages: { estimatedDurationS: number }[]) => pages.reduce((sum, page) => sum + page.estimatedDurationS, 0);
  const hasNouns = brief.targets.some((target) => target.wordClass === 'noun');
  type Stage = 'introduction' | 'flashcards' | 'matching' | 'genderOverview' | 'typedGaps' | 'listening';
  const stages: { stage: Stage; activity: string; durationS: number; scored: boolean }[] = [
    { stage: 'introduction', activity: t('activity.introduction'), durationS: total(introduction.pages), scored: false },
    { stage: 'flashcards', activity: t('activity.flashcards', { count: brief.targets.length }), durationS: total(flashcards.pages), scored: false },
    { stage: 'matching', activity: t('activity.matching', { size: VOCABULARY_TIMING.matchingGroupSize }), durationS: total(matching.pages), scored: true },
    { stage: 'genderOverview', activity: t(hasNouns ? 'activity.genderOverview' : 'activity.overview'), durationS: total(overview.pages), scored: hasNouns },
    { stage: 'typedGaps', activity: t('activity.typedGaps', { count: brief.targets.length }), durationS: total(practice.pages), scored: true },
    { stage: 'listening', activity: t('activity.listening', { count: brief.targets.length }), durationS: total(listening.pages), scored: true },
  ];
  const examKind = (page: (typeof exam.pages)[number]) => (page.items[0]?.type === 'vocabulary_listening_dictation' ? 'listening_dictation' : 'translation');
  const examTargets = exam.pages.reduce((sum, page) => sum + page.items.length, 0);

  return (
    <div className="brief">
      <SummaryLine
        items={[
          t('brief.summary.targets', { count: brief.targetCount }),
          t('brief.summary.minutes', { minutes: brief.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(brief.objective)}</p>
        <p>{ui(brief.coverageNotes)}</p>
      </BriefBlock>
      <BriefBlock title={t('brief.prerequisites')}>
        <TextList items={brief.prerequisites.map(ui)} empty={t('brief.none')} />
      </BriefBlock>

      <BriefBlock title={t('brief.targets')}>
        <DraftTabs label={t('brief.targets')} tabs={brief.groups.map((group) => ({ id: group.id, title: ui(group.label), meta: t('brief.summary.targets', { count: group.targetIds.length }) }))}>
          {(n) => {
            const group = brief.groups[n];
            return <TargetTable caption={t('brief.group', { label: ui(group.label), count: group.targetIds.length })} targets={group.targetIds.flatMap((id) => byId.get(id) ?? [])} lang={brief.lang} text={text} />;
          }}
        </DraftTabs>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={t('brief.countRationale')}>
          <p>{ui(brief.countRationale)}</p>
        </BriefBlock>
        <BriefBlock title={t('brief.difficultyBalance')}>
          <p className="muted">{t('brief.difficultyCounts', { core: brief.targets.length - demanding, demanding })}</p>
          <p>{ui(brief.difficultyBalance)}</p>
        </BriefBlock>
      </div>

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
              {stages.map((row, n) => (
                <tr key={row.stage}>
                  <th scope="row">
                    <span className="step-number">{String(n + 1).padStart(2, '0')}</span> {t(`stage.${row.stage}`)}
                  </th>
                  <td>{row.activity}</td>
                  <td>{duration(row.durationS)}</td>
                  <td>{t(row.scored ? 'assessment.practice' : 'assessment.none')}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">
                  <span className="step-number">{String(stages.length + 1).padStart(2, '0')}</span> {t('stage.exam')}
                </th>
                <td>{t('activity.exam', { count: examTargets, pages: exam.pages.length })}</td>
                <td>{duration(total(exam.pages))}</td>
                <td>{t('assessment.exam')}</td>
              </tr>
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
                <th scope="col">{t('brief.col.covers')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.timeLimit')}</th>
              </tr>
            </thead>
            <tbody>
              {exam.pages.map((page, n) => (
                <tr key={page.pageId}>
                  <th scope="row">{n + 1}</th>
                  <td>{t(`examKind.${examKind(page)}`)}</td>
                  <td>
                    <Learn lang={brief.lang}>{forms(page.items.flatMap((item) => ('targetId' in item ? [item.targetId] : [])))}</Learn>
                  </td>
                  <td>{duration(page.estimatedDurationS)}</td>
                  <td>{duration(page.timeLimitS ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScoringNote scoring={brief.scoring} />
      </BriefBlock>

      {/* The lesson as learners see it, derived from this brief (texts, sentences, options and explanations). */}
      <BriefBlock title={t('brief.lessonPreview')}>
        <ContentReview content={lesson} brief={brief} />
      </BriefBlock>
    </div>
  );
}

interface TargetTableProps {
  caption: string;
  targets: VocabularyTarget[];
  lang: string;
  text: BriefText;
}

function TargetTable({ caption, targets, lang, text }: TargetTableProps) {
  const { t, ui, native } = text;
  return (
    <div className="table-wrap">
      <table className="data-table targets">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t('brief.col.target')}</th>
            <th scope="col">{t('brief.col.translation', { locale: t(`locale.${text.nativeLocale}`) })}</th>
            <th scope="col">{t('brief.col.wordClass')}</th>
            <th scope="col">{t('brief.col.gender')}</th>
            <th scope="col">{t('brief.col.difficulty')}</th>
            <th scope="col">{t('brief.col.details')}</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => {
            const notes = [
              target.pronunciation && t('brief.pronunciation', { value: target.pronunciation }),
              target.genderVariants.length > 0 && t('brief.genderVariants', { list: target.genderVariants.join(', ') }),
              target.articleException && t('brief.articleException', { reason: ui(target.articleException) }),
              target.ambiguityNote && t('brief.ambiguity', { note: ui(target.ambiguityNote) }),
            ].filter((note): note is string => !!note);
            return (
              <tr key={target.id}>
                <th scope="row">
                  <Learn lang={lang}>{target.teachingForm}</Learn>
                </th>
                <td>{(native(target.translations) ?? []).join(' / ')}</td>
                <td>{t(`wordClass.${target.wordClass}`)}</td>
                <td>
                  {target.genders.length
                    ? [target.genders.map((g) => t(`gender.${g}`)).join(' / '), target.number && t(`number.${target.number}`)].filter(Boolean).join(', ')
                    : '–'}
                </td>
                <td>
                  <span className={`badge difficulty-${target.difficulty}`}>{t(`difficulty.${target.difficulty}`)}</span>
                </td>
                <td className="target-details">
                  <p>
                    {t('brief.examForms')}{' '}
                    <Learn lang={lang}>
                      <strong className="answer">{target.examForms.join(' / ')}</strong>
                    </Learn>
                  </p>
                  <p>
                    <Learn lang={lang}>{target.context.sentence}</Learn> <span className="muted">– {native(target.context.translation)}</span>
                  </p>
                  {notes.map((note, n) => (
                    <p key={n} className="muted">
                      {note}
                    </p>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
