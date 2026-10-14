import { Fragment, useId, useRef, useState, type CSSProperties } from 'react';
import { buildPlan, type PlanUnit } from '../domain/session/plan.ts';
import { RichText } from '../components/RichText.tsx';
import type { Brief, LessonContent } from '../schemas/artifacts.ts';
import { useBriefText, Learn, SummaryLine, ScoringNote } from './briefParts.tsx';
import { ReadingItemReview } from './ReadingItemReview.tsx';

const COPY = {
  en: { subject: 'Subject', form: 'Form', outline: 'Lesson outline', pages: 'Lesson pages', page: 'Page', answers: 'Accepted answers', options: 'Options', explanation: 'Answer explanation', units: 'Point units', references: 'Reference words', timer: 'Countdown limit', noTimer: 'No countdown', front: 'Front', back: 'Back', placeholder: 'Personalised production feedback is planned for a later phase.', rules: 'Rules', accents: 'Meaning-sensitive accents', type: 'Task type', correction: 'Correction' },
  fr: { subject: 'Sujet', form: 'Forme', outline: 'Plan de la leçon', pages: 'Pages de la leçon', page: 'Page', answers: 'Réponses acceptées', options: 'Options', explanation: 'Explication de la réponse', units: 'Unités de points', references: 'Mots de référence', timer: 'Limite du compte à rebours', noTimer: 'Sans compte à rebours', front: 'Recto', back: 'Verso', placeholder: 'Le retour personnalisé sur la production est prévu pour une phase ultérieure.', rules: 'Règles', accents: 'Accents qui changent le sens', type: 'Type de tâche', correction: 'Correction' },
  de: { subject: 'Subjekt', form: 'Form', outline: 'Lektionsübersicht', pages: 'Lektionsseiten', page: 'Seite', answers: 'Akzeptierte Antworten', options: 'Optionen', explanation: 'Erklärung der Antwort', units: 'Punkteinheiten', references: 'Referenzwörter', timer: 'Zeitlimit', noTimer: 'Kein Countdown', front: 'Vorderseite', back: 'Rückseite', placeholder: 'Persönliches Feedback zur Produktion ist für eine spätere Phase vorgesehen.', rules: 'Regeln', accents: 'Bedeutungsrelevante Akzente', type: 'Aufgabentyp', correction: 'Korrektur' },
};

