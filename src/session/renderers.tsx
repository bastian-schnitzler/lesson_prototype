import { useId, useRef, type ComponentType, type ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import type { LockedUnit, UnitResponse } from '../domain/session/session.ts';
import { seededOrder, type Item, type LessonPlan, type Option, type PlanUnit } from '../domain/session/plan.ts';
import type { MessageKey } from '../i18n/messages.ts';
import type { Locale } from '../schemas/common.ts';
import { speak, useVoiceStatus } from './speech.ts';
import { VoiceHelp } from './VoiceHelp.tsx';

/**
 * Baseline renderers for every item type (P1-09). Phases 2/3 replace individual entries of
 * this registry with the full interactions (drag and drop, card flipping, audio-first
 * listening); the session host and scoring stay unchanged.
 */
export interface RendererProps {
  item: Item;
  units: PlanUnit[];
  plan: LessonPlan;
  /** answering: editable; feedback: practice answers locked with corrections; exam: editable without feedback. */
  mode: 'answering' | 'feedback' | 'exam';
  drafts: Record<string, UnitResponse>;
  locked: Record<string, LockedUnit>;
  onChange: (unitId: string, response: UnitResponse) => void;
  seed: number;
  motherTongue: Locale;
}

/* ---------------------------------------------------------------- helpers */

/** Plays a word; without an installed learning-language voice it becomes an install-help button. */
function ListenButton({ text, lang }: { text: string; lang: string }) {
  const { t } = useI18n();
  const status = useVoiceStatus(lang);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const openHelp = () => dialog.current?.showModal();
  return (
    <div className="listen">
      {status === 'unavailable' ? (
        <button type="button" className="button button-outline button-small" aria-haspopup="dialog" onClick={openHelp}>
          {t('voice.install')}
        </button>
      ) : (
        <button type="button" className="button button-outline button-small" onClick={() => speak(text, lang) || openHelp()}>
          {t('session.listen')}
        </button>
      )}
      <dialog ref={dialog} className="voice-help-dialog" aria-labelledby={titleId} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <h2 id={titleId}>{t('voice.missingTitle')}</h2>
        <p>{t('voice.missingIntro')}</p>
        <VoiceHelp />
        <button type="button" className="button button-primary button-small" onClick={() => dialog.current?.close()}>{t('voice.close')}</button>
      </dialog>
    </div>
  );
}

/** Option text: learning-language words keep their language; UI options are message keys. */
function OptionText({ option, lang }: { option: Option; lang: string }) {
  const { t } = useI18n();
  if (option.lang === 'ui') return <>{t(option.text as MessageKey)}</>;
  return <span lang={option.lang === 'learning' ? lang : undefined}>{option.text}</span>;
}

const OUTCOME_KEY = { fully_correct: 'outcome.fully_correct', orthography_only: 'outcome.orthography_only', incorrect: 'outcome.incorrect', unanswered: 'outcome.unanswered' } as const;
const OUTCOME_ICON = { fully_correct: '✓', orthography_only: '!', incorrect: '✕', unanswered: '✕' } as const;

/** Practice feedback under a locked unit: classification, correct answer and explanation. */
export function UnitFeedback({ unit, locked, lang }: { unit: PlanUnit; locked: LockedUnit; lang: string }) {
  const { t, locale } = useI18n();
  const ok = locked.outcome === 'fully_correct';
  const answer = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  return (
    <div className={`feedback outcome-${locked.outcome}`} role="status">
      <p>
        <span aria-hidden="true">{OUTCOME_ICON[locked.outcome]}</span> {t(OUTCOME_KEY[locked.outcome])} · {t('result.points', { earned: locked.points, possible: 1 })}
      </p>
      {!ok && (
        <p>
          <span className="label-muted">{t('result.correctAnswer')}</span>{' '}
          <strong className="answer" lang={unit.answerLang === 'learning' ? lang : undefined}>{answer}</strong>
          {unit.form && <span lang={lang}> · {unit.form}</span>}
        </p>
      )}
      {!ok && <p className="explanation">{unit.explanation[locale]}</p>}
    </div>
  );
}

/** A unit row: prompt, control, and (after locking in practice) its feedback. */
function UnitRow({ unit, props, children }: { unit: PlanUnit; props: RendererProps; children: ReactNode }) {
  const lang = props.plan.lang;
  const locked = props.locked[unit.id];
  return (
    <div className="unit">
      {children}
      {props.mode === 'feedback' && locked && <UnitFeedback unit={unit} locked={locked} lang={lang} />}
    </div>
  );
}

const value = (props: RendererProps, unit: PlanUnit) => props.locked[unit.id]?.response ?? props.drafts[unit.id];
const readOnly = (props: RendererProps, unit: PlanUnit) => props.mode === 'feedback' || !!props.locked[unit.id];

function TextControl({ unit, props, label }: { unit: PlanUnit; props: RendererProps; label: string }) {
  return (
    <input
      className="text-input"
      lang={props.plan.lang}
      aria-label={label}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      value={(value(props, unit) as string | undefined) ?? ''}
      readOnly={readOnly(props, unit)}
      onChange={(e) => props.onChange(unit.id, e.target.value)}
    />
  );
}

function ChoiceControl({ unit, props, label, layout }: { unit: PlanUnit & { kind: 'choice' }; props: RendererProps; label: string; layout: 'select' | 'radio' }) {
  const { t } = useI18n();
  const options = seededOrder(unit.options, props.seed, unit.id);
  const current = (value(props, unit) as string | undefined) ?? '';
  const disabled = readOnly(props, unit);
  if (layout === 'select') {
    return (
      <select aria-label={label} value={current} disabled={disabled} onChange={(e) => props.onChange(unit.id, e.target.value)}>
        <option value="">{t('session.choose')}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.lang === 'ui' ? t(o.text as MessageKey) : o.text}
          </option>
        ))}
      </select>
    );
  }
  return (
    <fieldset className="choices" disabled={disabled}>
      <legend className="visually-hidden">{label}</legend>
      {options.map((o) => (
        <label key={o.id} className="choice">
          <input type="radio" name={unit.id} value={o.id} checked={current === o.id} onChange={() => props.onChange(unit.id, o.id)} />
          <OptionText option={o} lang={props.plan.lang} />
        </label>
      ))}
    </fieldset>
  );
}

