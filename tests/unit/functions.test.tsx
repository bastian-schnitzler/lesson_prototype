import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { PreferencesProvider } from '../../src/app/context.tsx';
import { ContentReview } from '../../src/artifacts/ContentReview.tsx';
import { FunctionsBriefView } from '../../src/artifacts/FunctionsBriefView.tsx';
import { functionsPageEstimate, functionsTimeLimit } from '../../src/domain/functionsLesson.ts';
import { buildPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { lessonResults, requiredReveals, scoreUnit, sessionReducer, startSession, type UnitResponse } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema, isGeneratedKind, isSupportedKind } from '../../src/schemas/artifacts.ts';
import type { FunctionsBrief, FunctionsContent } from '../../src/schemas/functions.ts';
import { OutlineFileSchema } from '../../src/schemas/outline.ts';
import { validateBrief, validateContent, type OutlineContext } from '../../src/validation/artifacts.ts';

/** P4-02: function brief and lesson content contracts (SPEC section 8, D51). */
const ROOT = resolve(import.meta.dirname, '../..');
const ID = 'fr-ordering-at-a-cafe';
type Json = any;
const load = (dir: 'briefs' | 'lessons'): Json => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/content', dir, `${ID}.json`), 'utf8'));
const outline = OutlineFileSchema.parse(JSON.parse(readFileSync(join(ROOT, 'content/outlines/fr-a1.json'), 'utf8')));
const ctx: OutlineContext = { entry: outline.entries.find((e) => e.id === ID)!, lang: 'fr', level: 'A1' };
const messages = (r: { issues: { path: string; message: string }[] }) => r.issues.map((i) => `${i.path}: ${i.message}`).join('\n');

function checkBrief(mutate?: (b: Json) => void) {
  const brief = load('briefs');
  mutate?.(brief);
  return validateBrief(brief, ctx);
}
function checkContent(mutate?: (c: Json) => void) {
  const content = load('lessons');
  mutate?.(content);
  return validateContent(content, { ...ctx, brief: load('briefs') });
}
const step = (c: Json, stage: string) => c.steps.find((s: Json) => s.stage === stage);

afterEach(cleanup);

