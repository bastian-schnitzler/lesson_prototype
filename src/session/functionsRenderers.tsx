import { useState, type ReactNode } from 'react';

import { useI18n } from '../app/context.tsx';
import { expressionDisplay } from '../domain/functionsLesson.ts';
import type { LessonPlan } from '../domain/session/plan.ts';
import type { Locale } from '../schemas/common.ts';
import { Gap, ListenButton, TextControl, UnitsRenderer, type RendererProps } from './controls.tsx';

/**
 * Function lesson presentation renderers (SPEC section 8, P4-04): expression and word flashcards and
 * the model dialogue. Function matching uses the shared matching board (MatchingRenderer).
 */

type Native = Partial<Record<Locale, string>>;
const translation = (map: Partial<Record<Locale, string[]>>, locale: Locale) => map[locale]?.join(' / ') ?? '';

/**
 * Flashcards as in vocabulary (P4-05 review): the mother-tongue translation on the front; the French
 * expression or word with audio, its explanation or gender and the example sentence on the back. The
 * words come first, because the examples often use them. Every card is turned once before Continue.
 */
export function FunctionFlashcardsRenderer({ item, plan, motherTongue, pageId, revealed, onReveal }: RendererProps) {
  const { t } = useI18n();
  if (item.type !== 'function_flashcards' || !plan.functions) return null;
  const itemKey = `${pageId}/${item.itemId}`;
  const seen = revealed[itemKey] ?? [];
  return (
    <div className="flashcard-deck">
      <p className="label-muted" aria-live="polite">{t('session.cardsRevealed', { n: seen.filter((s) => item.ids.includes(s)).length, total: item.ids.length })}</p>
      <ul className="flashcard-grid">
        {item.ids.map((id, n) => (
          <li key={id}>
            <FunctionCard id={id} label={t('session.cardOf', { n: n + 1, total: item.ids.length })} plan={plan} motherTongue={motherTongue}
              initiallyFlipped={seen.includes(id)} onFlip={() => onReveal(itemKey, id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FunctionCard({ id, label, plan, motherTongue, initiallyFlipped, onFlip }: {
  id: string; label: string; plan: LessonPlan; motherTongue: Locale; initiallyFlipped: boolean; onFlip: () => void;
}) {
  const { t, locale } = useI18n();
  const [flipped, setFlipped] = useState(initiallyFlipped);
  const flip = () => {
    if (!flipped) onFlip();
    setFlipped(!flipped);
  };
  const expression = plan.functions!.expressions.find((e) => e.id === id);
  const word = plan.functions!.words.find((w) => w.id === id);
  const term = expression ?? word;
  if (!term) return null;
  // The expression is spoken without the ellipsis of a sentence start.
  const french = expression ? expressionDisplay(expression) : word!.teachingForm;
  const spoken = expression ? expression.text : word!.teachingForm;
  const frenchFace = (
    <div className="flashcard-form">
      <span lang={plan.lang}>{french}</span>
      <ListenButton text={spoken} lang={plan.lang} variant="icon" size="large" label={t('session.listenWord', { word: french })} />
    </div>
  );
  const example = (
    <div className="flashcard-example">
      <ListenButton text={term.example.text} lang={plan.lang} variant="icon" label={t('session.listenSentence')} />
      <span><span lang={plan.lang}>{term.example.text}</span> <span className="muted">– {(term.example.translation as Native)[motherTongue]}</span></span>
    </div>
  );
  const meaning = <p className="flashcard-meaning" lang={motherTongue}>{translation(term.translations as Partial<Record<Locale, string[]>>, motherTongue)}</p>;
  return (
    <article className={`flashcard${flipped ? ' is-flipped' : ''}`} aria-label={label}>
      <button type="button" className="flip-button" aria-pressed={flipped}
        aria-label={flipped ? t('session.flipBack') : t('session.flipCard')} onClick={flip}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div className="flashcard-inner">
        <div className="flashcard-face flashcard-front" inert={flipped}>
          {meaning}
        </div>
        <div className="flashcard-face flashcard-back" inert={!flipped}>
          {frenchFace}
          {expression ? <p className="muted">{term.explanation[locale]}</p> : word!.genders.length > 0 && <p className="muted">{word!.genders.map((g) => t(`gender.${g}`)).join(' / ')}</p>}
          {example}
        </div>
      </div>
    </article>
  );
}

/** Marks the lesson's expressions inside a dialogue line. */
function withExpressions(text: string, expressions: { text: string }[]): ReactNode[] {
  const lower = text.toLowerCase();
  const spans: [number, number][] = [];
  for (const e of expressions) {
    const needle = e.text.replace(/[\s.!?…]+$/u, '').toLowerCase();
    const at = needle ? lower.indexOf(needle) : -1;
    if (at >= 0 && !spans.some(([s, end]) => at < end && at + needle.length > s)) spans.push([at, at + needle.length]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let pos = 0;
  for (const [s, end] of spans) {
    if (s > pos) out.push(text.slice(pos, s));
    out.push(<strong key={s} className="expression-mark">{text.slice(s, end)}</strong>);
    pos = end;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

/**
 * Model dialogue: the lines appear one after another (the footer button reads Next line until the last
 * line is shown, then Continue), alternately left and right. A line can be turned to show its
 * translation and note without changing its size; turning is optional.
 */
export function DialogueRenderer({ item, plan, motherTongue, pageId, revealed }: RendererProps) {
  const { t } = useI18n();
  if (item.type !== 'function_dialogue' || !plan.functions) return null;
  const shown = new Set([item.lines[0].lineId, ...(revealed[`${pageId}/${item.itemId}`] ?? [])]);
  const lines = item.lines.filter((l) => shown.has(l.lineId));
  return (
    <div className="dialogue">
      <ol className="dialogue-lines">
        {lines.map((line) => (
          <li key={line.lineId} className={`dialogue-line${plan.functions!.roles[1].id === line.roleId ? ' is-second' : ''}`}>
            <DialogueLine line={line} plan={plan} motherTongue={motherTongue} />
          </li>
        ))}
      </ol>
      <p className="label-muted" aria-live="polite">{t('session.lineOf', { n: lines.length, total: item.lines.length })}</p>
    </div>
  );
}

function DialogueLine({ line, plan, motherTongue }: { line: Extract<RendererProps['item'], { type: 'function_dialogue' }>['lines'][number]; plan: LessonPlan; motherTongue: Locale }) {
  const { t, locale } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const role = plan.functions!.roles.find((r) => r.id === line.roleId);
  return (
    <article className={`flashcard dialogue-card${flipped ? ' is-flipped' : ''}`} aria-label={role?.label}>
      <button type="button" className="flip-button" aria-pressed={flipped} aria-label={flipped ? t('session.flipBack') : t('session.flipToTranslation')} onClick={() => setFlipped(!flipped)}>
        <span aria-hidden="true">⟲</span>
      </button>
      <div className="flashcard-inner">
        <div className="flashcard-face flashcard-front" inert={flipped}>
          <p className="dialogue-role" lang={plan.lang}>{role?.label}</p>
          <div className="dialogue-text">
            <ListenButton text={line.text} lang={plan.lang} variant="icon" label={t('session.listenSentence')} />
            <span lang={plan.lang}>{withExpressions(line.text, plan.functions!.expressions)}</span>
          </div>
        </div>
        <div className="flashcard-face flashcard-back" inert={!flipped}>
          <p className="dialogue-role" lang={motherTongue}>{(role?.translation as Native | undefined)?.[motherTongue]}</p>
          <p lang={motherTongue}>{(line.translation as Native)[motherTongue]}</p>
          <p className="muted">{line.note[locale]}</p>
        </div>
      </div>
    </article>
  );
}

/** Role A's line above a task (dialogue gaps, exam replies), with its role label and audio. */
function ContextLine({ roleId, text, plan }: { roleId: string; text: string; plan: LessonPlan }) {
  const { t } = useI18n();
  const role = plan.functions?.roles.find((r) => r.id === roleId);
  return (
    <div className="dialogue-context">
      <p className="dialogue-role" lang={plan.lang}>{role?.label}</p>
      <div className="dialogue-text">
        <ListenButton text={text} lang={plan.lang} variant="icon" label={t('session.listenSentence')} />
        <span lang={plan.lang}>{text}</span>
      </div>
    </div>
  );
}

const RoleLabel = ({ roleId, plan }: { roleId: string | null; plan: LessonPlan }) =>
  roleId ? <p className="dialogue-role dialogue-reply-role" lang={plan.lang}>{plan.functions?.roles.find((r) => r.id === roleId)?.label}</p> : null;

/**
 * Word order (SPEC section 8): practice shows the tokens only; an exam reply stands under role A's line
 * and its bank also holds the distractors ("Not every word fits").
 */
export function FunctionWordOrderRenderer(props: RendererProps) {
  const { item, plan } = props;
  if (item.type !== 'function_word_order') return null;
  return (
    <div className={item.context ? 'dialogue-task' : undefined}>
      {item.context && <ContextLine roleId={item.context.roleId} text={item.context.text} plan={plan} />}
      <RoleLabel roleId={item.roleId} plan={plan} />
      <UnitsRenderer {...props} />
    </div>
  );
}

/** Dialogue gaps: role A's line, then role B's line with one gap and four expression choices. */
export function DialogueGapChoiceRenderer(props: RendererProps) {
  const { item, plan } = props;
  if (item.type !== 'function_dialogue_gap_choice') return null;
  return (
    <div className="dialogue-task">
      <ContextLine roleId={item.context.roleId} text={item.context.text} plan={plan} />
      <RoleLabel roleId={item.roleId} plan={plan} />
      <UnitsRenderer {...props} />
    </div>
  );
}

/**
 * Exam part 2: the exam dialogue unrolls line by line on one timed page (the footer button reads Next
 * line until the last line); lines with a gap have a text field, and every field stays editable until
 * the page is submitted.
 */
export function ExamDialogueRenderer(props: RendererProps) {
  const { t } = useI18n();
  const { item, plan, pageId, revealed, units } = props;
  if (item.type !== 'function_dialogue_gap_typing' || !plan.functions) return null;
  const shown = new Set([item.lines[0].lineId, ...(revealed[`${pageId}/${item.itemId}`] ?? [])]);
  const lines = item.lines.filter((l) => shown.has(l.lineId));
  return (
    <div className="dialogue">
      <ol className="dialogue-lines">
        {lines.map((line) => {
          const unit = line.gap ? units.find((u) => u.id.endsWith(`/${line.gap!.gapId}`)) : undefined;
          return (
            <li key={line.lineId} className={`dialogue-line exam-line${plan.functions!.roles[1].id === line.roleId ? ' is-second' : ''}`}>
              <p className="dialogue-role" lang={plan.lang}>{plan.functions!.roles.find((r) => r.id === line.roleId)?.label}</p>
              {unit ? (
                <Gap before={line.before} after={line.after} lang={plan.lang}>
                  <TextControl unit={unit} props={props} label={t('session.gapAnswer')} />
                </Gap>
              ) : <p className="gap-sentence" lang={plan.lang}>{line.before}</p>}
              {/* The mother-tongue line says what to write into the gap (P4-05 review). */}
              <p className="muted exam-translation" lang={props.motherTongue}>{(line.translation as Native)[props.motherTongue]}</p>
            </li>
          );
        })}
      </ol>
      <p className="label-muted" aria-live="polite">{t('session.lineOf', { n: lines.length, total: item.lines.length })}</p>
    </div>
  );
}
