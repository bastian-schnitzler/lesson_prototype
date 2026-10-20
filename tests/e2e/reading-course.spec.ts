import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * P5-07: every reading lesson of the prototype (the ten fr/A1 test lessons) played in the browser on the
 * real content, from the start page to 100 points, and an entry without artifacts that cannot start.
 * The solver reads each lesson's brief and content, so every answer is the right one.
 */
type Json = any;
const read = (dir: string, id: string): Json => JSON.parse(readFileSync(new URL(`../../content/${dir}/${id}.json`, import.meta.url), 'utf8'));
const outline = (file: string): Json => JSON.parse(readFileSync(new URL(`../../content/outlines/${file}.json`, import.meta.url), 'utf8'));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s: string) => new RegExp(`^\\s*${escape(s)}\\s*$`);
const primary = (page: Page) => page.getByRole('button', { name: /^(Continue|Check)$/ });

test.describe.configure({ timeout: 120_000 });

async function answer(page: Page, items: Json[]) {
  for (const q of items.filter((it) => it.type !== 'reading_document')) {
    const right = q.type === 'reading_true_false' ? (q.answer === 'true' ? 'Vrai' : 'Faux') : q.options.find((o: Json) => o.optionId === q.answerOptionId).text;
    await page.locator('.reading-question').filter({ hasText: q.question ?? q.statement }).locator('label.choice').filter({ hasText: exact(right) }).click();
  }
}

const READING = outline('fr-a1').entries.filter((e: Json) => e.kind === 'reading').map((e: Json) => e.id as string);

for (const id of READING) {
  test(`${id} plays to 100 points`, async ({ page }) => {
    const brief = read('briefs', id);
    const lesson = read('lessons', id);
    const items = (stage: string): Json[] => lesson.steps.find((s: Json) => s.stage === stage).pages[0].items;
    await page.goto(`./#/lesson/${id}/play`);
    await expect(page.locator('.flow-section')).toHaveCount(3, { timeout: 20_000 });
    await primary(page).click();

    const flip = page.getByRole('button', { name: 'Flip card to French' });
    while (await flip.count()) await flip.first().click();
    await primary(page).click();

    const [left, right] = [page.locator('.matching-columns > ul').first(), page.locator('.matching-columns > ul').last()];
    for (const k of brief.keywords) {
      await left.locator('.match-item').filter({ hasText: exact(k.translations.en[0]) }).click();
      await right.locator('.match-item').filter({ hasText: exact(k.term) }).click();
    }
    await primary(page).click();

    await expect(page.getByText('Time to skim')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'I’ve finished reading' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Answer from memory');
    await answer(page, items('skim'));
    await primary(page).click();
    await primary(page).click();

    await answer(page, items('detail'));
    await primary(page).click();
    await primary(page).click();

    const task = items('structure').find((it) => it.type === 'reading_order');
    for (const pieceId of task.acceptedOrders[0]) await page.getByRole('group', { name: 'Available pieces' }).getByRole('button', { name: task.pieces.find((p: Json) => p.pieceId === pieceId).text, exact: true }).click();
    await primary(page).click();
    await primary(page).click();

    await expect(page.getByText('Questions on the document')).toBeVisible();
    await primary(page).click();
    await expect(page.getByRole('timer')).toBeVisible();
    await answer(page, items('exam'));
    await primary(page).click();
    await expect(page.locator('.lesson-nav .results-final-score')).toHaveText('100 / 100');
  });
}

test('a reading entry without artifacts cannot be started and names the reasons', async ({ page }) => {
  const id = outline('fr-a2').entries.find((e: Json) => e.kind === 'reading').id;
  await page.goto(`./#/lesson/${id}/play`);
  await expect(page.getByText('This lesson cannot be started:')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('The draft is missing.')).toBeVisible();
});