/** Builds presentation data only. No session hook, timer, storage or answer controls. */
export function ContentReview({ content, brief }: { content: LessonContent; brief: Brief }) {
  const text = useBriefText(content.lang);
  const copy = COPY[text.locale];
  const plan = buildPlan(content, brief, text.nativeLocale);
  const [selectedId, setSelectedId] = useState(plan.pages[0].pageId);
  const selected = plan.pages.find((pg) => pg.pageId === selectedId) ?? plan.pages[0];
  const navigationId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const color = (index: number) => ({ '--review-color': ['#a5b4fc', '#67e8f9', '#86efac', '#fcd34d', '#fda4af', '#d8b4fe'][index % 6] }) as CSSProperties;
  const learning = (s: string) => <Learn lang={content.lang}>{s}</Learn>;
  const optionText = (s: string, lang: string) => lang === 'ui' && s.startsWith('gender.') ? text.t(s as 'gender.masculine') : s;
  const unitAnswer = (u: PlanUnit) => {
    if (u.kind === 'text') return u.accepted.answers.join(' / ');
    if (u.kind === 'order') return u.acceptedOrders.map((order) => order.map((id) => u.tokens.find((t) => t.id === id)!.text).join(' ')).join(' / ');
    if (u.kind === 'spot') return u.correction.accepted.answers.join(' / ');
    return u.correct.map((id) => { const o = u.options.find((o) => o.id === id)!; return optionText(o.text, o.lang); }).join(' / ');
  };
  return <>
    <SummaryLine items={[text.t('brief.summary.minutes', { minutes: content.estimatedMinutes }), text.t('brief.summary.translation', { locale: text.languageName(text.nativeLocale) }), text.t('brief.summary.explanations', { locale: text.languageName(text.locale) })]} />
    <p>{text.ui(content.objective)}</p>
    <ScoringNote scoring={brief.scoring} />
    <nav className="content-outline" aria-label={copy.outline}>
      <h3>{copy.outline}</h3>
      <ol>{content.steps.map((step, si) => {
        const pages = plan.pages.filter((pg) => pg.stepId === step.id);
        return <li key={step.id} style={color(si)}><button type="button" aria-current={selected.stepId === step.id ? 'step' : undefined} onClick={() => setSelectedId(pages[0].pageId)}>
          <span>{text.ui(step.label)}</span><small>{copy.page} {pages[0].index + 1}{pages.length > 1 && `–${pages.at(-1)!.index + 1}`}</small>
        </button></li>;
      })}</ol>
    </nav>
    <div className="content-page-navigation">
      <div className="content-tabs" role="tablist" aria-label={copy.pages}>
        {content.steps.map((step, si) => <div key={step.id} className="content-tab-group" role="presentation" style={color(si)}>
          <div className="content-tab-group-title">{si + 1}. {text.ui(step.label)}</div>
          <div className="content-tab-buttons" role="presentation">
            {plan.pages.filter((pg) => pg.stepId === step.id).map((pg) => <button
              key={pg.pageId} type="button" role="tab" id={`${navigationId}-tab-${pg.index}`}
              aria-controls={`${navigationId}-panel`} aria-selected={selected.pageId === pg.pageId}
              tabIndex={selected.pageId === pg.pageId ? 0 : -1}
              ref={(element) => { tabs.current[pg.index] = element; }}
              onClick={() => setSelectedId(pg.pageId)}
              onKeyDown={(event) => {
                const index = event.key === 'ArrowRight' ? (pg.index + 1) % plan.pages.length
                  : event.key === 'ArrowLeft' ? (pg.index + plan.pages.length - 1) % plan.pages.length
                  : event.key === 'Home' ? 0 : event.key === 'End' ? plan.pages.length - 1 : undefined;
                if (index === undefined) return;
                event.preventDefault();
                setSelectedId(plan.pages[index].pageId);
                tabs.current[index]?.focus();
              }}
            >{copy.page} {pg.index + 1}</button>)}
          </div>
        </div>)}
      </div>
    </div>
    <div role="tabpanel" id={`${navigationId}-panel`} aria-labelledby={`${navigationId}-tab-${selected.index}`} tabIndex={0}>
    {content.steps.map((step, si) => step.id === selected.stepId && <section key={step.id} className="brief-block content-selected-step" style={color(si)}>
      <h3>{si + 1}. {text.ui(step.label)}</h3>
      {plan.pages.filter((pg) => pg.pageId === selected.pageId).map((pg) => <section key={pg.pageId} className="content-page">
        <h4>{copy.page} {pg.index + 1} <small className="muted">({pg.pageId})</small></h4>
        <p className="muted">{text.duration(pg.estimatedDurationS)} · {pg.timeLimitS === null ? copy.noTimer : `${copy.timer}: ${text.duration(pg.timeLimitS)}`} · {copy.units}: {pg.units.length}</p>
        <p>{text.ui(pg.instructions)}</p>
        {pg.items.map((item) => <article key={item.itemId} className="content-item">
          <p className="muted">{copy.type}: <code>{item.type}</code> · <code>{item.itemId}</code></p>
          {'ruleIds' in item && <p>{copy.rules}: {item.ruleIds.join(', ')}</p>}
          {item.type === 'grammar_explanation' && <>
            <h5>{text.ui(item.heading)}</h5><RichText text={text.ui(item.text)} lang={content.lang} />
            {item.formTable.length > 0 && <div className="table-wrap"><table className="data-table"><thead><tr><th>{copy.subject}</th><th>{copy.form}</th><th>{text.t('brief.col.example')}</th></tr></thead><tbody>{item.formTable.map((r, i) => <tr key={i}><td>{learning(r.subject)}</td><td>{learning(r.form)}</td><td>{r.example && learning(r.example)}</td></tr>)}</tbody></table></div>}
            <ul>{item.examples.map((e, i) => <li key={i}>{learning(e.text)} — <span lang={text.nativeLocale}>{text.native(e.translation)}</span></li>)}</ul>
          </>}
          {item.type === 'production_feedback_placeholder' && <p>{copy.placeholder}</p>}
          {item.type.startsWith('reading_') && <ReadingItemReview item={item as Extract<typeof item, { type: `reading_${string}` }>} plan={plan} />}
          {(item.type === 'grammar_gap_typing' || item.type === 'grammar_gap_choice') && item.hint && <p>{text.ui(item.hint)}</p>}
          {item.type === 'vocabulary_introduction' && <RichText text={text.ui(item.text)} lang={content.lang} />}
          {'targetIds' in item && <div className="table-wrap"><table className="data-table"><thead><tr><th>{item.type === 'vocabulary_flashcards' ? copy.front : text.t('brief.col.target')}</th><th>{item.type === 'vocabulary_flashcards' ? copy.back : text.t('brief.col.translation', { locale: text.languageName(text.nativeLocale) })}</th><th>{text.t('brief.col.gender')}</th></tr></thead><tbody>{item.targetIds.map((id) => {
            const t = plan.targets.get(id)!;
            return <tr key={id}><td>{learning(t.teachingForm)}<br /><small>{t.pronunciation}</small></td><td lang={text.nativeLocale}>{text.native(t.translations)?.join(' / ')}</td><td>{t.genders.map((g) => text.t(`gender.${g}`)).join(' / ')}</td></tr>;
          })}</tbody></table></div>}
          {item.type === 'vocabulary_typed_gap' && <p>{copy.references}: {item.referenceTargetIds.map((id) => plan.targets.get(id)!.term).join(' · ')}</p>}
          {pg.units.filter((u) => u.itemId === item.itemId).map((u) => <div className="content-answer" key={u.id}>
            <p><code>{u.id}</code> · {copy.units}: 1</p>
            <p>{u.prompt.native && <span lang={text.nativeLocale}>{u.prompt.native} </span>}{u.prompt.learning && learning(u.prompt.learning)}{u.prompt.before !== undefined && learning(`${u.prompt.before} ___ ${u.prompt.after ?? ''}`)}</p>
            {u.speak && <p>{text.t('brief.pronunciation', { value: ('targetId' in item && plan.targets.get(item.targetId)?.pronunciation) || u.speak })}</p>}
            {(u.kind === 'choice' || u.kind === 'order' || u.kind === 'spot') && <p>{copy.options}: {(u.kind === 'choice' ? u.options : u.tokens).map((o, i) => <Fragment key={o.id}>{i > 0 && ' · '}<span lang={o.lang === 'native' ? text.nativeLocale : o.lang === 'learning' ? content.lang : text.locale}>{optionText(o.text, o.lang)}</span></Fragment>)}</p>}
            <p><strong>{copy.answers}: </strong><span lang={u.answerLang === 'native' ? text.nativeLocale : u.answerLang === 'learning' ? content.lang : text.locale}>{unitAnswer(u)}</span>{u.form && <> · {learning(u.form)}</>}</p>
            {u.kind === 'text' && u.accepted.accentSensitive.length > 0 && <p>{copy.accents}: {u.accepted.accentSensitive.join(', ')}</p>}
            {u.kind === 'spot' && <p>{copy.correction}: {u.tokens.find((t) => t.id === u.faultyTokenId)?.text} → {u.correction.accepted.answers.join(' / ')} ({u.correction.mode}) {u.correction.choices.join(' / ')}</p>}
            <p><strong>{copy.explanation}: </strong>{text.ui(u.explanation)}</p>
          </div>)}
        </article>)}
      </section>)}
    </section>)}
    </div>
  </>;
}