describe('function artifacts', () => {
  it('registers functions as a supported kind that the generator does not produce yet (D51)', () => {
    expect(isSupportedKind('functions')).toBe(true);
    expect(isGeneratedKind('functions')).toBe(false);
    expect(() => z.toJSONSchema(briefSchema('functions', 'fr'))).not.toThrow();
    expect(() => z.toJSONSchema(contentSchema('functions', 'fr'))).not.toThrow();
  });

  it('accepts the fixture brief and lesson content', () => {
    expect(messages(checkBrief())).toBe('');
    expect(messages(checkContent())).toBe('');
  });

  it.each([
    ['too few expressions', (b: Json) => b.expressions.splice(5), /expressions/],
    ['an ellipsis in the text', (b: Json) => (b.expressions[0].text = 'Je voudrais …'), /without the ellipsis and set openEnd/],
    ['an example without its expression', (b: Json) => (b.expressions[1].example.text = 'Bonjour.'), /must use the expression/],
    ['a noun without article', (b: Json) => (b.words[0].teachingForm = 'thé'), /indefinite article/],
    ['equal translations', (b: Json) => (b.expressions[1].translations.en = ['I would like']), /en translation/],
  ])('rejects a brief with %s', (_, mutate, pattern) => {
    expect(messages(checkBrief(mutate))).toMatch(pattern);
  });

  it.each([
    ['a missing expression in the dialogue', (c: Json) => step(c, 'dialogue').pages[0].items[0].lines.forEach((l: Json) => (l.expressionIds = l.expressionIds.filter((e: string) => e !== 'merci-au-revoir'))), /does not use expression merci-au-revoir/],
    ['two lines of one role in a row', (c: Json) => (step(c, 'dialogue').pages[0].items[0].lines[1].roleId = 'serveur'), /roles alternate/],
    ['a distractor in practice', (c: Json) => (step(c, 'word_order').pages[0].items[0].distractorTokenIds = ['t3']), /tokens only/],
    ['a distractor inside the accepted order', (c: Json) => (step(c, 'exam').pages[0].items[0].distractorTokenIds = ['t1']), /except the distractors/],
    ['a gap without its answer among the choices', (c: Json) => (step(c, 'dialogue_gaps').pages[0].items[0].choiceExpressionIds[0] = 'laddition'), /four distinct expressions including the answer/],
    ['an exam reply taken from practice', (c: Json) => {
      const reply = step(c, 'exam').pages[0].items[0];
      reply.tokens = [{ tokenId: 't1', text: 'Je' }, { tokenId: 't2', text: 'voudrais' }, { tokenId: 't3', text: 'un croissant' }];
      reply.distractorTokenIds = [];
      reply.acceptedOrders = [['t1', 't2', 't3']];
    }, /already occurs in the brief or in practice/],
    ['a wrong page estimate', (c: Json) => (step(c, 'dialogue').pages[0].estimatedDurationS = 60), /must be 116 s by the page rules/],
    ['a wrong exam limit', (c: Json) => (step(c, 'exam').pages[2].timeLimitS = 100), /must be 276 s/],
    ['a practice countdown', (c: Json) => (step(c, 'matching').pages[0].timeLimitS = 60), /only exam pages have a countdown/],
    ['steps out of order', (c: Json) => c.steps.reverse(), /expected the flashcards step/],
  ])('rejects lesson content with %s', (_, mutate, pattern) => {
    expect(messages(checkContent(mutate))).toMatch(pattern);
  });

  it('derives page estimates and exam limits from the page rules (section 8)', () => {
    const content = load('lessons') as FunctionsContent;
    const exam = content.steps.at(-1)!.pages;
    expect(functionsPageEstimate(exam[0].items, true)).toBe(90);
    expect(functionsPageEstimate(exam[2].items, true)).toBe(8 * 8 + 6 * 20);
    expect(functionsTimeLimit(184)).toBe(276);
    expect(content.estimatedMinutes).toBe(15);
  });
});

