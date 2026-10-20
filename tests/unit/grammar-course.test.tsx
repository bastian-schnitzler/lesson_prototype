import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { scanContentDir } from '../../scripts/catalog.ts';
import { buildPlan, type LessonPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { lessonResults, scoreUnit, sessionReducer, startSession, type SessionAction, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { rendererRegistry } from '../../src/session/renderers.tsx';
import { SessionView } from '../../src/session/views.tsx';
import { LOCALES, type Locale } from '../../src/schemas/common.ts';
import type { GrammarBrief, GrammarContent, GrammarItem } from '../../src/schemas/grammar.ts';

/**
 * P3-06: course audit of every fr/A1 grammar lesson that has content (the ten samples of P3-07; the
 * other 38 outline entries have no artifacts since P2-07 was closed as not planned). Each lesson is
 * checked for current artifacts, supported renderers and complete exam coverage, and played through
 * the real session reducer and scorer with right and wrong answers in every mother tongue.
 */

afterEach(cleanup);
const CONTENT = resolve(import.meta.dirname, '../../content');
const catalog = scanContentDir(CONTENT);
const outline = catalog.outlines.get('fr-a1')!;
const grammar = outline.entries.filter((e) => e.kind === 'grammar');
const authored = grammar.filter((e) => catalog.manifest.artifacts[e.id]?.content);
const read = (folder: string, id: string) => JSON.parse(readFileSync(join(CONTENT, folder, `${id}.json`), 'utf8'));
const lessons = authored.map(({ id }) => ({ id, brief: read('briefs', id) as GrammarBrief, content: read('lessons', id) as GrammarContent }));

/** A response the scorer must accept as fully correct. */
const right = (u: PlanUnit): UnitResponse => (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] });

/** A response the scorer must reject; undefined where every option is right (none in these lessons). */
function wrong(u: PlanUnit): UnitResponse | undefined {
  switch (u.kind) {
    case 'text': return 'zzz';
    case 'choice': return u.options.find((o) => !u.correct.includes(o.id))?.id;
    case 'order': {
      const reversed = [...u.acceptedOrders[0]].reverse();
      return u.acceptedOrders.some((o) => o.join() === reversed.join()) ? undefined : reversed;
    }
    case 'spot': return { tokenId: u.tokens.find((t) => t.id !== u.faultyTokenId)!.id, text: u.correction.accepted.answers[0] };
  }
}

const planOf = (brief: GrammarBrief, content: GrammarContent, motherTongue: Locale = 'en') =>
  buildPlan(content as never, brief as never, motherTongue, { interleaveGroups: true, examIntro: true });

function play(plan: LessonPlan, answer: (u: PlanUnit) => UnitResponse | undefined, onPage?: (r: SessionRecord) => void) {
  let record = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 7, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  for (let guard = 0; record.status === 'active' && guard < 400; guard++) {
    onPage?.(record);
    const page = plan.pages[record.pageIndex];
    if (record.phase === 'answering') for (const u of page.units) {
      const response = answer(u);
      if (response !== undefined) act({ type: 'draft', unitId: u.id, response: response as never, now: 0 });
    }
    act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
  }
  return record;
}

describe('fr/A1 grammar course audit (P3-06)', () => {
  it('has content for exactly the ten sample lessons; the remaining 38 entries have no artifacts', () => {
    expect(grammar).toHaveLength(48);
    expect(authored.map((e) => e.id)).toEqual(grammar.slice(0, 10).map((e) => e.id));
    for (const e of grammar.slice(10)) expect(catalog.manifest.artifacts[e.id]?.draft).toBeUndefined();
  });

  it.each(authored.map((e) => e.id))('%s: brief and content are valid with current input hashes', (id) => {
    const artifacts = catalog.manifest.artifacts[id];
    expect(artifacts?.draft?.status).toBe('valid');
    expect(artifacts?.content?.status).toBe('valid');
  });
});

