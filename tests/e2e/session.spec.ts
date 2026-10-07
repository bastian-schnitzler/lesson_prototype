import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

/** Clicks the page's primary action: "Check" on unanswered practice pages, "Continue" otherwise. */
const proceed = (page: Page) => page.getByRole('button', { name: /^(Continue|Check)$/ }).click();

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

/**
 * Answers a typed gap: a correct answer flashes green and moves on by itself; otherwise the
 * correction is shown and a second Continue confirms it.
 */
async function answerGap(page: Page, word: string) {
  await page.getByRole('textbox').fill(word);
  await proceed(page);
  // Either the correction appears, or (after the green flash) the next page shows an empty field.
  await page.waitForFunction(() => {
    const field = document.querySelector<HTMLInputElement>('.task-card input.text-input');
    return !!document.querySelector('.feedback') || !field || field.value === '';
  });
  if (await page.locator('.feedback').count()) await proceed(page);
}

/** Confirms the info page that precedes the final exam. */
async function passExamIntro(page: Page) {
  await expect(page.getByRole('heading', { name: 'Your final exam' })).toBeVisible();
  await proceed(page);
}

/** Picks the first gender for every noun on the gender page. */
async function chooseGenders(page: Page) {
  for (const group of await page.locator('fieldset.gender-options:not([disabled])').all()) await group.locator('label').first().click();
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
  await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled(); // practice pages are checked first
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
  await expect(page.locator('.task-card select')).toHaveCount(0);
  await chooseGenders(page);
  await proceed(page);
  await proceed(page);
  // Typed gaps: the cursor is already in the field; the four reference words stand above it.
  await expect(page.getByRole('textbox')).toBeFocused();
  const field = (await page.getByRole('textbox').boundingBox())!;
  const refs = page.locator('.reference-list > li');
  await expect(refs).toHaveCount(4);
  expect((await refs.last().boundingBox())!.y).toBeLessThan(field.y); // the reference words stand above the field
  for (const word of ['livre', 'Chaise', 'stylo', 'table']) {
    await answerGap(page, word);
  }
  // An info page lists the exam pages, their countdowns and the number of words before the exam starts.
  await expect(page.getByRole('heading', { name: 'Your final exam' })).toBeVisible();
  await expect(page.locator('.exam-intro')).toContainText('4 words are tested');
  await expect(page.locator('.exam-intro li').first()).toContainText(/Translation into French · \d+ tasks/);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await proceed(page);
  await expect(page.getByRole('timer')).toBeVisible();
  // Each word to translate says whether the answer needs an article. While it is missing the badge
  // turns purple; the info box appears only after Continue, which then does not submit the page.
  await expect(page.locator('.article-badge').first()).toHaveText('with article');
  await page.getByRole('textbox').first().fill('livre');
  await expect(page.locator('.article-badge').first()).toHaveClass(/is-alert/);
  await expect(page.locator('.info-box')).toHaveCount(0);
  await proceed(page);
  await expect(page.getByRole('status').filter({ hasText: 'Type the article before the word' })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('textbox').first().fill('un livre');
  await expect(page.locator('.article-badge').first()).not.toHaveClass(/is-alert/);
  await expect(page.locator('.info-box')).toBeVisible(); // stays until Continue is pressed again
  const score = await page.locator('.session-score').textContent();
  await proceed(page);
  await expect(page.locator('.session-score')).toHaveText(score!); // no exam feedback during the exam
  await proceed(page);

  await expect(page.getByRole('heading', { name: 'Your exam answers' })).toBeVisible();
  await expect(page.locator('.result-note-almost')).toHaveCount(0);
  for (const list of await page.locator('.result-list').all()) await expect(list).not.toContainText(/\d \/ 1/); // no point fractions in the review
  await page.getByRole('button', { name: /^Typed gaps/ }).click();
  // Only mistakes are listed; the capitalised "Chaise" is an "almost" with half a point.
  await expect(page.locator('.result-note-almost')).toBeVisible();
  await expect(page.locator('.match-summary')).toContainText(/of 4 correct\./);
  await expect(page.locator('.result-item')).toHaveCount(4); // every answer is listed, correct ones too
  const menu = await page.locator('.result-menu button').allTextContents();
  // The highlighted final exam comes first, then the exercises in the order they were presented.
  expect(menu[0]).toBe('Final exam');
  await expect(page.locator('.result-menu .button-exam')).toHaveText('Final exam');
  expect(menu[1]).toBe('Matching'); // unscored parts (introduction, flashcards) are not offered
  expect(menu.join()).not.toMatch(/Introduction|Flashcards/);
  // The card shows the selected part (heading and score), the lesson title and the lesson total only.
  await expect(page.locator('.summary-card h1')).toHaveText('Typed gaps');
  await expect(page.locator('.summary-card')).toContainText('Les objets de la classe');
  await expect(page.locator('.summary-card')).toContainText(/Lesson total: [\d.]+ \/ 100/);
  await expect(page.locator('.summary-card')).not.toContainText(/contributes|Practice:/);
  await expect(page.locator('.results-footer .button-primary')).toHaveText('Lesson overview');
  await expect(page.locator('.results-footer .button-outline')).toHaveText('Repeat lesson');
  await page.locator('.results-footer').getByRole('link', { name: 'Lesson overview' }).click();
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
    // A fully correct single-answer page flashes green and moves on by itself.
    await expect(page.locator('.task-card.is-celebrating')).toHaveCount(0);
    if (await page.getByRole('timer').isVisible()) break;
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
    await answerGap(page, word);
  }
}

