import { useState } from 'react';

import { useI18n } from '../app/context.tsx';
import { RichText } from '../components/RichText.tsx';
import { seededOrder, type LessonPlan, type PlanUnit } from '../domain/session/plan.ts';
import type { Locale } from '../schemas/common.ts';
import type { VocabularyTarget } from '../schemas/vocabulary.ts';
import { ListenButton, UnitRow, UnitsRenderer, type RendererProps } from './controls.tsx';

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

/**
 * Flashcards (P2-02): one card at a time. The front shows only the mother-tongue meaning; revealing
 * shows the French teaching form, gender, audio and context. Reveals are stored in the session, so
 * progress survives a resume, and the page completes once every card was revealed.
 */
export function FlashcardsRenderer({ item, plan, motherTongue, pageId, revealed, onReveal }: RendererProps) {
  const { t, languageName } = useI18n();
  const [index, setIndex] = useState(0);
  if (item.type !== 'vocabulary_flashcards') return null;
  const itemKey = `${pageId}/${item.itemId}`;
  const seen = revealed[itemKey] ?? [];
  const id = item.targetIds[Math.min(index, item.targetIds.length - 1)];
  const target = plan.targets.get(id);
  const isRevealed = seen.includes(id);
  const total = item.targetIds.length;
  return (
    <div className="flashcard-deck">
      <p className="label-muted" aria-live="polite">
        {t('session.cardOf', { n: index + 1, total })} · {t('session.cardsRevealed', { n: seen.filter((s) => item.targetIds.includes(s)).length, total })}
      </p>
      <article className={`flashcard${isRevealed ? ' flashcard-revealed' : ''}`} aria-label={t('session.cardOf', { n: index + 1, total })}>
        <p className="flashcard-side">{t(`locale.${motherTongue}`)}</p>
        <p className="flashcard-meaning">{target?.translations[motherTongue]?.join(' / ') ?? id}</p>
        {isRevealed && target ? (
          <div className="flashcard-back">
            <p className="flashcard-side">{languageName(plan.lang)}</p>
            <p className="flashcard-form" lang={plan.lang}>{target.teachingForm}</p>
            {target.genders.length > 0 && <p className="muted">{genderLabel(target, t)}</p>}
            <ListenButton text={target.teachingForm} lang={plan.lang} />
            <p><span lang={plan.lang}>{target.context.sentence}</span> <span className="muted">– {target.context.translation[motherTongue]}</span></p>
          </div>
        ) : (
          <>
            <p className="muted">{t('session.recallHint')}</p>
            <button type="button" className="button button-outline" onClick={() => onReveal(itemKey, id)}>{t('session.revealCard')}</button>
          </>
        )}
      </article>
      <div className="flashcard-nav">
        <button type="button" className="button button-outline button-small" disabled={index === 0} onClick={() => setIndex(index - 1)}>{t('session.previousCard')}</button>
        <button type="button" className="button button-outline button-small" disabled={index >= total - 1} onClick={() => setIndex(index + 1)}>{t('session.nextCard')}</button>
      </div>
    </div>
  );
}

/**
 * Matching (P2-02): mother-tongue meanings and French forms in two independently shuffled columns.
 * Select one item on either side, then its partner on the other; pairs stay editable until Continue,
 * which locks one point unit per French form and shows corrections with their explanations.
 */
export function MatchingRenderer(props: RendererProps) {
  const { t } = useI18n();
  const { item, units, plan, seed, mode } = props;
  const [selected, setSelected] = useState<{ side: 'native' | 'learning'; id: string } | null>(null);
  if (item.type !== 'vocabulary_matching') return null;
  const choiceUnits = units.filter((u): u is PlanUnit & { kind: 'choice' } => u.kind === 'choice');
  const options = choiceUnits[0]?.options ?? [];
  const pairOf = (unitId: string) => (props.locked[unitId]?.response ?? props.drafts[unitId]) as string | undefined;
  const nativeText = (optionId: string) => options.find((o) => o.id === optionId)?.text ?? '';
  const targetOf = (unitId: string) => plan.targets.get(choiceUnits.find((u) => u.id === unitId)?.correct[0] ?? '');
  const formLabel = (unitId: string) => {
    const target = targetOf(unitId);
    return target?.genders.length ? `${target.teachingForm} (${genderLabel(target, t)})` : target?.teachingForm ?? '';
  };

  if (mode !== 'answering') {
    return (
      <div className="units">
        {choiceUnits.map((unit) => (
          <UnitRow key={unit.id} unit={unit} props={props}>
            <p className="match-result"><span lang={plan.lang}>{formLabel(unit.id)}</span> — {nativeText(pairOf(unit.id) ?? '') || t('session.noAnswer')}</p>
          </UnitRow>
        ))}
      </div>
    );
  }

  const nativeOrder = seededOrder(options, seed, `${item.itemId}/native`);
  const learningOrder = seededOrder(choiceUnits, seed, `${item.itemId}/learning`);
  const pairNumber = new Map(learningOrder.filter((u) => pairOf(u.id)).map((u, n) => [u.id, n + 1]));
  const unitForOption = (optionId: string) => choiceUnits.find((u) => pairOf(u.id) === optionId);
  const assign = (unitId: string, optionId: string) => {
    for (const other of choiceUnits) if (other.id !== unitId && pairOf(other.id) === optionId) props.onChange(other.id, '');
    props.onChange(unitId, optionId);
    setSelected(null);
  };
  const pick = (side: 'native' | 'learning', id: string) => {
    if (selected && selected.side !== side) {
      if (side === 'learning') assign(id, selected.id);
      else assign(selected.id, id);
    } else setSelected(selected?.side === side && selected.id === id ? null : { side, id });
  };
  const assigned = choiceUnits.filter((u) => pairOf(u.id)).length;
  const current = selected ? (selected.side === 'native' ? nativeText(selected.id) : formLabel(selected.id)) : '';
  return (
    <div className="matching">
      <p className="muted">{t('session.matchHint')}</p>
      <div className="matching-columns">
        <ul aria-label={t(`locale.${props.motherTongue}`)}>
          {nativeOrder.map((o) => {
            const unit = unitForOption(o.id);
            const n = unit ? pairNumber.get(unit.id) : undefined;
            return (
              <li key={o.id}>
                <button type="button" className="match-item" aria-pressed={selected?.side === 'native' && selected.id === o.id}
                  aria-label={n ? t('session.pairedWith', { item: o.text, partner: formLabel(unit!.id) }) : o.text} onClick={() => pick('native', o.id)}>
                  <span>{o.text}</span>{n && <span className="pair-badge" aria-hidden="true">{n}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <ul aria-label={t('session.frenchForms')}>
          {learningOrder.map((u) => {
            const n = pairNumber.get(u.id);
            return (
              <li key={u.id}>
                <button type="button" className="match-item" lang={plan.lang} aria-pressed={selected?.side === 'learning' && selected.id === u.id}
                  aria-label={n ? t('session.pairedWith', { item: formLabel(u.id), partner: nativeText(pairOf(u.id)!) }) : formLabel(u.id)} onClick={() => pick('learning', u.id)}>
                  <span>{targetOf(u.id)?.teachingForm}{targetOf(u.id)?.genders.length ? <small>{genderLabel(targetOf(u.id)!, t)}</small> : null}</span>{n && <span className="pair-badge" aria-hidden="true">{n}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="muted" aria-live="polite">
        {current ? t('session.matchSelected', { item: current }) : ''} {t('session.pairsAssigned', { n: assigned, total: choiceUnits.length })}
      </p>
    </div>
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

