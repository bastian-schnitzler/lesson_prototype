import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

const proceed = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();

/** Selects the first offered option in every select of the current page. */
async function chooseAll(page: Page) {
  for (const select of await page.locator('.task-card select:not([disabled])').all()) await select.selectOption({ index: 1 });
}

test('plays a lesson with Continue lock/confirm, resumes after reload and shows the results menu', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await expect(page.getByRole('heading', { level: 1, name: 'Les objets de la classe' })).toBeVisible();
  await proceed(page); // start
  await proceed(page); // introduction
  await proceed(page); // flashcards
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await chooseAll(page);
  await proceed(page);
  await expect(page.getByText(/Fully correct|Incorrect/).first()).toBeVisible();
  await expect(page.locator('.task-card select').first()).toBeDisabled();
  await proceed(page);

  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  await expect(page.getByText('Gender and overview')).toBeVisible();
  await chooseAll(page);
  await proceed(page);
  await proceed(page);
  for (const word of ['livre', 'Chaise', 'stylo', 'table']) {
    await page.getByRole('textbox').fill(word);
    await proceed(page);
    await proceed(page);
  }
  await expect(page.getByRole('timer')).toBeVisible();
  const score = await page.locator('.session-score').textContent();
  await page.getByRole('textbox').first().fill('un livre');
  await proceed(page);
  await expect(page.locator('.session-score')).toHaveText(score!); // no exam feedback during the exam
  await proceed(page);

  await expect(page.getByRole('heading', { name: 'Your exam answers' })).toBeVisible();
  await expect(page.getByText('Accent / case correction', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: /^Typed gaps/ }).click();
  await expect(page.getByText('Accent / case correction · 0.5 / 1')).toBeVisible();
  await page.getByRole('link', { name: 'Lesson overview' }).click();
  await expect(page.locator('tr[data-lesson-id="fr-classroom-objects"] .score')).not.toBeEmpty();
});

test('locks an exam page when its brief-defined countdown expires', async ({ page }) => {
  await page.clock.install();
  await page.goto('./#/lesson/fr-negation-ne-pas/play');
  await proceed(page);
  // Walk through practice until the exam starts.
  while (!(await page.getByRole('timer').isVisible())) {
    const inputs = page.locator('.task-card input.text-input:not([readonly])');
    for (const input of await inputs.all()) await input.fill('ne pas');
    await chooseAll(page);
    for (const group of await page.locator('fieldset.choices:not([disabled])').all()) await group.locator('input').first().check();
    for (const bank of await page.locator('.order-bank').all()) while (await bank.locator('button').count()) await bank.locator('button').first().click();
    const spot = page.locator('.spot');
    if (await spot.locator('button.token:not([disabled])').count()) await spot.locator('button.token:not([disabled])').first().click();
    await proceed(page);
  }
  await expect(page.getByRole('timer')).toHaveText('1:00');
  await page.clock.fastForward('01:05');
  // The first page timed out; the second page starts its own 45-second limit.
  await expect(page.getByRole('timer')).toHaveText(/^0:4[45]$/);
});
