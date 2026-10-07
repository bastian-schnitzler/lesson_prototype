import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

const proceed = (page: Page) => page.getByRole('button', { name: 'Continue' }).click();

/** Turns every flashcard of the current page to its French side. */
async function revealCards(page: Page) {
  const unturned = page.getByRole('button', { name: 'Flip card to French' });
  while (await unturned.count()) await unturned.first().click();
}

/** Fixture translations, so tests can build deliberately right or wrong pairs. */
const PAIRS: Record<string, string> = {
  book: 'un livre', chair: 'une chaise', pen: 'un stylo', table: 'une table',
  listen: 'écoutez', read: 'lisez', write: 'écrivez', repeat: 'répétez',
};

/**
 * Pairs every mother-tongue item. With `wrong`, the first two meanings swap partners, so the page
 * always shows corrections (a fully correct page skips them).
 */
async function matchAll(page: Page, { wrong = true } = {}) {
  const native = page.locator('.matching-columns > ul').first().getByRole('button');
  const french = page.locator('.matching-columns > ul').last().getByRole('button');
  const words = await native.allTextContents();
  for (const [n, word] of words.entries()) {
    const partner = wrong && n < 2 ? PAIRS[words[1 - n]] : PAIRS[word];
    await native.filter({ hasText: new RegExp(`^${word}$`) }).click();
    await french.filter({ hasText: partner }).click();
  }
}

/** Selects the first offered option in every select of the current page. */
async function chooseAll(page: Page) {
  for (const select of await page.locator('.task-card select:not([disabled])').all()) await select.selectOption({ index: 1 });
}

