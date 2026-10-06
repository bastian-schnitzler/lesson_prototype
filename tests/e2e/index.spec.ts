import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const learningLanguage = (page: import('@playwright/test').Page) => page.getByRole('radiogroup', { name: 'Learning language' });

test('lists the discovered course in outline order with state-labeled Content buttons', async ({ page }) => {
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(6);
  await expect(rows.locator('.ordinal')).toHaveText(['01', '02', '03', '04', '05', '06']);
  await expect(rows.nth(2).getByRole('link')).toHaveText('Draft');
  await expect(rows.nth(3).getByRole('link')).toHaveText('Content');
  await expect(page.getByRole('link', { name: 'Start lesson' })).toHaveCount(0);
  await expect(learningLanguage(page).getByRole('radio', { name: 'fr' })).toBeChecked();
  await expect(page.getByRole('radiogroup', { name: 'Level' }).getByRole('radio', { name: 'A1' })).toBeChecked();
});

test('switches between catalog courses and returns to the lesson course from its artifact page', async ({ page }) => {
  await learningLanguage(page).getByRole('radio', { name: 'de' }).check();
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.locator('tbody tr').first().getByRole('link').click();
  await expect(page).toHaveURL(/#\/lesson\/de-fix-perfekt$/);
  await page.getByRole('link', { name: 'Lesson overview' }).click();
  await expect(page.locator('tbody tr').first()).toHaveAttribute('data-lesson-id', 'de-fix-perfekt');
});

test('keeps preferences across a full reload and disables the course-language mother tongue', async ({ page }) => {
  const mother = page.getByRole('group', { name: 'Mother tongue' });
  await expect(mother.getByRole('radio', { name: 'fr' })).toBeDisabled();
  await mother.getByRole('radio', { name: 'de' }).check();
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vos leçons');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vos leçons');
  await expect(page.getByRole('group', { name: 'Langue maternelle' }).getByRole('radio', { name: 'de' })).toBeChecked();
});

test('loads a refreshed hash route and toggles the raw JSON tree', async ({ page }) => {
  await page.goto('./#/lesson/fr-fix-classroom');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Les objets de la classe');
  await expect(page.getByRole('group', { name: 'Mother tongue' }).getByRole('radio').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Raw JSON' }).click();
  const tree = page.getByRole('tree');
  await expect(tree.getByRole('treeitem', { name: /^draft/ })).toHaveAttribute('aria-expanded', 'false');
  await tree.getByRole('treeitem', { name: /^draft/ }).click();
  await expect(tree.getByRole('treeitem', { name: /^objective/ })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Structured view' }).click();
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('Lesson outline');
});

test('has no horizontal page overflow', async ({ page }) => {
  for (const url of ['./', './#/lesson/fr-fix-classroom']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('never shows generation controls', async ({ page }) => {
  await expect(page.getByRole('button', { name: /generat/i })).toHaveCount(0);
  await page.goto('./#/lesson/fr-fix-etre');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le verbe être');
  await expect(page.getByRole('button', { name: /generat/i })).toHaveCount(0);
});
