import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { lessonNav } from './nav.ts';

/**
 * P5-04: a complete reading session in the browser (SPEC section 9). The solver reads the fixture brief
 * and lesson, so every task can be answered correctly and the score checked exactly.
 */
type Json = any;
const fixture = (dir: string): Json => JSON.parse(readFileSync(new URL(`../fixtures/content/${dir}/fr-fix-menu.json`, import.meta.url), 'utf8'));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const brief = fixture('briefs');
const lesson = fixture('lessons');
const items = (stage: string): Json[] => lesson.steps.find((s: Json) => s.stage === stage).pages[0].items;
const primary = (page: Page) => page.getByRole('button', { name: /^(Continue|Check)$/ });

/** Chooses the right option of every question on the page. */
async function answer(page: Page, stage: string) {
  for (const q of items(stage).filter((it) => it.type !== 'reading_document')) {
    const right = q.type === 'reading_true_false' ? (q.answer === 'true' ? 'Vrai' : 'Faux') : q.options.find((o: Json) => o.optionId === q.answerOptionId).text;
    const unit = page.locator('.reading-question').filter({ hasText: q.question ?? q.statement });
    await unit.locator('label.choice').filter({ hasText: new RegExp(`^\\s*${escape(right)}\\s*$`) }).click();
  }
}

test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('plays a reading lesson perfectly: key words, skim from memory, detail, structure, exam, 100 points', async ({ page }) => {
  await page.goto('./#/lesson/fr-fix-menu/play');
  await expect(page.locator('.flow-section')).toHaveCount(3, { timeout: 20_000 });
  await primary(page).click();

  // Flashcards, then matching (meaning → key word).
  const flip = page.getByRole('button', { name: 'Flip card to French' });
  while (await flip.count()) await flip.first().click();
  await primary(page).click();
  for (const k of brief.keywords) {
    await page.locator('.matching-columns > ul').first().locator('.match-item').filter({ hasText: new RegExp(`^${escape(k.translations.en[0])}$`) }).click();
    await page.locator('.matching-columns > ul').last().locator('.match-item').filter({ hasText: new RegExp(`^${escape(k.term)}`) }).click();
  }
  await primary(page).click();

  // Skim: the document is put away once the reader has finished; the question is answered from memory.
  await expect(page.getByText('Time to skim')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.reading-document mark').first()).toBeVisible();
  await page.getByRole('button', { name: 'I’ve finished reading' }).click();
  await expect(page.locator('.reading-document')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Answer from memory');
  await answer(page, 'skim');
  await primary(page).click();
  // The checked view stays, with the document back, even though the answer is right.
  await expect(page.locator('.reading-document')).toBeVisible();
  await expect(page.locator('.feedback.outcome-fully_correct')).toBeVisible();
  await primary(page).click();

  // Detail: every question beside the open document.
  await answer(page, 'detail');
  await primary(page).click();
  await expect(page.locator('.feedback.outcome-fully_correct')).toHaveCount(items('detail').length - 1);
  await primary(page).click();

  // Structure: the pieces in the order of the text.
  const task = items('structure')[1];
  for (const id of task.acceptedOrders[0]) await page.locator('.order-bank .token').filter({ hasText: task.pieces.find((p: Json) => p.pieceId === id).text }).click();
  await primary(page).click();
  await primary(page).click();

  // Exam info, then the timed exam page without highlights.
  await expect(page.getByText('Questions on the document')).toBeVisible();
  await primary(page).click();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.locator('.reading-document mark')).toHaveCount(0);
  await answer(page, 'exam');
  await primary(page).click();

  await expect(page.locator('.lesson-nav .results-final-score')).toHaveText('100 / 100');
  const nav = await lessonNav(page);
  await expect(nav.locator('.results-entry:not(.results-part) > span:first-child')).toHaveText(['Final exam', 'Matching', 'Skim', 'Detail', 'Structure']);
});

test('places the document beside the questions by the width of the task area, with or without the sidebar (P5-06)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./#/lesson/fr-fix-menu/play');
  await expect(page.locator('.flow-section')).toHaveCount(3, { timeout: 20_000 });
  await primary(page).click();
  const flip = page.getByRole('button', { name: 'Flip card to French' });
  while (await flip.count()) await flip.first().click();
  await primary(page).click();
  for (const k of brief.keywords) {
    await page.locator('.matching-columns > ul').first().locator('.match-item').filter({ hasText: new RegExp(`^${escape(k.translations.en[0])}$`) }).click();
    await page.locator('.matching-columns > ul').last().locator('.match-item').filter({ hasText: new RegExp(`^${escape(k.term)}`) }).click();
  }
  await primary(page).click();
  await page.getByRole('button', { name: 'I’ve finished reading' }).click();
  await answer(page, 'skim');
  await primary(page).click();
  await primary(page).click();
  await expect(page.locator('.reading-question').first()).toBeVisible();

  const doc = page.locator('.reading-doc-slot');
  const questions = page.locator('.task-card > .units').first();
  // [window width, sidebar shown, document beside the questions]
  for (const [width, sidebar, beside] of [[1440, true, true], [1100, true, true], [1024, true, false], [900, false, true], [700, false, false], [375, false, false]] as const) {
    await page.setViewportSize({ width, height: 800 });
    await expect(page.locator('.lesson-nav')).toBeVisible({ visible: sidebar });
    const [d, q] = [await doc.boundingBox(), await questions.boundingBox()];
    expect(q!.x > d!.x + d!.width && Math.abs(q!.y - d!.y) < 40, `${width} px`).toBe(beside);
    if (beside) expect(Math.min(d!.width, q!.width), `${width} px column width`).toBeGreaterThanOrEqual(280);
  }
});
