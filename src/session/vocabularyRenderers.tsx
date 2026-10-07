import { useI18n } from '../app/context.tsx';
import { RichText } from '../components/RichText.tsx';
import type { LessonPlan } from '../domain/session/plan.ts';
import type { Locale } from '../schemas/common.ts';
import type { VocabularyTarget } from '../schemas/vocabulary.ts';
import { ListenButton, UnitsRenderer, type RendererProps } from './controls.tsx';

/** Vocabulary presentation renderers; scored vocabulary items use the shared `UnitsRenderer`. */

/** Accepted genders as UI labels; empty for non-nouns, which never get an invented gender (D8). */
function genderLabel(target: VocabularyTarget, t: ReturnType<typeof useI18n>['t']) {
  return target.genders.map((g) => t(`gender.${g}`)).join(' / ');
}

function TargetTable({ ids, plan, motherTongue, showGender = true }: { ids: string[]; plan: LessonPlan; motherTongue: Locale; showGender?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{t('brief.col.target')}</th>
            <th scope="col">{t('brief.col.translation', { locale: t(`locale.${motherTongue}`) })}</th>
            {showGender && <th scope="col">{t('brief.col.gender')}</th>}
            <th scope="col">{t('session.audio')}</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => {
            const target = plan.targets.get(id);
            return (
              <tr key={id}>
                <th scope="row" lang={plan.lang}>{target?.teachingForm ?? id}</th>
                <td>{target?.translations[motherTongue]?.join(' / ')}</td>
                {showGender && <td>{(target && genderLabel(target, t)) || '–'}</td>}
                <td>{target && <ListenButton text={target.teachingForm} lang={plan.lang} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function IntroductionRenderer({ item, plan, motherTongue }: RendererProps) {
  const { locale } = useI18n();
  if (item.type !== 'vocabulary_introduction') return null;
  return (
    <>
      <RichText text={item.text[locale]} lang={plan.lang} className="rich-text explanation-text" />
      <TargetTable ids={item.targetIds} plan={plan} motherTongue={motherTongue} />
    </>
  );
}

export function FlashcardsRenderer({ item, plan, motherTongue }: RendererProps) {
  const { t } = useI18n();
  if (item.type !== 'vocabulary_flashcards') return null;
  return (
    <ul className="flashcards">
      {item.targetIds.map((id) => {
        const target = plan.targets.get(id);
        return (
          <li key={id}>
            <details>
              <summary>{target?.translations[motherTongue]?.[0] ?? id}</summary>
              <div>
                <strong lang={plan.lang}>{target?.teachingForm}</strong> {target?.genders.length ? `(${genderLabel(target, t)})` : ''}{' '}
                {target && <ListenButton text={target.teachingForm} lang={plan.lang} />}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function OverviewRenderer({ item, plan, motherTongue }: RendererProps) {
  if (item.type !== 'vocabulary_overview') return null;
  return <TargetTable ids={item.targetIds} plan={plan} motherTongue={motherTongue} showGender={false} />;
}

export function GenderRenderer(props: RendererProps) {
  // While answering, only lemmas are shown; the reviewed overview follows once the choices are locked.
  return (
    <>
      <UnitsRenderer {...props} />
      {props.mode === 'feedback' && props.item.type === 'vocabulary_gender_select' && <TargetTable ids={props.item.targetIds} plan={props.plan} motherTongue={props.motherTongue} />}
    </>
  );
}