test('plays French listening choice and dictation with a suitable voice', async ({ page }) => {
  await mockFrenchVoice(page, true);
  await reachListeningPractice(page);
  await expect(page.getByRole('button', { name: 'Listen' })).toBeVisible();
  await page.getByRole('button', { name: 'Listen' }).click();
  expect(await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)).toContain('écoutez');
  // A wrong choice shows the correction; a right one lights up green and moves on by itself.
  const choose = async (right: boolean) => {
    await page.getByRole('button', { name: 'Listen' }).click();
    const word = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
    const options = page.locator('fieldset.choices label');
    for (const option of await options.all()) if (((await option.textContent())!.trim() === word) === right) return option.click();
  };
  await choose(false);
  await proceed(page);
  await expect(page.locator('.feedback').first()).toBeVisible();
  await proceed(page);
  await choose(true);
  await proceed(page);
  await expect(page.locator('.task-card.is-celebrating .choice:has(input:checked)')).toHaveCount(1);
  await expect(page.locator('.feedback')).toHaveCount(0);
  await passExamIntro(page);
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
  // The capitalised dictation answer is listed as "almost" (half a point); the exact one is not listed.
  await expect(page.locator('.result-list > li.outcome-orthography_only')).toHaveCount(1);
  await expect(page.locator('.result-note-almost')).toBeVisible();
});

test('blocks a lesson with listening tasks on the start page while no French voice is installed', async ({ page }) => {
  await mockFrenchVoice(page, false);
  await page.goto('./#/lesson/fr-classroom-instructions/play');
  await expect(page.getByRole('alert').getByRole('heading', { name: 'French voice unavailable' })).toBeVisible();
  await expect(page.getByText('Steps for Windows with Chrome:')).toBeVisible(); // Playwright's Desktop Chrome user agent
  await expect(page.getByRole('button', { name: /^(Continue|Resume lesson)$/ })).toHaveCount(0);
  // A lesson without listening tasks starts as usual.
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('replaces a revealed flashcard Listen button with Install language, which opens the help dialog', async ({ page }) => {
  await mockFrenchVoice(page, false);
  await page.goto('./#/lesson/fr-classroom-objects/play');
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
  await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled();
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
