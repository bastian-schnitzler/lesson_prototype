import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import { isPluralAnswer, type LockedUnit, type UnitResponse } from '../domain/session/session.ts';
import { seededOrder, type Item, type LessonPlan, type Option, type PlanUnit } from '../domain/session/plan.ts';
import type { MessageKey } from '../i18n/messages.ts';
import type { Locale } from '../schemas/common.ts';
import { missingArticle, startsWithArticle } from '../domain/articleHint.ts';
import { speak, useVoiceStatus } from './speech.ts';
import { VoiceHelp } from './VoiceHelp.tsx';

/**
 * Shared unit controls used by vocabulary and grammar renderers: the four answer controls
 * (text, choice, token order, error spot), unit rows with practice feedback, gaps and audio.
 * Category renderers compose these; scoring stays in the pure session engine.
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
  /** Page of the item, so presentation progress can be keyed as `${pageId}/${itemId}`. */
  pageId: string;
  /** Revealed presentation keys (flashcards) per item key; stored in the session for resume. */
  revealed: Record<string, string[]>;
  onReveal: (itemKey: string, key: string) => void;
  /** True during the green success flash of a fully correct page (the correct choice lights up). */
  celebrating?: boolean;
  /** Exam units whose missing-article info box is shown after Continue, until Continue is pressed again. */
  articleWarnings?: string[];
  /** Single-answer practice page: typed and chosen answers are marked in place, without a feedback card. */
  inlineFeedback?: boolean;
}

/* ---------------------------------------------------------------- helpers */

/**
 * Plays a word or sentence; without an installed learning-language voice it becomes an install-help
 * button. The icon variant is a small speaker button (e.g. before an example sentence).
 */
