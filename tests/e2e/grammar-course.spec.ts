import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { buildPlan, type LessonPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { progress, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { SESSION_KEY_PREFIX } from '../../src/domain/session/storage.ts';
import { roundHalfUp1 } from '../../src/domain/format.ts';
import { lessonNav } from './nav.ts';

/**
 * P3-06: complete grammar journeys through the real course content (content/, served by the
 * `course` project). A solver builds the same plan as the app and reads the saved session to know
 * the current page, then answers every unit through the page itself: right by default, or as the
 * test decides. Conjugation (avoir: all seven exercise types and a mixed exam), articles and gaps
 * (definite articles) and syntax with word order (yes/no questions) are played end to end.
 */
type Json = any;
const read = (dir: string, id: string): Json => JSON.parse(readFileSync(new URL(`../../content/${dir}/${id}.json`, import.meta.url), 'utf8'));
const planOf = (id: string) => buildPlan(read('lessons', id), read('briefs', id), 'en', { interleaveGroups: true, examIntro: true });

const primary = (page: Page) => page.getByRole('button', { name: /^(Continue|Check)$/ });
const saved = (page: Page, id: string) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null') as SessionRecord | null, SESSION_KEY_PREFIX + id);
const stateOf = (r: SessionRecord | null) => (r ? `${r.status}/${r.pageIndex}/${r.phase}` : 'start');

const right = (u: PlanUnit): UnitResponse => (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] });

/** Gives `response` to `unit` through the page: typing, choosing, placing or selecting like a learner. */
async function answer(page: Page, unit: PlanUnit, response: UnitResponse) {
  const row = page.locator(`[data-unit="${unit.id}"]`);
  switch (unit.kind) {
    case 'text':
      return row.locator('input.text-input').fill(response as string);
    case 'choice': {
      const text = unit.options.find((o) => o.id === response)!.text;
      if (unit.itemType === 'grammar_person_matching') {
        await page.locator('.matching-columns > ul').first().getByRole('button', { name: text, exact: true }).click();
        return page.locator(`.match-cell[data-flip="${unit.id}"] button.match-item`).click();
      }
      if (unit.itemType === 'grammar_pronoun_form_match' && (await row.locator('.form-slot').count())) {
        await page.locator('.form-bank').getByRole('button', { name: text, exact: true }).first().click();
        return row.locator('.form-slot').click();
      }
      if (await row.locator('select').count()) return row.locator('select').selectOption({ label: text });
      return row.getByRole('radio', { name: text, exact: true }).check();
    }
    case 'order':
      for (const id of response as string[]) await row.locator('.order-bank').getByRole('button', { name: unit.tokens.find((t) => t.id === id)!.text, exact: true }).first().click();
      return;
    case 'spot': {
      const r = response as { tokenId: string; text: string };
      await row.locator('.spot button.token').nth(unit.tokens.findIndex((t) => t.id === r.tokenId)).click();
      if (unit.correction.mode === 'select') return row.getByRole('radio', { name: r.text, exact: true }).check();
      return row.locator('.spot input.text-input').fill(r.text);
    }
  }
}

interface Options {
  /** The response for a unit; undefined leaves it unanswered. Default: right. */
  respond?: (unit: PlanUnit, record: SessionRecord) => UnitResponse | undefined;
  /** Stops before acting on a page when this holds. */
  stop?: (record: SessionRecord) => boolean;
  /** Runs on every new page before it is answered. */
  onPage?: (record: SessionRecord) => Promise<void>;
}

/** Plays from the current page until the results (or `stop`). */
async function solve(page: Page, id: string, plan: LessonPlan, opts: Options = {}) {
  let seen = '';
  for (let guard = 0; guard < 300; guard++) {
    await expect(page.locator('.task-card.is-celebrating')).toHaveCount(0, { timeout: 10_000 });
    if (await page.locator('.summary-card').count()) return;
    const record = await saved(page, id);
    const state = stateOf(record);
    if (record && opts.stop?.(record)) return;
    if (!record) await expect(primary(page)).toBeVisible({ timeout: 30_000 }); // the start page, once the real catalog has loaded
    if (record && state !== seen && record.phase === 'answering') await opts.onPage?.(record);
    seen = state;
    if (record?.phase === 'answering') {
      // A matching board pairs each option once: forms such as parle (je, il) accept several persons.
      const used = new Set<unknown>();
      for (const unit of plan.pages[record.pageIndex].units) {
        let response = opts.respond ? opts.respond(unit, record) : right(unit);
        if (unit.kind === 'choice' && unit.itemType === 'grammar_person_matching' && used.has(response)) response = unit.correct.find((c) => !used.has(c)) ?? response;
        used.add(response);
        if (response !== undefined) await answer(page, unit, response);
      }
    }
    // Multiple-choice pages submit themselves when an option is chosen; others wait for Check/Continue.
    await page.waitForTimeout(150);
    if (stateOf(await saved(page, id)) === state && !(await page.locator('.task-card.is-celebrating').count()) && (await primary(page).count()) && (await primary(page).isEnabled())) await primary(page).click();
    await expect.poll(async () => stateOf(await saved(page, id)) !== state || (await page.locator('.summary-card').count()) > 0, { timeout: 10_000 }).toBe(true);
  }
  throw new Error('the session did not reach the results');
}

