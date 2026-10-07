import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react';

import { useI18n } from '../app/context.tsx';
import type { MessageKey } from '../i18n/messages.ts';
import { RichText } from '../components/RichText.tsx';
import { seededOrder, type LessonPlan, type PlanUnit } from '../domain/session/plan.ts';
import type { Locale } from '../schemas/common.ts';
import type { VocabularyTarget } from '../schemas/vocabulary.ts';
import { ListenButton, type RendererProps } from './controls.tsx';

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

/** Introduction: the formatted group text only; the words themselves follow on the flashcards. */
export function IntroductionRenderer({ item, plan }: RendererProps) {
  const { locale } = useI18n();
  if (item.type !== 'vocabulary_introduction') return null;
  return <RichText text={item.text[locale]} lang={plan.lang} className="rich-text explanation-text" />;
}

/**
 * Flashcards (P2-02): every card of the group on one page (two columns on wide screens). A card
 * shows the mother-tongue meaning; the flip button turns it to the French side only (teaching form,
 * gender, audio, context) without changing its size, and back again. The first flip of each card
 * is stored in the session, so progress survives a resume; the page completes once every card was
 * turned at least once.
 */
export function FlashcardsRenderer({ item, plan, motherTongue, pageId, revealed, onReveal }: RendererProps) {
  const { t } = useI18n();
  if (item.type !== 'vocabulary_flashcards') return null;
  const itemKey = `${pageId}/${item.itemId}`;
  const seen = revealed[itemKey] ?? [];
  const total = item.targetIds.length;
  return (
    <div className="flashcard-deck">
      <p className="label-muted" aria-live="polite">{t('session.cardsRevealed', { n: seen.filter((s) => item.targetIds.includes(s)).length, total })}</p>
      <ul className="flashcard-grid">
        {item.targetIds.map((id, n) => (
          <li key={id}>
            <Flashcard id={id} index={n} total={total} plan={plan} motherTongue={motherTongue} initiallyFlipped={seen.includes(id)} onFlip={() => onReveal(itemKey, id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Flashcard({ id, index, total, plan, motherTongue, initiallyFlipped, onFlip }: {
  id: string; index: number; total: number; plan: LessonPlan; motherTongue: Locale; initiallyFlipped: boolean; onFlip: () => void;
}) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(initiallyFlipped);
  const target = plan.targets.get(id);
  const label = t('session.cardOf', { n: index + 1, total });
  const flip = () => {
    if (!flipped) onFlip();
    setFlipped(!flipped);
  };
  return (
    <article className={`flashcard${flipped ? ' is-flipped' : ''}`} aria-label={label}>
      <button type="button" className="flip-button" aria-pressed={flipped} aria-label={flipped ? t('session.flipBack') : t('session.flipCard')} onClick={flip}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div className="flashcard-inner">
        <div className="flashcard-face flashcard-front" inert={flipped}>
          <p className="flashcard-meaning">{target?.translations[motherTongue]?.join(' / ') ?? id}</p>
        </div>
        <div className="flashcard-face flashcard-back" inert={!flipped}>
          <div className="flashcard-form">
            <span lang={plan.lang}>{target?.teachingForm}</span>
            {target && <ListenButton text={target.teachingForm} lang={plan.lang} variant="icon" size="large" label={t('session.listenWord', { word: target.teachingForm })} />}
          </div>
          {target && target.genders.length > 0 && <p className="muted">{genderLabel(target, t)}</p>}
          {target && (
            <div className="flashcard-example">
              <ListenButton text={target.context.sentence} lang={plan.lang} variant="icon" label={t('session.listenSentence')} />
              <span><span lang={plan.lang}>{target.context.sentence}</span> <span className="muted">– {target.context.translation[motherTongue]}</span></span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Matching (P2-02): mother-tongue meanings and French forms in two independently shuffled columns.
 * Select one item on either side, then its partner on the other; pairs stay editable until Continue,
 * which locks one point unit per French form; the page is then checked in place (P2-04 review).
 */
export function MatchingRenderer(props: RendererProps) {
  const { t } = useI18n();
  const { item, units, plan, seed, mode } = props;
  const [selected, setSelected] = useState<{ side: 'native' | 'learning'; id: string } | null>(null);
  const boxes = useRef(new Map<string, HTMLButtonElement>());
  useEffect(() => {
    if (!selected) return;
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [selected]);
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

  const nativeOrder = seededOrder(options, seed, `${item.itemId}/native`);
  // After Check (or during the success flash) every French word moves level with its correct meaning
  // (P2-04 review): correct words turn green, wrong ones red, and only wrong pairs keep their (red) curve.
  const checked = mode !== 'answering' || !!props.celebrating;
  const outcomeOf = (unitId: string) => (props.locked[unitId]?.outcome ?? (props.celebrating ? 'fully_correct' : undefined));
  const isWrong = (unitId: string) => checked && outcomeOf(unitId) !== 'fully_correct';
  const shuffled = seededOrder(choiceUnits, seed, `${item.itemId}/learning`);
  const learningOrder = checked ? [...choiceUnits].sort((a, b) => nativeOrder.findIndex((o) => o.id === a.correct[0]) - nativeOrder.findIndex((o) => o.id === b.correct[0])) : shuffled;
  const pairNumber = new Map(learningOrder.filter((u) => pairOf(u.id) && (!checked || isWrong(u.id))).map((u, n) => [u.id, n + 1]));
  const unitForOption = (optionId: string) => choiceUnits.find((u) => pairOf(u.id) === optionId);
  const assign = (unitId: string, optionId: string) => {
    for (const other of choiceUnits) if (other.id !== unitId && pairOf(other.id) === optionId) props.onChange(other.id, '');
    props.onChange(unitId, optionId);
    setSelected(null);
  };
  const pick = (side: 'native' | 'learning', id: string) => {
    if (checked) return;
    if (selected && selected.side !== side) {
      if (side === 'learning') assign(id, selected.id);
      else assign(selected.id, id);
    } else setSelected(selected?.side === side && selected.id === id ? null : { side, id });
  };
  const assigned = choiceUnits.filter((u) => pairOf(u.id)).length;
  const current = selected ? (selected.side === 'native' ? nativeText(selected.id) : formLabel(selected.id)) : '';
  const register = (key: string) => (element: HTMLButtonElement | null) => { if (element) boxes.current.set(key, element); else boxes.current.delete(key); };
  // While a paired word is being reassigned, its current curve is hidden; Esc restores it.
  const selectedKey = selected && `${selected.side}:${selected.id}`;
  const pairs = choiceUnits.flatMap((u) => (pairOf(u.id) && (!checked || isWrong(u.id) || props.celebrating) ? [[`native:${pairOf(u.id)}`, `learning:${u.id}`] as const] : []))
    .filter(([from, to]) => from !== selectedKey && to !== selectedKey);
  const right = choiceUnits.filter((u) => outcomeOf(u.id) === 'fully_correct').length;
  return (
    <div className={`matching${checked ? ' is-checked' : ''}`}>
      {checked && !props.celebrating
        ? <p className="match-summary" role="status"><strong>{t('session.matchSummary', { correct: right, total: choiceUnits.length })}</strong></p>
        : <p className="muted">{t('session.matchHint')}</p>}
      <MatchingCurves pairs={pairs} selected={selectedKey} boxes={boxes} arranged={checked} celebrating={!!props.celebrating}>
        <div className="matching-columns" style={{ '--rows': choiceUnits.length } as CSSProperties}>
          <ul aria-label={t(`locale.${props.motherTongue}`)}>
            {nativeOrder.map((o) => {
              const unit = unitForOption(o.id);
              const n = unit ? pairNumber.get(unit.id) : undefined;
              return (
                <li key={o.id}>
                  <button type="button" ref={register(`native:${o.id}`)} className={`match-item${n ? ' is-paired' : ''}`} disabled={checked} aria-pressed={selected?.side === 'native' && selected.id === o.id}
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
              const target = targetOf(u.id);
              return (
                <li key={u.id} className="match-cell" data-flip={u.id}>
                  <button type="button" ref={register(`learning:${u.id}`)} disabled={checked}
                    className={`match-item${n ? ' is-paired' : ''}${checked && !props.celebrating ? (isWrong(u.id) ? ' is-wrong' : ' is-right') : ''}`} lang={plan.lang} aria-pressed={selected?.side === 'learning' && selected.id === u.id}
                    aria-label={n ? t('session.pairedWith', { item: formLabel(u.id), partner: nativeText(pairOf(u.id)!) }) : formLabel(u.id)} onClick={() => pick('learning', u.id)}>
                    <span>{target?.teachingForm}{target?.genders.length ? <small>{genderLabel(target, t)}</small> : null}</span>{n && <span className="pair-badge" aria-hidden="true">{n}</span>}
                  </button>
                  {/* A separate control (buttons cannot nest), drawn inside the box after the word. */}
                  {target && <span className="match-audio"><ListenButton text={target.teachingForm} lang={plan.lang} variant="icon" label={t('session.listenWord', { word: target.teachingForm })} /></span>}
                </li>
              );
            })}
          </ul>
        </div>
      </MatchingCurves>
      {!checked && (
        <p className="muted" aria-live="polite">
          {current ? t('session.matchSelected', { item: current }) : ''} {t('session.pairsAssigned', { n: assigned, total: choiceUnits.length })}
        </p>
      )}
    </div>
  );
}

const WIDE_MATCHING = '(min-width: 720px)';
/** Duration of the slide after Check (the success pause in SessionView allows for it). */
export const MATCH_SLIDE_MS = 1200;
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener('change', notify);
      return () => list?.removeEventListener('change', notify);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/**
 * Wide-screen matching overlay: a Bézier curve joins each pair from the inner middle of the left box
 * to the inner middle of the right box; while a box is selected, a live curve follows the pointer.
 * Phones keep the numbered badges instead (the overlay is not rendered).
 */
function MatchingCurves({ pairs, selected, boxes, arranged = false, celebrating = false, children }: {
  pairs: readonly (readonly [string, string])[]; selected: string | null; boxes: RefObject<Map<string, HTMLButtonElement>>; arranged?: boolean; celebrating?: boolean; children: ReactNode;
}) {
  const wide = useMediaQuery(WIDE_MATCHING);
  const frame = useRef<HTMLDivElement>(null);
  // When the French column is re-sorted after Check, each box glides from its old row to the new one
  // frame by frame, and the curves are redrawn every frame so they move with the boxes (P2-04 review).
  // The slide shows where each word belongs, so it also plays under reduced motion (P2-04 review:
  // Windows reports reduced motion whenever its animation effects are off).
  const tops = useRef(new Map<string, number>());
  const wasArranged = useRef(arranged);
  const animating = useRef(false);
  const [, setFrame] = useState(0);
  useLayoutEffect(() => {
    const cells = [...(frame.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])];
    if (arranged && !wasArranged.current) {
      const deltas = cells.map((cell) => [cell, (tops.current.get(cell.dataset.flip!) ?? cell.getBoundingClientRect().top) - cell.getBoundingClientRect().top] as const);
      const start = performance.now();
      animating.current = true;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / MATCH_SLIDE_MS);
        const eased = t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2; // starts slowly, speeds up, settles
        for (const [cell, delta] of deltas) cell.style.transform = t < 1 && delta ? `translateY(${delta * (1 - eased)}px)` : '';
        setFrame((n) => n + 1); // redraw the curves at the boxes' current positions
        if (t < 1) requestAnimationFrame(step);
        else animating.current = false;
      };
      for (const [cell, delta] of deltas) if (delta) cell.style.transform = `translateY(${delta}px)`;
      requestAnimationFrame(step);
    }
    wasArranged.current = arranged;
  }, [arranged]);
  // The rows before Check, measured after every unchecked render, are where the slide starts.
  useLayoutEffect(() => {
    if (arranged || animating.current) return;
    const cells = [...(frame.current?.querySelectorAll<HTMLElement>('[data-flip]') ?? [])];
    tops.current = new Map(cells.map((cell) => [cell.dataset.flip!, cell.getBoundingClientRect().top]));
  });
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [paths, setPaths] = useState<{ pairs: string[]; live: string | null }>({ pairs: [], live: null });
  const [, setLayout] = useState(0);
  useEffect(() => {
    if (!frame.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setLayout((n) => n + 1));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!wide || !frame.current) return;
    const origin = frame.current.getBoundingClientRect();
    const anchor = (key: string) => {
      const box = boxes.current.get(key)?.getBoundingClientRect();
      if (!box) return undefined;
      return { x: (key.startsWith('native:') ? box.right : box.left) - origin.left, y: box.top + box.height / 2 - origin.top };
    };
    const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = Math.max(40, Math.abs(b.x - a.x) / 2) * (b.x >= a.x ? 1 : -1);
      return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
    };
    const next = {
      pairs: pairs.flatMap(([from, to]) => { const a = anchor(from), b = anchor(to); return a && b ? [curve(a, b)] : []; }),
      live: (() => {
        const a = selected ? anchor(selected) : undefined;
        if (!a || !pointer || !selected) return null;
        // Over a box of the other column, the curve stops at that box's inner border instead of crossing it.
        const otherSide = selected.startsWith('native:') ? 'learning:' : 'native:';
        for (const [key, element] of boxes.current) {
          if (!key.startsWith(otherSide)) continue;
          const r = element.getBoundingClientRect();
          const x = pointer.x + origin.left, y = pointer.y + origin.top;
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return curve(a, { x: (otherSide === 'learning:' ? r.left : r.right) - origin.left, y: pointer.y });
        }
        return curve(a, pointer);
      })(),
    };
    if (JSON.stringify(next) !== JSON.stringify(paths)) setPaths(next);
  });
  return (
    <div
      ref={frame}
      className={`matching-frame${wide ? ' is-wide' : ''}`}
      onPointerMove={(e) => {
        if (!wide || !selected || !frame.current) return;
        const origin = frame.current.getBoundingClientRect();
        setPointer({ x: e.clientX - origin.left, y: e.clientY - origin.top });
      }}
      onPointerLeave={() => setPointer(null)}
    >
      {children}
      {wide && (
        <svg className="match-curves" aria-hidden="true">
          {paths.pairs.map((d, n) => <path key={n} d={d} className={`match-curve${arranged && !celebrating ? ' is-checked' : ''}`} />)}
          {selected && paths.live && <path d={paths.live} className="match-curve match-curve-live" />}
        </svg>
      )}
    </div>
  );
}

export function OverviewRenderer({ item, plan, motherTongue }: RendererProps) {
  if (item.type !== 'vocabulary_overview') return null;
  return <TargetTable ids={item.targetIds} plan={plan} motherTongue={motherTongue} showGender={false} />;
}

/**
 * Stage 4 gender page (P2-03): every word of the lesson on one page, which stays the same after
 * "Check". While answering, nouns show their bare term with masculine/feminine choices and a speaker
 * that reads only the bare term (no article or gender clue); other words show no input. After Check
 * the choices are marked in place: a correct choice has a green border, a wrong choice a red border
 * and the correct gender is highlighted in green; the word shows its teaching form and translation,
 * without explanations. The button then reads Continue.
 */
export function GenderRenderer(props: RendererProps) {
  const { t } = useI18n();
  const { item, units, plan, mode, motherTongue } = props;
  if (item.type !== 'vocabulary_gender_select') return null;
  const unitOf = (id: string) => units.find((u): u is PlanUnit & { kind: 'choice' } => u.kind === 'choice' && u.correct.length > 0 && u.id.endsWith(`/${id}`));
  const value = (unitId: string) => (props.locked[unitId]?.response ?? props.drafts[unitId]) as string | undefined;
  const checked = mode === 'feedback';
  const scored = item.targetIds.map(unitOf).filter((u): u is PlanUnit & { kind: 'choice' } => !!u);
  const right = scored.filter((u) => props.locked[u.id]?.outcome === 'fully_correct').length;
  const optionState = (unit: PlanUnit & { kind: 'choice' }, id: string) => {
    if (!checked) return '';
    const chosen = value(unit.id) === id, correct = unit.correct.includes(id);
    return chosen && correct ? ' is-right' : chosen ? ' is-wrong' : correct ? ' is-answer' : '';
  };

  return (
    <div className="gender-page">
      {/* The summary line is reserved before Check (invisible), so nothing moves when it appears. */}
      <p className={`match-summary${checked ? '' : ' is-reserved'}`} aria-hidden={!checked || undefined}>
        <strong>{t('session.genderSummary', { correct: right, total: scored.length })}</strong>
      </p>
      <ul className="gender-grid">
        {item.targetIds.map((id) => {
          const target = plan.targets.get(id);
          const unit = unitOf(id);
          const wrong = checked && !!unit && props.locked[unit.id]?.outcome !== 'fully_correct';
          const shown = checked ? target?.teachingForm ?? id : target?.term ?? id;
          return (
            <li key={id} className={`gender-row${checked && unit ? (wrong ? ' is-wrong' : ' is-right') : ''}`}>
              <div className="gender-word">
                {target && <ListenButton text={shown} lang={plan.lang} variant="icon" label={t('session.listenWord', { word: shown })} />}
                {/* Both versions share one grid cell, so the card keeps its size when Check reveals the teaching form. */}
                <span className="gender-label">
                  <span className={checked ? 'is-hidden' : undefined} aria-hidden={checked || undefined}>
                    <span className="gender-lemma" lang={plan.lang}>{target?.term ?? id}</span>
                  </span>
                  <span className={checked ? undefined : 'is-hidden'} aria-hidden={!checked || undefined}>
                    <span className="gender-lemma" lang={plan.lang}>{target?.teachingForm ?? id}</span>
                    <small className="muted">{target?.translations[motherTongue]?.join(' / ')}</small>
                  </span>
                </span>
              </div>
              {unit ? (
                <fieldset className="gender-options" disabled={checked || !!props.locked[unit.id]}>
                  <legend className="visually-hidden">{t('session.genderOf', { word: target?.term ?? id })}</legend>
                  {unit.options.map((o) => (
                    <label key={o.id} className={`gender-option${optionState(unit, o.id)}`}>
                      <input type="radio" name={unit.id} value={o.id} checked={value(unit.id) === o.id} onChange={() => props.onChange(unit.id, o.id)} />
                      <span>{t(o.text as MessageKey)}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <span className="muted">{t('session.noGender')}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}


