import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { useI18n } from '../app/context.tsx';
import { RichText } from '../components/RichText.tsx';
import { seededOrder, type PlanUnit } from '../domain/session/plan.ts';
import { TextControl, type RendererProps } from './controls.tsx';

/** Grammar renderers: presentation items, pronoun/form rows (P3-02); other scored items use the shared `UnitsRenderer`. */

export function ExplanationRenderer({ item, plan, motherTongue }: RendererProps) {
  const { locale, t } = useI18n();
  if (item.type !== 'grammar_explanation') return null;
  return (
    <>
      <h3>{item.heading[locale]}</h3>
      <RichText text={item.text[locale]} lang={plan.lang} className="rich-text explanation-text" />
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


/** The learner's current form per row: locked response first, then the draft. */
const responseOf = (props: RendererProps, unitId: string) => (props.locked[unitId]?.response ?? props.drafts[unitId]) as string | undefined;

/**
 * Pronoun/form matching (P3-02): a bank of form tokens above one row per generated pronoun. A token
 * is dragged onto a row (mouse or touch), or selected and then placed with a click or the keyboard;
 * a row can be selected first, too. Every token is used at most once: a placed token leaves the bank,
 * a token placed elsewhere moves, and a placed token goes back to the bank when clicked or dragged
 * there. Duplicate texts are separate tokens; each row scores one point by grammatical validity.
 */
export function PronounMatchRenderer(props: RendererProps) {
  const { t, locale } = useI18n();
  const { item, units, plan, mode } = props;
  const [selected, setSelected] = useState<{ kind: 'token'; id: string } | { kind: 'row'; id: string } | null>(null);
  const [drag, setDrag] = useState<{ tokenId: string; from: string | null; x: number; y: number } | null>(null);
  const press = useRef<{ tokenId: string; from: string | null; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    if (!selected) return;
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [selected]);
  if (item.type !== 'grammar_pronoun_form_match') return null;
  const rows = units.filter((u): u is PlanUnit & { kind: 'choice' } => u.kind === 'choice');
  const tokens = rows[0]?.options ?? [];
  const checked = mode === 'feedback';
  const editable = mode !== 'feedback' && !rows.some((u) => props.locked[u.id]);
  const placedIn = (tokenId: string) => rows.find((u) => responseOf(props, u.id) === tokenId)?.id ?? null;
  const textOf = (tokenId: string | undefined) => tokens.find((o) => o.id === tokenId)?.text ?? '';
  const bank = seededOrder(tokens, props.seed, `${item.itemId}/bank`).filter((o) => !placedIn(o.id));

  const place = (rowId: string, tokenId: string) => {
    const from = placedIn(tokenId);
    if (from && from !== rowId) props.onChange(from, '');
    props.onChange(rowId, tokenId);
    setSelected(null);
  };
  const remove = (rowId: string) => { props.onChange(rowId, ''); setSelected(null); };
  const clickToken = (tokenId: string) => {
    if (selected?.kind === 'row') place(selected.id, tokenId);
    else setSelected(selected?.kind === 'token' && selected.id === tokenId ? null : { kind: 'token', id: tokenId });
  };
  const clickRow = (rowId: string) => {
    if (selected?.kind === 'token') place(rowId, selected.id);
    else if (responseOf(props, rowId)) remove(rowId); // a placed token goes back to the bank
    else setSelected(selected?.kind === 'row' && selected.id === rowId ? null : { kind: 'row', id: rowId });
  };

  // Pointer dragging works for mouse, pen and touch alike; a press without movement stays a click.
  const dragHandlers = (tokenId: string, from: string | null) => editable ? {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      press.current = { tokenId, from, x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const p = press.current;
      if (!p) return;
      if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
      p.moved = true;
      setDrag({ tokenId: p.tokenId, from: p.from, x: e.clientX, y: e.clientY });
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const p = press.current;
      press.current = null;
      if (!p?.moved) return;
      setDrag(null);
      // The click that may follow this pointerup must not act as a second, click-based placement.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drop]');
      const drop = target?.dataset.drop;
      if (drop === 'bank') { if (p.from) remove(p.from); } else if (drop) place(drop, p.tokenId);
    },
    onPointerCancel: () => { press.current = null; setDrag(null); },
  } : {};
  const unlessDragged = (action: () => void) => () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    action();
  };

  const right = rows.filter((u) => props.locked[u.id]?.outcome === 'fully_correct').length;
  return (
    <div className={`pronoun-match${drag ? ' is-dragging' : ''}`}>
      {checked
        ? <p className="match-summary" role="status"><strong>{t('session.rowsSummary', { correct: right, total: rows.length })}</strong></p>
        : <p className="muted">{t('session.formMatchHint')}</p>}
      {!checked && (
        <div className="form-bank" data-drop="bank" role="group" aria-label={t('session.formBank')}>
          {bank.length ? bank.map((o) => (
            <button key={o.id} type="button" className="token form-token" lang={plan.lang} disabled={!editable}
              aria-pressed={selected?.kind === 'token' && selected.id === o.id} onClick={unlessDragged(() => clickToken(o.id))} {...dragHandlers(o.id, null)}>
              {o.text}
            </button>
          )) : <span className="muted">{t('session.formBankEmpty')}</span>}
        </div>
      )}
      <ul className="form-rows" aria-label={t('session.subject')}>
        {rows.map((u) => {
          const tokenId = responseOf(props, u.id);
          const outcome = checked ? props.locked[u.id]?.outcome : undefined;
          const state = outcome ? (outcome === 'fully_correct' ? ' is-right' : ' is-wrong') : '';
          return (
            <li key={u.id} className={`form-row${state}`}>
              <span className="form-pronoun" lang={plan.lang}>{u.prompt.learning}</span>
              <button type="button" data-drop={u.id} className={`form-slot${tokenId ? ' is-filled' : ''}${state}`} disabled={!editable}
                aria-pressed={selected?.kind === 'row' && selected.id === u.id}
                aria-label={tokenId ? t('session.slotFilled', { pronoun: u.prompt.learning ?? '', form: textOf(tokenId) }) : t('session.slotEmpty', { pronoun: u.prompt.learning ?? '' })}
                onClick={unlessDragged(() => clickRow(u.id))} {...(tokenId ? dragHandlers(tokenId, u.id) : {})}>
                {tokenId ? <span className="form-placed" lang={plan.lang}>{textOf(tokenId)}</span> : <span className="muted">{t('session.dropForm')}</span>}
              </button>
              {outcome && outcome !== 'fully_correct' && (
                <>
                  <strong className="inline-answer" lang={plan.lang}><span className="visually-hidden">{t('result.correctAnswer')}: </span>{u.answer}</strong>
                  <p className="row-explanation">{u.explanation[locale]}</p>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {!checked && (
        <p className="muted" aria-live="polite">
          {selected?.kind === 'token' ? t('session.matchSelected', { item: textOf(selected.id) }) : ''}
        </p>
      )}
      {drag && <span className="token form-token drag-ghost" lang={plan.lang} style={{ left: drag.x, top: drag.y }} aria-hidden="true">{textOf(drag.tokenId)}</span>}
    </div>
  );
}

/**
 * Pronoun/form typing (P3-02): one text field per generated pronoun row. After Check each field is
 * marked in place (green, amber for accent/case only, red) with the correct form and the row's
 * explanation; exam pages show no marks until the results.
 */
export function PronounTypingRenderer(props: RendererProps) {
  const { t, locale } = useI18n();
  const { item, units, plan, mode } = props;
  if (item.type !== 'grammar_pronoun_form_typing') return null;
  const rowProps = { ...props, inlineFeedback: true };
  return (
    <ul className="form-rows">
      {units.map((u) => {
        const outcome = mode === 'feedback' ? props.locked[u.id]?.outcome : undefined;
        return (
          <li key={u.id} className="form-row">
            <span className="form-pronoun" lang={plan.lang}>{u.prompt.learning}</span>
            <TextControl unit={u} props={rowProps} label={t('session.formFor', { pronoun: u.prompt.learning ?? '' })} />
            {outcome && outcome !== 'fully_correct' && <p className="row-explanation">{u.explanation[locale]}</p>}
          </li>
        );
      })}
    </ul>
  );
}