const units = (plan: LessonPlan, role: 'practice' | 'exam') => plan.pages.filter((p) => p.role === role).flatMap((p) => p.units);

// Whole lessons take a few minutes with every success animation.
test.describe.configure({ timeout: 300_000 });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('conjugation (avoir): every exercise type, weighted progress, placeholder, timed mixed exam, 100 points', async ({ page }) => {
  const id = 'fr-verb-avoir-present';
  const plan = planOf(id);
  const brief = read('briefs', id);
  await page.goto(`./#/lesson/${id}/play`);
  await expect(page.getByRole('heading', { level: 1, name: plan.title })).toBeVisible({ timeout: 30_000 });
  const types = new Set<string>();
  const limits: string[] = [];
  await solve(page, id, plan, {
    onPage: async (record) => {
      const current = plan.pages[record.pageIndex];
      current.items.forEach((it) => types.add(it.type));
      // Progress follows the estimated durations of the completed pages (SPEC section 5).
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(Math.round(progress(plan, record))));
      if (current.role === 'exam') {
        limits.push((await page.getByRole('timer').textContent())!);
        // No hint, mark or correction during the exam.
        await expect(page.locator('.is-wrong, .is-right, .is-almost, .feedback, .gap-hint')).toHaveCount(0);
      }
      if (current.units.length === 0 && current.items.some((it) => it.type === 'production_feedback_placeholder')) {
        await expect(page.getByText('Individual feedback would be here on production.')).toBeVisible();
      }
    },
  });
  expect([...types].sort()).toEqual(['grammar_explanation', 'production_feedback_placeholder', 'grammar_error_spotter', 'grammar_gap_choice', 'grammar_gap_typing', 'grammar_person_matching', 'grammar_pronoun_form_match', 'grammar_pronoun_form_typing', 'grammar_word_order'].sort());
  // Each exam page starts with the brief's limit.
  const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  expect(limits).toEqual(brief.exam.pages.map((p: Json) => format(p.timeLimitS)));
  await expect(page.locator('.lesson-nav .results-final-score')).toHaveText('100 / 100');
  const exam = units(plan, 'exam').length;
  await expect(page.locator('.summary-card .total-score')).toHaveText(`${exam} / ${exam}`);
  await expect(page.locator('.result-item')).toHaveCount(exam);
  await expect(page.locator('.result-item.outcome-fully_correct')).toHaveCount(exam);
  // The menu offers the exam first, then every scored exercise in lesson order.
  const nav = await lessonNav(page);
  const entries = await nav.locator('.results-entry:not(.results-part) > span:first-child').allTextContents();
  expect(entries[0]).toBe('Final exam');
  expect(entries.slice(1)).toEqual(plan.steps.filter((s) => s.role === 'practice').map((s) => s.label.en));
});

