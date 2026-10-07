import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';

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
  const { t, languageName } = useI18n();
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
          <p className="flashcard-side">{t(`locale.${motherTongue}`)}</p>
          <p className="flashcard-meaning">{target?.translations[motherTongue]?.join(' / ') ?? id}</p>
        </div>
        <div className="flashcard-face flashcard-back" inert={!flipped}>
          <p className="flashcard-side">{languageName(plan.lang)}</p>
          <p className="flashcard-form">
            <span lang={plan.lang}>{target?.teachingForm}</span>
            {target && <ListenButton text={target.teachingForm} lang={plan.lang} variant="icon" size="large" label={t('session.listenWord', { word: target.teachingForm })} />}
          </p>
          {target && target.genders.length > 0 && <p className="muted">{genderLabel(target, t)}</p>}
          {target && (
            <p className="flashcard-example">
              <ListenButton text={target.context.sentence} lang={plan.lang} variant="icon" label={t('session.listenSentence')} />
              <span><span lang={plan.lang}>{target.context.sentence}</span> <span className="muted">– {target.context.translation[motherTongue]}</span></span>
            </p>
          )}
        </div>
      </div>
    </article>
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
  const boxes = useRef(new Map<string, HTMLButtonElement>());
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
    // Only mistakes and their corrections are listed; correct pairs need no review.
    const mistakes = choiceUnits.filter((unit) => props.locked[unit.id]?.outcome !== 'fully_correct');
    return (
      <div className="units">
        {mistakes.map((unit) => (
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
  const register = (key: string) => (element: HTMLButtonElement | null) => { if (element) boxes.current.set(key, element); else boxes.current.delete(key); };
  const pairs = choiceUnits.flatMap((u) => (pairOf(u.id) ? [[`native:${pairOf(u.id)}`, `learning:${u.id}`] as const] : []));
  return (
    <div className="matching">
      <p className="muted">{t('session.matchHint')}</p>
      <MatchingCurves pairs={pairs} selected={selected && `${selected.side}:${selected.id}`} boxes={boxes}>
        <div className="matching-columns">
          <ul aria-label={t(`locale.${props.motherTongue}`)}>
            {nativeOrder.map((o) => {
              const unit = unitForOption(o.id);
              const n = unit ? pairNumber.get(unit.id) : undefined;
              return (
                <li key={o.id}>
                  <button type="button" ref={register(`native:${o.id}`)} className={`match-item${n ? ' is-paired' : ''}`} aria-pressed={selected?.side === 'native' && selected.id === o.id}
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
                <li key={u.id} className="match-cell">
                  <button type="button" ref={register(`learning:${u.id}`)} className={`match-item${n ? ' is-paired' : ''}`} lang={plan.lang} aria-pressed={selected?.side === 'learning' && selected.id === u.id}
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
      <p className="muted" aria-live="polite">
        {current ? t('session.matchSelected', { item: current }) : ''} {t('session.pairsAssigned', { n: assigned, total: choiceUnits.length })}
      </p>
    </div>
  );
}

const WIDE_MATCHING = '(min-width: 720px)';
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
function MatchingCurves({ pairs, selected, boxes, children }: {
  pairs: readonly (readonly [string, string])[]; selected: string | null; boxes: RefObject<Map<string, HTMLButtonElement>>; children: ReactNode;
}) {
  const wide = useMediaQuery(WIDE_MATCHING);
  const frame = useRef<HTMLDivElement>(null);
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
          {paths.pairs.map((d, n) => <path key={n} d={d} className="match-curve" />)}
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

export function GenderRenderer(props: RendererProps) {
  // While answering, only lemmas are shown; the reviewed overview follows once the choices are locked.
  return (
    <>
      <UnitsRenderer {...props} />
      {props.mode === 'feedback' && props.item.type === 'vocabulary_gender_select' && <TargetTable ids={props.item.targetIds} plan={props.plan} motherTongue={props.motherTongue} />}
    </>
  );
}