describe('function lesson plan', () => {
  const brief = briefSchema('functions', 'fr').parse(load('briefs')) as FunctionsBrief;
  const content = contentSchema('functions', 'fr').parse(load('lessons')) as FunctionsContent;
  const plan = buildPlan(content, brief, 'de', { examIntro: true });
  const units = (role: string) => plan.pages.filter((p) => p.role === role).flatMap((p) => p.units);

  it('has 20 practice units and 12 exam units; flashcards and the dialogue are presentation pages', () => {
    expect(units('practice')).toHaveLength(6 + 2 + 6 + 6);
    expect(units('exam')).toHaveLength(6 + 6);
    expect(plan.pages.slice(0, 3).map((p) => p.role)).toEqual(['presentation', 'presentation', 'presentation']);
    expect(plan.pages.find((p) => p.special === 'examIntro')).toBeDefined();
  });

  it('shows French expressions on matching boxes and their mother-tongue partners', () => {
    const unit = units('practice').find((u) => u.itemType === 'function_matching')!;
    expect(unit.prompt.learning).toBe('Je voudrais …');
    expect(unit.kind === 'choice' && unit.options.map((o) => o.text)).toContain('Ich hätte gern');
  });

  it('offers the gap expressions without the ellipsis and with role A as context', () => {
    const unit = units('practice').find((u) => u.itemType === 'function_dialogue_gap_choice')!;
    expect(unit.prompt.learning).toBe('le serveur: Bonjour, vous désirez ?');
    expect(unit.kind === 'choice' && unit.options.find((o) => o.id === 'je-voudrais')?.text).toBe('Je voudrais');
  });

  it('scores exam replies only when every distractor stays in the bank', () => {
    const reply = units('exam').find((u) => u.itemType === 'function_word_order') as Extract<PlanUnit, { kind: 'order' }>;
    expect(reply.distractors).toHaveLength(2);
    expect(scoreUnit(reply, reply.acceptedOrders[0]).points).toBe(1);
    expect(scoreUnit(reply, [reply.acceptedOrders[0][0], reply.distractors![0], ...reply.acceptedOrders[0].slice(2)]).points).toBe(0);
    expect(scoreUnit(reply, [...reply.acceptedOrders[0], reply.distractors![0]]).points).toBe(0);
    expect(scoreUnit(reply, []).outcome).toBe('unanswered');
  });

  it('grades typed exam-dialogue gaps with half credit for accents and capitals', () => {
    const gaps = units('exam').filter((u) => u.itemType === 'function_dialogue_gap_typing');
    expect(gaps).toHaveLength(6);
    expect(scoreUnit(gaps[1], 'Je voudrais').points).toBe(1);
    expect(scoreUnit(gaps[1], 'je voudrais').points).toBe(0.5);
    expect(scoreUnit(gaps[4], 'Cest combien').points).toBe(0);
  });

  it('plays through the shared session host to a total of 100', () => {
    const key = (u: PlanUnit): UnitResponse => (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : '');
    let r = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'de', seed: 3, now: 0 });
    for (let guard = 0; r.status !== 'completed' && guard < 200; guard++) {
      if (r.phase === 'answering') for (const u of plan.pages[r.pageIndex].units) r = sessionReducer(plan, r, { type: 'draft', unitId: u.id, response: key(u), now: 0 });
      for (const { itemKey, keys } of requiredReveals(plan.pages[r.pageIndex])) for (const k of keys) r = sessionReducer(plan, r, { type: 'reveal', itemKey, key: k, now: 0 });
      r = sessionReducer(plan, r, { type: 'continue', now: 1, interfaceLanguage: 'en' });
    }
    expect(r.status).toBe('completed');
    expect(lessonResults(plan, r).total).toBe(100);
  });
});

describe('function artifact views', () => {
  const brief = briefSchema('functions', 'fr').parse(load('briefs')) as FunctionsBrief;
  const content = contentSchema('functions', 'fr').parse(load('lessons')) as FunctionsContent;

  it('shows the Draft: situation, roles, expressions with example sentences and words', () => {
    render(<PreferencesProvider initial={{ interfaceLanguage: 'de', motherTongue: 'en' }}><FunctionsBriefView data={brief} /></PreferencesProvider>);
    expect(screen.getByText('Ausdrücke (6)')).toBeInTheDocument();
    expect(screen.getByText('Je voudrais …')).toBeInTheDocument();
    expect(screen.getByText('I would like')).toBeInTheDocument();
    expect(screen.getByText('Je voudrais un café.')).toBeInTheDocument();
    expect(screen.getByText('le serveur')).toBeInTheDocument();
    expect(screen.getByText('un croissant')).toBeInTheDocument();
  });

  it('previews every function item type read-only', () => {
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'de' }}><ContentReview content={content} brief={brief} /></PreferencesProvider>);
    const reviewed = screen.getAllByRole('tab').map((tab) => { fireEvent.click(tab); return screen.getByRole('tabpanel').textContent; }).join(' ');
    for (const type of ['function_flashcards', 'function_dialogue', 'function_matching', 'function_word_order', 'function_dialogue_gap_choice', 'function_dialogue_gap_typing']) expect(reviewed).toContain(type);
    expect(reviewed).toContain('Distractors: voudrait · désire');
    expect(reviewed).toContain('Bonsoir, monsieur. ___ ?');
    expect(reviewed).toMatch(/Countdown limit: 4 min 36 s/);
    expect(screen.getByRole('tabpanel').querySelectorAll('input, button, select, textarea')).toHaveLength(0);
  });
});