test('articles and gaps: practice confirmation, deadline kept across a reload, half credit and exact final score', async ({ page }) => {
  const id = 'fr-definite-articles-and-elision';
  const plan = planOf(id);
  const practice = units(plan, 'practice');
  const exam = units(plan, 'exam');
  const firstTyped = practice.find((u) => u.kind === 'text')!;
  const [half, miss] = exam;
  await page.goto(`./#/lesson/${id}/play`);
  // Practice: the first typed gap is answered wrongly; Check stays disabled until it has an answer.
  await solve(page, id, plan, { stop: (r) => plan.pages[r.pageIndex].units.includes(firstTyped) });
  await expect(primary(page)).toBeDisabled();
  await page.locator(`[data-unit="${firstTyped.id}"] input`).fill('xyz');
  await primary(page).click();
  // The page waits with its correction until Continue confirms it.
  await expect(page.locator('.text-input.is-wrong')).toBeVisible();
  await expect(page.locator(`[data-unit="${firstTyped.id}"]`)).toContainText((firstTyped as Json).accepted.answers[0]);
  await page.waitForTimeout(1500);
  await expect(page.locator('.text-input.is-wrong')).toBeVisible();
  await primary(page).click();
  // Exam: the first page keeps its deadline across a reload.
  await solve(page, id, plan, { stop: (r) => plan.pages[r.pageIndex].role === 'exam' });
  const limit = plan.pages.find((p) => p.role === 'exam')!.timeLimitS!;
  await page.waitForTimeout(3000);
  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  const seconds = async () => { const [m, s] = (await page.getByRole('timer').textContent())!.split(':').map(Number); return 60 * m + s; };
  expect(await seconds()).toBeLessThanOrEqual(limit - 3);
  expect(await seconds()).toBeGreaterThan(limit - 15);
  // A capitalised answer earns half a point, an empty one nothing; everything else is right.
  const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  await solve(page, id, plan, { respond: (u) => (u === half ? upper(right(u) as string) : u === miss ? undefined : right(u)) });
  expect(upper(right(half) as string)).not.toBe(right(half));
  const examScore = (100 * (exam.length - 1.5)) / exam.length;
  const practiceScore = (100 * (practice.length - 1)) / practice.length;
  const total = roundHalfUp1((35 * practiceScore + 65 * examScore) / 100);
  await expect(page.locator('.lesson-nav .results-final-score')).toHaveText(`${total.toLocaleString('en')} / 100`);
  await expect(page.locator('.summary-card .total-score')).toHaveText(`${exam.length - 1.5} / ${exam.length}`);
  await expect(page.locator('.result-item.outcome-orthography_only')).toHaveCount(1);
  await expect(page.locator('.result-item.outcome-unanswered')).toHaveCount(1);
  await expect(page.locator('.result-item.outcome-fully_correct')).toHaveCount(exam.length - 2);
});

test('syntax and word order (yes/no questions): word-order practice and exam, post-exam review of every answer', async ({ page }) => {
  const id = 'fr-yes-no-questions';
  const plan = planOf(id);
  const exam = units(plan, 'exam');
  const orders: PlanUnit[] = exam.filter((u) => u.kind === 'order');
  expect(orders.length).toBeGreaterThan(0);
  await page.goto(`./#/lesson/${id}/play`);
  // Every exam word order is answered with its words reversed (wrong); the rest is right.
  const reversed = (u: PlanUnit) => [...(u as Json).acceptedOrders[0]].reverse();
  await solve(page, id, plan, { respond: (u) => (orders.includes(u) ? reversed(u) : right(u)) });
  await expect(page.getByRole('heading', { level: 1, name: 'Final exam' })).toBeVisible();
  await expect(page.locator('.summary-card .total-score')).toHaveText(`${exam.length - orders.length} / ${exam.length}`);
  // The review lists every exam task with the learner's answer and the correct one.
  await expect(page.locator('.result-item')).toHaveCount(exam.length);
  const wrong = page.locator('.result-item.outcome-incorrect');
  await expect(wrong).toHaveCount(orders.length);
  for (const [n, u] of orders.entries()) await expect(wrong.nth(n)).toContainText(u.answer);
  // An exercise selected in the menu shows its own answers.
  const nav = await lessonNav(page);
  const label = plan.steps.find((s) => s.role === 'practice' && plan.pages.some((p) => p.stepId === s.stepId && p.items.some((it) => it.type === 'grammar_word_order')))!.label.en;
  await nav.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
  await expect(page.locator('.result-item.outcome-fully_correct').first()).toBeVisible();
});

// Every other grammar lesson with content plays to 100 points with the current renderers.
const PLAYED = ['fr-verb-avoir-present', 'fr-definite-articles-and-elision', 'fr-yes-no-questions'];
const outline = JSON.parse(readFileSync(new URL('../../content/outlines/fr-a1.json', import.meta.url), 'utf8'));
const others = outline.entries.filter((e: Json) => e.kind === 'grammar' && !PLAYED.includes(e.id)).map((e: Json) => e.id as string)
  .filter((id: string) => { try { return !!read('lessons', id); } catch { return false; } });

for (const id of others) {
  test(`${id} plays to 100 points`, async ({ page }) => {
    const plan = planOf(id);
    await page.goto(`./#/lesson/${id}/play`);
    await solve(page, id, plan);
    await expect(page.locator('.lesson-nav .results-final-score')).toHaveText('100 / 100');
  });
}
