import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const learningLanguage = (page: import('@playwright/test').Page) => page.getByRole('radiogroup', { name: 'Learning language' });

test('lists the discovered course in outline order with state-labeled Content buttons and Start for ready lessons', async ({ page }) => {
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(8);
  await expect(rows.locator('.ordinal')).toHaveText(['01', '02', '03', '04', '05', '06', '07', '08']);
  await expect(rows.nth(2).getByRole('link').first()).toHaveText('Content');
  await expect(rows.nth(4).getByRole('link').first()).toContainText('Draft');
  await expect(rows.nth(2).getByRole('link', { name: 'Start lesson' })).toHaveAttribute('href', '#/lesson/fr-classroom-objects/play');
  await expect(rows.nth(4).getByRole('link', { name: 'Start lesson' })).toHaveCount(0);
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
  await page.goto('./#/lesson/fr-classroom-objects');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Les objets de la classe');
  await expect(page.getByRole('group', { name: 'Mother tongue' }).getByRole('radio').first()).toBeEnabled();
  await page.getByRole('button', { name: 'Raw JSON' }).click();
  const tree = page.getByRole('tree');
  await expect(tree.getByRole('treeitem', { name: /^draft/ })).toHaveAttribute('aria-expanded', 'false');
  await tree.getByRole('treeitem', { name: /^draft/ }).click();
  await expect(tree.getByRole('treeitem', { name: /^objective/ })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Structured view' }).click();
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('Lesson outline');
});

test('has no horizontal page overflow', async ({ page }) => {
  for (const [url, ready] of [['./', 'Your lessons'], ['./#/lesson/fr-classroom-objects', 'Target inventory'], ['./#/lesson/fr-verb-etre-present', 'Mixed final exam'], ['./#/lesson/fr-classroom-objects/play', 'Les objets de la classe']]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: ready })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('never shows generation controls', async ({ page }) => {
  await expect(page.getByRole('button', { name: /generat/i })).toHaveCount(0);
  await page.goto('./#/lesson/fr-verb-etre-present');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Le verbe être au présent');
  await expect(page.getByRole('button', { name: /generat/i })).toHaveCount(0);
});

test('groups content pages and keeps artifact header actions the same height', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects');
  const tabs = page.getByRole('tablist', { name: 'Lesson pages' }).getByRole('tab');
  const navigation = page.locator('.content-page-navigation');
  expect(await navigation.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  if (page.viewportSize()!.width < 600) {
    const tops = await page.locator('.content-tab-group').evaluateAll((groups) => groups.map((group) => group.getBoundingClientRect().top));
    expect(new Set(tops).size).toBeGreaterThan(1);
  }
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  const panel = page.locator('.content-page-navigation + [role="tabpanel"]');
  await expect(panel).toContainText('vocabulary_introduction');
  await page.getByRole('navigation', { name: 'Lesson outline' }).getByRole('button', { name: /Flashcards/ }).click();
  await expect(panel).toContainText('vocabulary_flashcards');
  await expect(panel).not.toContainText('vocabulary_introduction');
  await tabs.last().click();
  await expect(panel).toContainText('vocabulary_translation_exam');
  const heights = await Promise.all([
    page.getByRole('link', { name: 'Lesson overview' }),
    page.getByRole('button', { name: 'Raw JSON' }),
    page.getByRole('link', { name: 'Start lesson' }),
  ].map(async (button) => (await button.boundingBox())!.height));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('shows one Draft teaching block at a time through keyboard-operable tabs', async ({ page }) => {
  await page.goto('./#/lesson/fr-verb-etre-present');
  const tabs = page.getByRole('tablist', { name: 'Teaching blocks' }).getByRole('tab');
  await expect(tabs).toHaveCount(2);
  await expect(page.getByRole('article', { name: /01/ })).toBeVisible();
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole('article', { name: /02/ })).toBeVisible();
  await expect(page.getByRole('article', { name: /01/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
