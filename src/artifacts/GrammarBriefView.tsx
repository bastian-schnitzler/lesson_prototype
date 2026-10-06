import type { GrammarBrief, GrammarExerciseType } from '../schemas/grammar.ts';
import { BriefBlock, Learn, ScoringNote, SummaryLine, TextList, useBriefText } from './briefParts.tsx';
import type { ArtifactViewProps } from './registry.ts';

/** Draft view of a validated grammar brief (SPEC section 3, "Structured artifact components"). */
export function GrammarBriefView({ data }: ArtifactViewProps) {
  const brief = data as GrammarBrief;
  const text = useBriefText(brief.lang);
  const { t, ui, native, duration } = text;
  const ruleNumber = new Map(brief.rules.map((rule, n) => [rule.id, n + 1]));
  const ruleLabels = (ids: string[]) => ids.map((id) => t('brief.rule', { number: ruleNumber.get(id) ?? id })).join(', ');
  const exercises = (types: GrammarExerciseType[]) => [...new Set(types)].map((type) => t(`exercise.${type}`)).join(', ');

  return (
    <div className="brief">
      <SummaryLine
        items={[
          t('brief.summary.blocks', { count: brief.blocks.length }),
          t('brief.summary.minutes', { minutes: brief.estimatedMinutes }),
          t('brief.summary.translation', { locale: t(`locale.${text.nativeLocale}`) }),
          t('brief.summary.explanations', { locale: t(`locale.${text.locale}`) }),
        ]}
      />
      <BriefBlock title={t('brief.objective')}>
        <p className="brief-lead">{ui(brief.objective)}</p>
      </BriefBlock>
      <div className="brief-columns">
        <BriefBlock title={t('brief.scope')}>
          <p>{ui(brief.scopeBoundaries)}</p>
        </BriefBlock>
        <BriefBlock title={t('brief.prerequisites')}>
          <TextList items={brief.prerequisites.map(ui)} empty={t('brief.none')} />
        </BriefBlock>
      </div>

      <BriefBlock title={t('brief.rules')}>
        <ol className="brief-list rules">
          {brief.rules.map((rule) => (
            <li key={rule.id}>{ui(rule.summary)}</li>
          ))}
        </ol>
      </BriefBlock>

      <BriefBlock title={t('brief.blocks')}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.block')}</th>
                <th scope="col">{t('brief.col.rules')}</th>
                <th scope="col">{t('brief.col.example')}</th>
                <th scope="col">{t('brief.col.practice')}</th>
              </tr>
            </thead>
            <tbody>
              {brief.blocks.map((block, n) => (
                <tr key={block.id}>
                  <th scope="row">
                    <span className="step-number">{String(n + 1).padStart(2, '0')}</span> {ui(block.title)}
                  </th>
                  <td>{ruleLabels(block.ruleIds)}</td>
                  <td>
                    <Learn lang={brief.lang}>{block.examples[0].text}</Learn>
                  </td>
                  <td>{exercises(block.exercises.map((e) => e.type))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {brief.blocks.map((block, n) => (
          <article key={block.id} className="block-card" aria-labelledby={`block-${block.id}`}>
            <h4 id={`block-${block.id}`}>
              <span className="step-number">{String(n + 1).padStart(2, '0')}</span> {ui(block.title)}
            </h4>
            <p className="muted">{ruleLabels(block.ruleIds)}</p>
            <h5>{t('brief.explanationPlan', { duration: duration(block.explanationDurationS) })}</h5>
            <p>{ui(block.explanationPlan)}</p>
            <h5>{t('brief.examples')}</h5>
            <ul className="brief-list examples">
              {block.examples.map((example, m) => (
                <li key={m}>
                  <Learn lang={brief.lang}>
                    <strong>{example.text}</strong>
                  </Learn>{' '}
                  <span className="muted">– {native(example.translation)}</span>
                </li>
              ))}
            </ul>
            <h5>{t('brief.pitfalls')}</h5>
            <TextList items={block.pitfalls.map(ui)} empty={t('brief.none')} />
            <h5>{t('brief.exercises')}</h5>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">{t('brief.col.exercise')}</th>
                    <th scope="col">{t('brief.col.items')}</th>
                    <th scope="col">{t('brief.col.rules')}</th>
                    <th scope="col">{t('brief.col.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {block.exercises.map((exercise) => (
                    <tr key={exercise.id}>
                      <th scope="row">{t(`exercise.${exercise.type}`)}</th>
                      <td>{exercise.itemCount}</td>
                      <td>{ruleLabels(exercise.ruleIds)}</td>
                      <td>{duration(exercise.estimatedDurationS)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
        <p className="muted">{t('brief.feedbackPlaceholder', { duration: duration(brief.feedbackPlaceholder.estimatedDurationS) })}</p>
      </BriefBlock>

      <BriefBlock title={t('brief.mixedExam')}>
        <p className="muted">{t('brief.examPlanNote')}</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('brief.col.page')}</th>
                <th scope="col">{t('brief.col.task')}</th>
                <th scope="col">{t('brief.col.items')}</th>
                <th scope="col">{t('brief.col.rules')}</th>
                <th scope="col">{t('brief.col.duration')}</th>
                <th scope="col">{t('brief.col.timeLimit')}</th>
              </tr>
            </thead>
            <tbody>
              {brief.exam.pages.map((page, n) => (
                <tr key={page.pageId}>
                  <th scope="row">{n + 1}</th>
                  <td>{t(`exercise.${page.type}`)}</td>
                  <td>{page.itemCount}</td>
                  <td>{ruleLabels(page.ruleIds)}</td>
                  <td>{duration(page.estimatedDurationS)}</td>
                  <td>{duration(page.timeLimitS)}</td>
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