export function ListenButton({ text, lang, variant = 'text', label, size = 'small' }: { text: string; lang: string; variant?: 'text' | 'icon'; label?: string; size?: 'small' | 'large' }) {
  const { t } = useI18n();
  const status = useVoiceStatus(lang);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // The help content mounts only while the dialog is open; many Listen controls share a page.
  const [helpOpen, setHelpOpen] = useState(false);
  const openHelp = () => {
    setHelpOpen(true);
    dialog.current?.showModal();
  };
  return (
    <div className="listen">
      {variant === 'icon' ? (
        <button type="button" className={`icon-button icon-button-${size}${status === 'unavailable' ? ' is-unavailable' : ''}`} aria-haspopup={status === 'unavailable' ? 'dialog' : undefined}
          aria-label={status === 'unavailable' ? t('voice.install') : label ?? t('session.listen')} title={status === 'unavailable' ? t('voice.install') : label ?? t('session.listen')}
          onClick={() => (status === 'unavailable' ? openHelp() : speak(text, lang) || openHelp())}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width={size === 'large' ? 22 : 16} height={size === 'large' ? 22 : 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
            <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
          </svg>
        </button>
      ) : status === 'unavailable' ? (
        <button type="button" className="button button-outline button-small" aria-haspopup="dialog" onClick={openHelp}>
          {t('voice.install')}
        </button>
      ) : (
        <button type="button" className="button button-outline button-small" onClick={() => speak(text, lang) || openHelp()}>
          {t('session.listen')}
        </button>
      )}
      <dialog ref={dialog} className="voice-help-dialog" aria-labelledby={titleId} onClose={() => setHelpOpen(false)} onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <h2 id={titleId}>{t('voice.missingTitle')}</h2>
        <p>{t('voice.missingIntro')}</p>
        {helpOpen && <VoiceHelp />}
        <button type="button" className="button button-primary button-small" onClick={() => dialog.current?.close()}>{t('voice.close')}</button>
      </dialog>
    </div>
  );
}

/** Option text: learning-language words keep their language; UI options are message keys. */
export function OptionText({ option, lang }: { option: Option; lang: string }) {
  const { t } = useI18n();
  if (option.lang === 'ui') return <>{t(option.text as MessageKey)}</>;
  return <span lang={option.lang === 'learning' ? lang : undefined}>{option.text}</span>;
}

const OUTCOME_KEY = { fully_correct: 'outcome.fully_correct', orthography_only: 'outcome.orthography_only', incorrect: 'outcome.incorrect', unanswered: 'outcome.unanswered' } as const;
const OUTCOME_ICON = { fully_correct: '✓', orthography_only: '!', incorrect: '✕', unanswered: '✕' } as const;

/** Practice feedback under a locked unit: classification, correct answer and explanation. */
/** The learner's response as display text (results and practice feedback). */
export function answerText(unit: PlanUnit, response: UnitResponse | null, t: (k: MessageKey) => string): string {
  if (response === null || response === undefined) return '';
  switch (unit.kind) {
    case 'text': return response as string;
    case 'choice': {
      const option = unit.options.find((o) => o.id === response);
      return option ? (option.lang === 'ui' ? t(option.text as MessageKey) : option.text) : '';
    }
    case 'order': return (response as string[]).map((id) => unit.tokens.find((tk) => tk.id === id)?.text).join(' ');
    case 'spot': {
      const r = response as { tokenId: string; text: string };
      // The sentence as the learner corrected it, without bracket markup (feedback #16): the selected word replaced by the correction.
      return unit.tokens.map((tk) => (tk.id === r.tokenId && r.text.trim() ? r.text.trim() : tk.text)).join(' ');
    }
  }
}

/**
 * Practice feedback under a locked unit, without point counts: a short "Correct", or the correct
 * answer in green with the learner's answer struck through in red directly below, and the explanation.
 */
export function UnitFeedback({ unit, locked, lang }: { unit: PlanUnit; locked: LockedUnit; lang: string }) {
  const { t, locale } = useI18n();
  if (locked.outcome === 'fully_correct') {
    return <div className="feedback outcome-fully_correct" role="status"><p><span aria-hidden="true">✓</span> {t('feedback.correct')}</p></div>;
  }
  const answer = unit.answerLang === 'ui' ? t(unit.answer as MessageKey) : unit.answer;
  const given = answerText(unit, locked.response, t);
  const learning = (l: string) => (l === 'learning' ? lang : undefined);
  return (
    <div className={`feedback outcome-${locked.outcome}`} role="status">
      <p className="feedback-title">
        <span aria-hidden="true">{OUTCOME_ICON[locked.outcome]}</span> {t(locked.outcome === 'orthography_only' ? 'feedback.almost' : OUTCOME_KEY[locked.outcome])}
      </p>
      <div className="fix-lines">
        <strong className="match-right">
          <span className="visually-hidden">{t('result.correctAnswer')}: </span><span lang={learning(unit.answerLang)}>{answer}</span>
          {unit.form && <span lang={lang}> · {unit.form}</span>}
        </strong>
        <span className="match-wrong"><span className="visually-hidden">{t('result.yourAnswer')}: </span><s lang={unit.kind !== 'choice' || unit.options[0]?.lang === 'learning' ? lang : undefined}>{given || t('session.noAnswer')}</s></span>
      </div>
      <SpotSummary unit={unit} response={locked.response} lang={lang} />
      <p className="explanation">{unit.explanation[locale]}</p>
    </div>
  );
}

/**
 * Error spotter feedback (feedback #16): names the selected word and the submitted correction, and says so
 * when the selected word was not the mistake. The correct sentence is shown by the caller, once.
 */
export function SpotSummary({ unit, response, lang }: { unit: PlanUnit; response: UnitResponse | null; lang: string }) {
  const { t } = useI18n();
  if (unit.kind !== 'spot' || !response || typeof response !== 'object' || Array.isArray(response) || !response.tokenId) return null;
  const word = unit.tokens.find((tk) => tk.id === response.tokenId)?.text ?? '';
  return (
    <ul className="spot-summary">
      <li>{t('feedback.selectedWord', { word })}</li>
      {response.tokenId !== unit.faultyTokenId && <li>{t('feedback.wrongWord', { word })}</li>}
      {response.text.trim() && <li lang={lang}>{t('feedback.yourCorrection', { text: response.text.trim() })}</li>}
    </ul>
  );
}

/** A unit row: prompt, control, and (after locking in practice) its feedback. */
export function UnitRow({ unit, props, children }: { unit: PlanUnit; props: RendererProps; children: ReactNode }) {
  const lang = props.plan.lang;
  const locked = props.locked[unit.id];
  return (
    <div className="unit">
      {children}
      {props.mode === 'feedback' && locked && !(props.inlineFeedback && (unit.kind === 'text' || unit.kind === 'choice')) && <UnitFeedback unit={unit} locked={locked} lang={lang} />}
    </div>
  );
}

const value = (props: RendererProps, unit: PlanUnit) => props.locked[unit.id]?.response ?? props.drafts[unit.id];
const readOnly = (props: RendererProps, unit: PlanUnit) => props.mode === 'feedback' || !!props.locked[unit.id];

/** Outcome of a locked unit while its page shows inline feedback; empty otherwise. */
const inlineOutcome = (props: RendererProps, unit: PlanUnit) => (props.inlineFeedback && props.mode === 'feedback' ? props.locked[unit.id]?.outcome ?? '' : '');

/**
 * Typed answers are checked as written (P6-02): no capitalisation, autocorrection, spell-check marks or
 * autocompletion on desktop or phone keyboards.
 */
export const plainTyping = { autoComplete: 'off', autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const;

export function TextControl({ unit, props, label }: { unit: PlanUnit; props: RendererProps; label: string }) {
  const { t } = useI18n();
  const outcome = inlineOutcome(props, unit);
  const field = (
    <input
      className={`text-input${outcome ? ` is-${outcome === 'fully_correct' ? 'right' : outcome === 'orthography_only' ? 'almost' : 'wrong'}` : ''}`}
      lang={props.plan.lang}
      aria-label={label}
      {...plainTyping}
      value={(value(props, unit) as string | undefined) ?? ''}
      readOnly={readOnly(props, unit)}
      onChange={(e) => props.onChange(unit.id, e.target.value)}
    />
  );
  // Typed gaps show the correct word as the green reference card above, so only the field is marked.
  if (!outcome || outcome === 'fully_correct' || unit.itemType === 'vocabulary_typed_gap') return field;
  // Other typed answers: the field turns red (amber) and the correct answer follows in green.
  return (
    <>
      {field}{' '}
      <strong className="inline-answer" lang={props.plan.lang}><span className="visually-hidden">{t('result.correctAnswer')}: </span>{unit.answer}</strong>
    </>
  );
}

export function ChoiceControl({ unit, props, label, layout }: { unit: PlanUnit & { kind: 'choice' }; props: RendererProps; label: string; layout: 'select' | 'radio' }) {
  const { t } = useI18n();
  const options = seededOrder(unit.options, props.seed, unit.id);
  const current = (value(props, unit) as string | undefined) ?? '';
  const disabled = readOnly(props, unit);
  // Inline feedback: the chosen wrong option turns red, the correct option green (P2-04 review).
  const checked = !!inlineOutcome(props, unit);
  const choiceState = (id: string) => (!checked ? '' : unit.correct.includes(id) ? ' is-right' : current === id ? ' is-wrong' : '');
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
        <label key={o.id} className={`choice${choiceState(o.id)}`}>
          <input type="radio" name={unit.id} value={o.id} checked={current === o.id} onChange={() => props.onChange(unit.id, o.id)} />
          <OptionText option={o} lang={props.plan.lang} />
          {/* Vocabulary options (listening choice) show the gender as extra information, like the reference cards. */}
          {o.lang === 'learning' && props.plan.targets.get(o.id)?.genders.length ? (
            <small className="choice-gender">{props.plan.targets.get(o.id)!.genders.map((g) => t(`gender.${g}`)).join(' / ')}</small>
          ) : null}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Word order: a click puts a bank token at the end of the line. Tokens can also be dragged with mouse,
 * pen or touch (P4-05 review): from the bank to any position on the line, and along the line to another
 * position; dropped off the line, a placed token returns to the bank, and a click on it does the same.
 * With the keyboard (P3-04) the arrow keys move a focused placed token along the line, Home and End
 * move it to either end; focus follows the token, and after placing or returning one it stays nearby.
 */
export function OrderControl({ unit, props }: { unit: PlanUnit & { kind: 'order' }; props: RendererProps }) {
  const { t } = useI18n();
  const order = (value(props, unit) as string[] | undefined) ?? [];
  const disabled = readOnly(props, unit);
  const bank = seededOrder(unit.tokens, props.seed, unit.id).filter((tk) => !order.includes(tk.id));
  const text = (id: string) => unit.tokens.find((tk) => tk.id === id)?.text;
  const line = useRef<HTMLParagraphElement>(null);
  /** The dragged token: its ID and, when it is on the line, its index there. */
  type Source = { tokenId: string; index: number | null };
  const press = useRef<(Source & { x: number; y: number; moved: boolean }) | null>(null);
  const [drag, setDrag] = useState<(Source & { x: number; y: number; target: number | null }) | null>(null);
  // The click that follows a drag must not also place or return the token.
  const suppressClick = useRef(false);
  /** Token button to focus after the next render: placed and returned tokens leave their position. */
  const focusNext = useRef<{ area: 'line' | 'bank'; index: number } | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    const buttons = (area: 'line' | 'bank') => [...(area === 'line' ? line.current : bankRef.current)?.querySelectorAll<HTMLButtonElement>('button.token') ?? []];
    const other = target.area === 'line' ? 'bank' : 'line';
    const own = buttons(target.area);
    (own[Math.min(target.index, own.length - 1)] ?? buttons(other).at(target.area === 'line' ? 0 : -1))?.focus();
  });
  const bankRef = useRef<HTMLParagraphElement>(null);

  /** Insertion index on the line for a pointer position; null when the pointer is outside the line. */
  const targetAt = (x: number, y: number): number | null => {
    const box = line.current?.getBoundingClientRect();
    if (!box || y < box.top - 24 || y > box.bottom + 24) return null;
    const tokens = [...(line.current?.querySelectorAll<HTMLElement>('.token-placed') ?? [])];
    let index = tokens.length;
    for (const [n, el] of tokens.entries()) {
      const r = el.getBoundingClientRect();
      const sameRow = y >= r.top - 4 && y <= r.bottom + 4;
      if ((sameRow && x < r.left + r.width / 2) || y < r.top - 4) { index = n; break; }
    }
    return index;
  };
  const drop = (source: Source, target: number | null) => {
    if (source.index === null) {
      // From the bank: insert at the chosen position; dropped elsewhere nothing changes.
      if (target === null) return;
      const next = [...order];
      next.splice(target, 0, source.tokenId);
      props.onChange(unit.id, next);
      return;
    }
    if (target === null) return props.onChange(unit.id, order.filter((_, m) => m !== source.index));
    if (target === source.index || target === source.index + 1) return;
    const next = order.filter((_, m) => m !== source.index);
    next.splice(target > source.index ? target - 1 : target, 0, source.tokenId);
    props.onChange(unit.id, next);
  };
  const handlers = (source: Source) => disabled ? {} : {
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      suppressClick.current = false;
      press.current = { ...source, x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => {
      const p = press.current;
      if (!p) return;
      if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      p.moved = true;
      setDrag({ tokenId: p.tokenId, index: p.index, x: e.clientX, y: e.clientY, target: targetAt(e.clientX, e.clientY) });
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
      const p = press.current;
      press.current = null;
      if (!p?.moved) return; // a click: handled by onClick
      suppressClick.current = true;
      setDrag(null);
      drop(p, targetAt(e.clientX, e.clientY));
    },
    onPointerCancel: () => { press.current = null; setDrag(null); },
  };
  const clicked = () => {
    if (!suppressClick.current) return true;
    suppressClick.current = false;
    return false;
  };
  const place = (tokenId: string) => {
    focusNext.current = { area: 'bank', index: bank.findIndex((tk) => tk.id === tokenId) };
    props.onChange(unit.id, [...order, tokenId]);
  };
  const remove = (n: number) => {
    focusNext.current = { area: 'line', index: Math.max(0, n - 1) };
    props.onChange(unit.id, order.filter((_, m) => m !== n));
  };
  const onKeyDown = (n: number) => (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const to = { ArrowLeft: n - 1, ArrowUp: n - 1, ArrowRight: n + 1, ArrowDown: n + 1, Home: 0, End: order.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    if (to < 0 || to >= order.length || to === n) return;
    const next = order.filter((_, m) => m !== n);
    next.splice(to, 0, order[n]);
    focusNext.current = { area: 'line', index: to };
    props.onChange(unit.id, next);
  };
  const showMarker = drag && drag.target !== null && (drag.index === null || (drag.target !== drag.index && drag.target !== drag.index + 1));
  const placed = order.map((id, n) => (
    <button key={id} type="button" className={`token token-placed${drag?.index === n ? ' is-dragged' : ''}`} disabled={disabled}
      {...handlers({ tokenId: id, index: n })} onKeyDown={disabled ? undefined : onKeyDown(n)}
      aria-label={t('session.orderMove', { word: text(id) ?? '', position: n + 1, total: order.length })}
      onClick={() => { if (clicked()) remove(n); }}>
      {text(id)}
    </button>
  ));
  if (showMarker) placed.splice(drag!.target!, 0, <span key="marker" className="order-marker" aria-hidden="true" />);
  return (
    <div className={`order${drag ? ' is-dragging' : ''}`}>
      <p ref={line} className="order-answer" lang={props.plan.lang} role="group" aria-label={t('session.orderLine')}>
        {placed.length ? placed : <span className="muted">{t('session.orderEmpty')}</span>}
      </p>
      <p ref={bankRef} className="order-bank" lang={props.plan.lang} role="group" aria-label={t('session.orderBank')}>
        {bank.map((tk) => (
          <button key={tk.id} type="button" className={`token${drag?.tokenId === tk.id ? ' is-dragged' : ''}`} disabled={disabled}
            {...handlers({ tokenId: tk.id, index: null })}
            onClick={() => { if (clicked()) place(tk.id); }}>
            {tk.text}
          </button>
        ))}
      </p>
      {drag && <span className="drag-ghost token token-placed" lang={props.plan.lang} style={{ left: drag.x, top: drag.y }} aria-hidden="true">{text(drag.tokenId)}</span>}
    </div>
  );
}

export function SpotControl({ unit, props }: { unit: PlanUnit & { kind: 'spot' }; props: RendererProps }) {
  const { t } = useI18n();
  const current = (value(props, unit) as { tokenId: string; text: string } | undefined) ?? { tokenId: '', text: '' };
  const disabled = readOnly(props, unit);
  return (
    <div className="spot">
      <p lang={props.plan.lang} role="group" aria-label={t('session.spotSentence')}>
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
      {/* The correction appears once a word is selected (P3-07 review). */}
      {!current.tokenId ? null : unit.correction.mode === 'select' ? (
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
          {/* The correction field appears when a word is chosen and takes the cursor at once (P6-02). */}
          <input className="text-input" lang={props.plan.lang} {...plainTyping} autoFocus={!disabled} value={current.text} readOnly={disabled} onChange={(e) => props.onChange(unit.id, { ...current, text: e.target.value })} />
        </label>
      )}
    </div>
  );
}

export function Gap({ before, after, lang, children }: { before?: string; after?: string; lang: string; children: ReactNode }) {
  // A comma or full stop follows the gap directly; other text keeps a space.
  return (
    <p className="gap-sentence" lang={lang}>
      {before} {children}{after && /^[,.]/.test(after) ? after : ` ${after ?? ''}`}
    </p>
  );
}

/**
 * After "des" + a word in a translation exam (P4-05 review) the gender is asked, because "des" does not
 * show it: masculine/feminine pills after the field, for every noun so that the choice reveals nothing.
 * Only a plurale tantum is right in the plural, and then only with the right gender.
 */
function PluralGender({ unit, props }: { unit: PlanUnit; props: RendererProps }) {
  const { t } = useI18n();
  if (unit.kind !== 'text' || !unit.noun || !isPluralAnswer(value(props, unit))) return null;
  const key = `${unit.id}#gender`;
  const current = (props.locked[unit.id]?.gender ?? props.drafts[key]) as string | undefined;
  return (
    <fieldset className="gender-options plural-gender" disabled={readOnly(props, unit)}>
      <legend className="label-muted">{t('session.pluralGender')}</legend>
      {(['masculine', 'feminine'] as const).map((g) => (
        <label key={g} className="gender-option">
          <input type="radio" name={key} value={g} checked={current === g} onChange={() => props.onChange(key, g)} />
          <span>{t(`gender.${g}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/* ------------------------------------------------------------ renderers */

export function UnitsRenderer(props: RendererProps) {
  const { t, locale } = useI18n();
  const lang = props.plan.lang;
  const item = props.item;
  return (
    <div className="units">
      <ReferenceWords {...props} />
      {/* Gap cues stand on their own line above the sentence (practice only). */}
      {(item.type === 'grammar_gap_typing' || item.type === 'grammar_gap_choice') && item.hint && props.mode !== 'exam' && (
        <p className="muted gap-hint">
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
              <>
                <label className="field">
                  <span lang={unit.prompt.native ? undefined : lang}>
                    {prompt || t('session.typeWhatYouHear')}
                    {/* Vocabulary translation tasks say whether the French answer needs an article. */}
                    {/* The badge turns purple while the typed answer lacks the required article. */}
                    {(unit.itemType === 'vocabulary_translation_exam' || unit.itemType === 'function_translation_exam') && (
                      <small className={`article-badge${!readOnly(props, unit) && missingArticle((value(props, unit) as string | undefined) ?? '', unit.answer, lang) ? ' is-alert' : ''}`}>
                        {t(startsWithArticle(unit.answer, lang) ? 'session.withArticle' : 'session.withoutArticle')}
                      </small>
                    )}
                  </span>
                  <TextControl unit={unit} props={props} label={prompt || t('session.typeWhatYouHear')} />
                </label>
                <PluralGender unit={unit} props={props} />
                {props.articleWarnings?.includes(unit.id) && !readOnly(props, unit) && (
                  <p className="info-box" role="status">{t(/^(un|une|des)\s/iu.test(unit.answer) ? 'session.typeArticle' : 'session.typeDefiniteArticle')}</p>
                )}
              </>
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

/**
 * Typed-gap reference words (P2-03): four noninteractive cards, centred one under another above the
 * sentence. Once checked (or during the success flash) the correct word lights up green.
 */
function ReferenceWords(props: RendererProps) {
  const { t } = useI18n();
  const { item, plan } = props;
  if (item.type !== 'vocabulary_typed_gap') return null;
  const checked = props.celebrating || props.units.some((u) => props.locked[u.id]);
  return (
    <div className="references">
      <p className="visually-hidden">{t('session.references')}</p>
      <ul className="reference-list">
        {seededOrder(item.referenceTargetIds, props.seed, item.itemId).map((id) => {
          const target = plan.targets.get(id);
          return (
            <li key={id} className={checked && id === item.targetId ? 'is-correct' : undefined}>
              <span lang={plan.lang}>{target?.term ?? id}</span>
              {target?.genders.length ? <small>{target.genders.map((g) => t(`gender.${g}`)).join(' / ')}</small> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