test('plays a lesson with Continue lock/confirm, resumes after reload and shows the results menu', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await expect(page.getByRole('heading', { level: 1, name: 'Les objets de la classe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lesson overview' })).toBeVisible();
  await proceed(page); // start
  await expect(page.getByRole('link', { name: 'Cancel lesson' })).toBeVisible();
  await proceed(page); // introduction
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled(); // flashcards not yet revealed
  await revealCards(page);
  await proceed(page); // flashcards
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await matchAll(page);
  await proceed(page);
  // Results list only the mistakes: word, struck-through choice and the correct meaning, no point counts.
  await expect(page.locator('.match-summary')).toContainText('2 of 4 pairs correct.');
  await expect(page.locator('.match-corrections > li')).toHaveCount(2);
  await expect(page.locator('.match-corrections .match-wrong s').first()).toBeVisible();
  const fix = page.locator('.match-fix').first();
  const right = (await fix.locator('.match-right').boundingBox())!, wrong = (await fix.locator('.match-wrong').boundingBox())!;
  expect(Math.abs(right.x - wrong.x)).toBeLessThan(1); // the wrong choice sits directly under the correct meaning
  expect(wrong.y).toBeGreaterThan(right.y);
  await expect(page.locator('.match-results')).not.toContainText('0 / 1');
  await expect(page.locator('.matching-columns')).toHaveCount(0);
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
  await revealCards(page);
  await proceed(page); // flashcards
  await matchAll(page); // matching
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

test('replaces a revealed flashcard Listen button with Install language, which opens the help dialog', async ({ page }) => {
  await mockFrenchVoice(page, false);
  await page.goto('./#/lesson/fr-classroom-instructions/play');
  await proceed(page); // start
  await proceed(page); // introduction
  await page.getByRole('button', { name: 'Flip card to French' }).first().click();
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

test('flashcards show a group on one page, flip to the French side only and keep turned cards after a reload', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await proceed(page); // start
  await proceed(page); // introduction
  const cards = page.locator('.flashcard');
  await expect(cards).toHaveCount(4);
  const first = cards.first();
  const front = first.locator('.flashcard-front'), back = first.locator('.flashcard-back');
  await expect(front).toContainText('book');
  await expect(page.getByText('Flip every card to continue.')).toBeVisible();
  const before = await first.boundingBox();
  await first.getByRole('button', { name: 'Flip card to French' }).click();
  await expect(first.getByRole('button', { name: 'Flip card back' })).toHaveAttribute('aria-pressed', 'true');
  await expect(back.locator('[lang="fr"]').first()).toHaveText('un livre');
  await expect(back).toContainText('Masculine');
  await expect(front).toHaveAttribute('inert', '');
  await page.waitForTimeout(600); // flip animation
  const after = await first.boundingBox();
  expect(Math.abs(after!.height - before!.height)).toBeLessThan(1);
  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  await expect(page.getByText('1 of 4 cards turned')).toBeVisible();
  await expect(page.locator('.flashcard').first()).toHaveClass(/is-flipped/);
});

test('matching pairs by keyboard, lets a pair be reassigned and locks it with feedback', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await proceed(page); // start
  await proceed(page); // introduction
  await revealCards(page);
  await proceed(page); // flashcards
  const native = page.locator('.matching-columns > ul').first().getByRole('button');
  const french = page.locator('.matching-columns > ul').last().getByRole('button');
  // Keyboard: focus an English word, press Enter, focus a French form, press Space.
  const book = native.filter({ hasText: 'book' });
  await book.focus();
  await page.keyboard.press('Enter');
  await expect(book).toHaveAttribute('aria-pressed', 'true');
  const wrong = french.filter({ hasText: 'une chaise' });
  await wrong.focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('1 of 4 pairs assigned.')).toBeVisible();
  // Reassign: pairing "book" with un livre moves it away from une chaise.
  await book.click();
  await french.filter({ hasText: 'un livre' }).click();
  await expect(french.filter({ hasText: 'une chaise' }).locator('.pair-badge')).toHaveCount(0);
  await expect(page.getByText('1 of 4 pairs assigned.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  for (const [en, fr] of [['chair', 'une chaise'], ['pen', 'un stylo'], ['table', 'une table']]) {
    await native.filter({ hasText: en }).click();
    await french.filter({ hasText: fr }).click();
  }
  await expect(page.locator('.match-item.is-paired')).toHaveCount(8); // purple border on both sides
  const heights = await page.locator('.match-item').evaluateAll((items) => items.map((i) => Math.round(i.getBoundingClientRect().height)));
  expect(new Set(heights).size).toBe(1); // both columns have the same box height
  if (page.viewportSize()!.width >= 720) {
    // Wide screens draw one curve per pair and hide the numbers; a dashed curve follows the pointer.
    await expect(page.locator('.match-curve:not(.match-curve-live)')).toHaveCount(4);
    await expect(page.locator('.pair-badge').first()).toBeHidden();
    await native.filter({ hasText: 'pen' }).click();
    const box = (await french.first().boundingBox())!;
    await page.mouse.move(box.x - 40, box.y + box.height / 2);
    await expect(page.locator('.match-curve-live')).toHaveCount(1);
    // Over a target box the live curve ends at that box's inner (left) border, not under the pointer.
    const target = (await french.filter({ hasText: 'un stylo' }).boundingBox())!;
    const frame = (await page.locator('.matching-frame').boundingBox())!;
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
    const d = (await page.locator('.match-curve-live').getAttribute('d'))!;
    const endX = Number(d.trim().split(/[ ,]+/).at(-2));
    expect(Math.abs(endX - (target.x - frame.x))).toBeLessThan(1);
    await native.filter({ hasText: 'pen' }).click(); // deselect
    // Reassigning a paired word hides its curve; Esc cancels and shows it again.
    await native.filter({ hasText: 'pen' }).click();
    await expect(page.locator('.match-curve:not(.match-curve-live)')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(page.locator('.match-curve:not(.match-curve-live)')).toHaveCount(4);
    await expect(native.filter({ hasText: 'pen' })).toHaveAttribute('aria-pressed', 'false');
  } else {
    await expect(page.locator('.match-curves')).toHaveCount(0);
    await expect(page.locator('.pair-badge').first()).toBeVisible();
  }
  // All pairs correct: a short success animation, then the correction view is skipped.
  await proceed(page);
  await expect(page.getByRole('status').filter({ hasText: 'All correct!' })).toBeAttached();
  await expect(page.getByText('Gender and overview')).toBeVisible();
});