describe.each(lessons)('$id', ({ brief, content }) => {
  const items = content.steps.flatMap((s) => s.pages.flatMap((p) => p.items)) as GrammarItem[];
  const exam = content.steps.filter((s) => s.role === 'exam').flatMap((s) => s.pages.flatMap((p) => p.items)) as GrammarItem[];
  const plan = planOf(brief, content);

  it('has 2–4 teaching blocks, each with 2–4 exercises', () => {
    expect(brief.blocks.length).toBeGreaterThanOrEqual(2);
    expect(brief.blocks.length).toBeLessThanOrEqual(4);
    for (const block of brief.blocks) expect(block.exercises.length).toBeGreaterThanOrEqual(2);
    for (const block of brief.blocks) expect(block.exercises.length).toBeLessThanOrEqual(4);
  });

  it('uses only item types with a registered renderer', () => {
    for (const it of items) expect(rendererRegistry[it.type], it.type).toBeDefined();
  });

  it('examines every rule in the final exam, with exam-only item types', () => {
    const examined = new Set(exam.flatMap((it) => ('ruleIds' in it ? it.ruleIds : [])));
    expect([...examined].sort()).toEqual(brief.rules.map((r) => r.id).sort());
    for (const it of exam) expect(['grammar_gap_typing', 'grammar_pronoun_form_typing', 'grammar_word_order']).toContain(it.type);
  });

  it('plays with every answer right: 100 points, every unit fully correct', () => {
    const record = play(plan, right);
    expect(record.status).toBe('completed');
    const units = plan.pages.flatMap((p) => p.units);
    for (const u of units) expect(record.locked[u.id]?.outcome, u.id).toBe('fully_correct');
    const results = lessonResults(plan, record);
    expect(results.practiceScore).toBe(100);
    expect(results.examScore).toBe(100);
    expect(results.total).toBe(100);
  });

  it('plays with every answer wrong: 0 points', () => {
    const record = play(plan, wrong);
    expect(record.status).toBe('completed');
    for (const u of plan.pages.flatMap((p) => p.units)) expect(record.locked[u.id]?.outcome, u.id).toMatch(/incorrect|unanswered/);
    expect(lessonResults(plan, record).total).toBe(0);
  });

  it('accepts every listed answer of every typed unit as fully correct', () => {
    for (const u of plan.pages.flatMap((p) => p.units)) {
      if (u.kind === 'text') for (const a of u.accepted.answers) expect(scoreUnit(u, a).outcome, `${u.id}: ${a}`).toBe('fully_correct');
      if (u.kind === 'spot') for (const a of u.correction.accepted.answers) expect(scoreUnit(u, { tokenId: u.faultyTokenId, text: a }).outcome, `${u.id}: ${a}`).toBe('fully_correct');
      if (u.kind === 'order') for (const o of u.acceptedOrders) expect(scoreUnit(u, o).outcome, u.id).toBe('fully_correct');
    }
  });

  it.each(LOCALES)('has prompts, answers and explanations for mother tongue %s', (locale) => {
    const localized = planOf(brief, content, locale);
    for (const page of localized.pages) {
      expect(page.instructions[locale], page.pageId).toBeTruthy();
      for (const u of page.units) {
        expect(u.answer, u.id).toBeTruthy();
        expect(u.explanation[locale], u.id).toBeTruthy();
        if (u.kind === 'choice') for (const o of u.options) expect(o.text, u.id).toBeTruthy();
      }
    }
    if (brief.newVerbs.length) expect(localized.newVerbs.every((v) => v.translation)).toBe(true);
  });

  it('renders every page of a session without errors', () => {
    const seen = new Set<number>();
    play(plan, right, (record) => {
      if (seen.has(record.pageIndex)) return;
      seen.add(record.pageIndex);
      render(
        <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>
          <SessionView plan={plan} record={record} dispatch={() => undefined} />
        </PreferencesProvider>,
      );
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
      cleanup();
    });
    expect(seen.size).toBe(plan.pages.length);
  }, 30_000); // about 40 full renders per lesson
});
