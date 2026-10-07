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

test('renders the formatted introduction text with a list and French forms (D46)', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await proceed(page); // start
  const intro = page.locator('.task-card .rich-text');
  await expect(intro.locator('strong')).toHaveText('four objects');
  await expect(intro.locator('ul > li')).toHaveCount(4);
  await expect(intro.locator('.learning-form[lang="fr"]').first()).toHaveText('un livre');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
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

async function mockFrenchVoice(page: Page, available: boolean) {
  await page.addInitScript((hasVoice) => {
    const spoken: string[] = [];
    Object.defineProperty(window, '__spoken', { value: spoken, configurable: true });
    const french = { lang: 'fr-FR', name: 'Test French', voiceURI: 'test-fr', localService: true, default: true };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => hasVoice ? [french] : [], cancel: () => undefined,
      speak: (utterance: { text: string }) => { spoken.push(utterance.text); },
      addEventListener: () => undefined, removeEventListener: () => undefined,
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class {
      text: string; lang = ''; voice: unknown;
      constructor(text: string) { this.text = text; }
    } });
  }, available);
  await page.reload();
}

async function reachListeningPractice(page: Page) {
  await page.goto('./#/lesson/fr-classroom-instructions/play');
  await proceed(page); // start
  await proceed(page); // introduction
  await proceed(page); // flashcards
  await chooseAll(page); // matching
  await proceed(page);
  await proceed(page); // matching feedback
  await proceed(page); // overview
  for (const word of ['écoutez', 'lisez']) {
    await page.getByRole('textbox').fill(word);
    await proceed(page);
    await proceed(page);
  }
}

test('plays French listening choice and dictation with a suitable voice', async ({ page }) => {
  await mockFrenchVoice(page, true);
  await reachListeningPractice(page);
  await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
  await page.getByRole('button', { name: 'Listen' }).click();
  expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)).toContain('écoutez');
  await page.locator('fieldset.choices input').first().check();
  await proceed(page);
  await expect(page.getByText(/Fully correct|Incorrect/).first()).toBeVisible();
  await proceed(page);
  await page.locator('fieldset.choices input').first().check();
  await proceed(page);
  await proceed(page);
  await expect(page.getByRole('timer')).toBeVisible();
  for (const input of await page.getByRole('textbox').all()) await input.fill('écoutez');
  await proceed(page);
  await expect(page.getByRole('button', { name: 'Listen' }).first()).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('1:00');
  // Type back what the voice said: the first answer in capitals (half credit), the second exactly.
  const listen = page.getByRole('button', { name: 'Listen' });
  const heard = async (index: number) => {
    await listen.nth(index).click();
    return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
  };
  const first = await heard(0);
  expect(await heard(0)).toBe(first); // replay is allowed until the page locks
  await page.getByRole('textbox').first().fill(first.toUpperCase());
  await page.getByRole('textbox').last().fill(await heard(1));
  await proceed(page);
  await expect(page.getByRole('heading', { name: 'Your exam answers' })).toBeVisible();
  await expect(page.getByText('Accent / case correction · 0.5 / 1')).toBeVisible();
  await expect(page.locator('.result-row').last()).toContainText('Fully correct');
});

test('replaces voice-less listening pages with help and excludes skips from scores', async ({ page }) => {
  await mockFrenchVoice(page, false);
  await reachListeningPractice(page);
  await expect(page.getByRole('heading', { name: 'French voice unavailable' })).toBeVisible();
  await expect(page.getByText('Steps for Windows with Chrome:')).toBeVisible(); // Playwright's Desktop Chrome user agent
  await expect(page.getByText('Open Settings → Time & language → Language & region.')).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Skip listening task' }).click();
  await expect(page.getByRole('heading', { name: 'French voice unavailable' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  await expect(page.getByRole('heading', { name: 'French voice unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip listening task' }).click();
  await expect(page.getByRole('timer')).toBeVisible();
  for (const input of await page.getByRole('textbox').all()) await input.fill('écoutez');
  await proceed(page);
  await expect(page.getByRole('heading', { name: 'French voice unavailable' })).toBeVisible();
  await expect(page.getByRole('timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Skip listening task' }).click();
  await expect(page.getByRole('heading', { name: 'Your exam answers' })).toBeVisible();
  await expect(page.locator('.summary-card')).toContainText(/Final exam: [0-4] \/ 4/);
  expect(await page.locator('.result-row').count()).toBe(4);
});

test('replaces a flashcard Listen button with Install language, which opens the help dialog', async ({ page }) => {
  await mockFrenchVoice(page, false);
  await page.goto('./#/lesson/fr-classroom-instructions/play');
  await proceed(page); // start
  await proceed(page); // introduction
  await page.locator('.task-card summary').first().click();
  await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Install language' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'French voice not installed' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Steps for Windows with Chrome:');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Install language' }).first().click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});