function OrderControl({ unit, props }: { unit: PlanUnit & { kind: 'order' }; props: RendererProps }) {
  const { t } = useI18n();
  const order = (value(props, unit) as string[] | undefined) ?? [];
  const disabled = readOnly(props, unit);
  const bank = seededOrder(unit.tokens, props.seed, unit.id).filter((tk) => !order.includes(tk.id));
  const text = (id: string) => unit.tokens.find((tk) => tk.id === id)?.text;
  return (
    <div className="order">
      <p className="order-answer" lang={props.plan.lang} aria-live="polite">
        {order.length ? order.map((id, n) => (
          <button key={id} type="button" className="token token-placed" disabled={disabled} onClick={() => props.onChange(unit.id, order.filter((_, m) => m !== n))}>
            {text(id)}
          </button>
        )) : <span className="muted">{t('session.orderEmpty')}</span>}
      </p>
      <p className="order-bank" lang={props.plan.lang}>
        {bank.map((tk) => (
          <button key={tk.id} type="button" className="token" disabled={disabled} onClick={() => props.onChange(unit.id, [...order, tk.id])}>
            {tk.text}
          </button>
        ))}
      </p>
    </div>
  );
}

function SpotControl({ unit, props }: { unit: PlanUnit & { kind: 'spot' }; props: RendererProps }) {
  const { t } = useI18n();
  const current = (value(props, unit) as { tokenId: string; text: string } | undefined) ?? { tokenId: '', text: '' };
  const disabled = readOnly(props, unit);
  return (
    <div className="spot">
      <p lang={props.plan.lang}>
        {unit.tokens.map((tk) => (
          <button
            key={tk.id}
            type="button"
            className="token"
            aria-pressed={current.tokenId === tk.id}
            disabled={disabled}
            onClick={() => props.onChange(unit.id, { ...current, tokenId: tk.id })}
          >
            {tk.text}
          </button>
        ))}
      </p>
      {unit.correction.mode === 'select' ? (
        <fieldset className="choices" disabled={disabled}>
          <legend className="label-muted">{t('session.correction')}</legend>
          {unit.correction.choices.map((c) => (
            <label key={c} className="choice">
              <input type="radio" name={`${unit.id}-fix`} checked={current.text === c} onChange={() => props.onChange(unit.id, { ...current, text: c })} />
              <span lang={props.plan.lang}>{c}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="field">
          <span className="label-muted">{t('session.correction')}</span>
          <input className="text-input" lang={props.plan.lang} autoComplete="off" spellCheck={false} value={current.text} readOnly={disabled} onChange={(e) => props.onChange(unit.id, { ...current, text: e.target.value })} />
        </label>
      )}
    </div>
  );
}

function Gap({ before, after, lang, children }: { before?: string; after?: string; lang: string; children: ReactNode }) {
  return (
    <p className="gap-sentence" lang={lang}>
      {before} {children} {after}
    </p>
  );
}

/* ------------------------------------------------------------ renderers */

function UnitsRenderer(props: RendererProps) {
  const { t, locale } = useI18n();
  const lang = props.plan.lang;
  const item = props.item;
  return (
    <div className="units">
      {item.type === 'vocabulary_typed_gap' && (
        <p className="references">
          <span className="label-muted">{t('session.references')}</span>{' '}
          <span lang={lang}>{seededOrder(item.referenceTargetIds, props.seed, item.itemId).map((id) => props.plan.targets.get(id)?.term ?? id).join(' · ')}</span>
        </p>
      )}
      {item.type === 'grammar_gap_typing' && item.hint && props.mode !== 'exam' && (
        <p className="muted">
          {t('session.hint')} {item.hint[locale]}
        </p>
      )}
      {props.units.map((unit) => {
        const prompt = unit.prompt.native ?? unit.prompt.learning ?? '';
        return (
          <UnitRow key={unit.id} unit={unit} props={props}>
            {unit.speak && <ListenButton text={unit.speak} lang={lang} />}
            {unit.kind === 'text' && (unit.prompt.before !== undefined || unit.prompt.after !== undefined) ? (
              <Gap before={unit.prompt.before} after={unit.prompt.after} lang={lang}>
                <TextControl unit={unit} props={props} label={t('session.gapAnswer')} />
              </Gap>
            ) : unit.kind === 'text' ? (
              <label className="field">
                <span lang={unit.prompt.native ? undefined : lang}>{prompt || t('session.typeWhatYouHear')}</span>
                <TextControl unit={unit} props={props} label={prompt || t('session.typeWhatYouHear')} />
              </label>
            ) : unit.kind === 'choice' ? (
              unit.prompt.before !== undefined ? (
                <>
                  <Gap before={unit.prompt.before} after={unit.prompt.after} lang={lang}>____</Gap>
                  <ChoiceControl unit={unit} props={props} label={t('session.gapAnswer')} layout="radio" />
                </>
              ) : unit.speak ? (
                <ChoiceControl unit={unit} props={props} label={t('session.chooseHeard')} layout="radio" />
              ) : (
                <label className="field field-row">
                  <span lang={lang}>{prompt}</span>
                  <ChoiceControl unit={unit} props={props} label={prompt} layout="select" />
                </label>
              )
            ) : unit.kind === 'order' ? (
              <OrderControl unit={unit} props={props} />
            ) : (
              <SpotControl unit={unit} props={props} />
            )}
          </UnitRow>
        );
      })}
    </div>
  );
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
                {showGender && <td>{target?.genders.map((g) => t(`gender.${g}`)).join(' / ') || '–'}</td>}
                <td>{target && <ListenButton text={target.teachingForm} lang={plan.lang} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IntroductionRenderer({ item, plan, motherTongue }: RendererProps) {
  const { locale } = useI18n();
  if (item.type !== 'vocabulary_introduction') return null;
  return (
    <>
      <p className="explanation-text">{item.text[locale]}</p>
      <TargetTable ids={item.targetIds} plan={plan} motherTongue={motherTongue} />
    </>
  );
}

function FlashcardsRenderer({ item, plan, motherTongue }: RendererProps) {
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
                <strong lang={plan.lang}>{target?.teachingForm}</strong> {target?.genders.length ? `(${target.genders.map((g) => t(`gender.${g}`)).join(' / ')})` : ''}{' '}
                {target && <ListenButton text={target.teachingForm} lang={plan.lang} />}
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

function OverviewRenderer({ item, plan, motherTongue }: RendererProps) {
  if (item.type !== 'vocabulary_overview') return null;
  return <TargetTable ids={item.targetIds} plan={plan} motherTongue={motherTongue} showGender={false} />;
}

function GenderRenderer(props: RendererProps) {
  // While answering, only lemmas are shown; the reviewed overview follows once the choices are locked.
  return (
    <>
      <UnitsRenderer {...props} />
      {props.mode === 'feedback' && props.item.type === 'vocabulary_gender_select' && <TargetTable ids={props.item.targetIds} plan={props.plan} motherTongue={props.motherTongue} />}
    </>
  );
}

function ExplanationRenderer({ item, plan, motherTongue }: RendererProps) {
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

function PlaceholderRenderer() {
  const { t } = useI18n();
  return <p className="placeholder-feedback">{t('session.productionPlaceholder')}</p>;
}

export const rendererRegistry: Record<Item['type'], ComponentType<RendererProps>> = {
  vocabulary_introduction: IntroductionRenderer,
  vocabulary_flashcards: FlashcardsRenderer,
  vocabulary_overview: OverviewRenderer,
  vocabulary_matching: UnitsRenderer,
  vocabulary_gender_select: GenderRenderer,
  vocabulary_typed_gap: UnitsRenderer,
  vocabulary_listening_choice: UnitsRenderer,
  vocabulary_translation_exam: UnitsRenderer,
  vocabulary_listening_dictation: UnitsRenderer,
  grammar_explanation: ExplanationRenderer,
  production_feedback_placeholder: PlaceholderRenderer,
  grammar_pronoun_form_match: UnitsRenderer,
  grammar_pronoun_form_typing: UnitsRenderer,
  grammar_gap_choice: UnitsRenderer,
  grammar_gap_typing: UnitsRenderer,
  grammar_word_order: UnitsRenderer,
  grammar_error_spotter: UnitsRenderer,
};
