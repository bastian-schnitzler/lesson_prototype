import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Every vocabulary lesson has listening tasks (P2-04) and needs a French voice to start.
  await page.addInitScript(installFrenchVoice, true);
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
 * Answers a typed gap: a correct answer flashes green and moves on by itself; otherwise the field
 * is marked in place (red, or amber for half a point) with the correct answer, and Continue confirms it.
 */
async function answerGap(page: Page, word: string, check?: () => Promise<void>) {
  await page.getByRole('textbox').fill(word);
  await proceed(page);
  // Either the field is marked in place, or (after the green flash) the next page shows an empty field.
  await page.waitForFunction(() => {
    const field = document.querySelector<HTMLInputElement>('.task-card input.text-input');
    return !!document.querySelector('.text-input.is-wrong, .text-input.is-almost') || !field || field.value === '';
  });
  if (await page.locator('.text-input.is-wrong, .text-input.is-almost').count()) {
    await check?.();
    await proceed(page);
  }
}

/**
 * Answers a listening-choice page: plays the word and picks the option that says it (or another
 * one). A right choice lights up green and moves on; a wrong one is confirmed after its correction.
 */
async function answerListening(page: Page, right = true) {
  await page.getByRole('button', { name: 'Listen' }).click();
  const word = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
  for (const option of await page.locator('fieldset.choices label').all()) {
    if (((await option.locator('span[lang]').textContent())!.trim() === word) === right) { await option.click(); break; }
  }
  await proceed(page);
  if (!right) {
    await expect(page.locator('.choice.is-wrong')).toHaveCount(1);
    await proceed(page);
  } else await expect(page.locator('.task-card.is-celebrating')).toHaveCount(0);
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
  // The French boxes glide to their new rows (frame by frame, with the curves following).
  await expect.poll(() => page.locator('.matching-columns [data-flip]').evaluateAll((cells) => cells.some((c) => (c as HTMLElement).style.transform !== '')), { intervals: [20] }).toBe(true);
  // Checked in place (no correction view): every French word moves level with its correct meaning,
  // right ones green and wrong ones red; only the two wrong pairs keep a (red) curve on wide screens.
  await expect(page.locator('.match-summary')).toContainText('2 of 4 pairs correct.');
  const french = page.locator('.matching-columns > ul').last().locator('.match-item');
  await expect(french.and(page.locator('.is-wrong'))).toHaveCount(2);
  await expect(french.and(page.locator('.is-right'))).toHaveCount(2);
  if (page.viewportSize()!.width >= 720) await expect(page.locator('.match-curve.is-checked')).toHaveCount(2);
  await page.waitForTimeout(1300); // the slide animation (1.2 s)
  for (const meaning of await page.locator('.matching-columns > ul').first().locator('.match-item').all()) {
    const word = PAIRS[(await meaning.textContent())!.replace(/\d+$/, '').trim()];
    const partner = french.filter({ hasText: word });
    expect(Math.abs((await partner.boundingBox())!.y - (await meaning.boundingBox())!.y)).toBeLessThan(2);
  }
  await expect(page.locator('.match-corrections')).toHaveCount(0);
  await proceed(page);

  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  await expect(page.getByText('Gender and overview')).toBeVisible();
  await expect(page.locator('.task-card select')).toHaveCount(0);
  await chooseGenders(page);
  // Check reveals the teaching form, translation and summary without moving or resizing anything.
  const boxes = () => page.locator('.gender-row, .gender-option span').evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return [Math.round(r.left), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)];
  }));
  const before = await boxes();
  await proceed(page);
  await expect(page.locator('.gender-page .match-summary')).toBeVisible();
  expect(await boxes()).toEqual(before);
  await proceed(page);
  // Typed gaps: the cursor is already in the field; the four reference words stand above it.
  await expect(page.getByRole('textbox')).toBeFocused();
  const field = (await page.getByRole('textbox').boundingBox())!;
  const refs = page.locator('.reference-list > li');
  await expect(refs).toHaveCount(4);
  expect((await refs.last().boundingBox())!.y).toBeLessThan(field.y); // the reference words stand above the field
  for (const word of ['livre', 'Chaise', 'stylo', 'table']) {
    // The capitalised "Chaise" earns half a point: the field turns amber, the correct answer follows in
    // green, and only then an explanation appears below the Continue button, which keeps its place.
    await answerGap(page, word, async () => {
      await expect(page.locator('.text-input.is-almost')).toBeVisible();
      await expect(page.locator('.inline-answer')).toHaveCount(0); // the green reference card shows the word
      await expect(page.locator('.reference-list li.is-correct')).toHaveText(/chaise/);
      await expect(page.locator('.units .feedback')).toHaveCount(0); // no feedback card under the field
      const button = (await page.getByRole('button', { name: 'Continue' }).boundingBox())!;
      expect((await page.locator('.footer-note').boundingBox())!.y).toBeGreaterThan(button.y);
    });
  }
  // Every vocabulary lesson continues with a listening choice per word (P2-04).
  for (let n = 0; n < 4; n++) await answerListening(page);
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
  await expect(page.getByRole('status').filter({ hasText: 'Type the indefinite article before the word (un, une or des).' })).toBeVisible();
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
  await page.getByRole('button', { name: /^Practice/ }).click();
  // The capitalised "Chaise" is an "almost" with half a point.
  await expect(page.locator('.result-note-almost')).toBeVisible();
  await expect(page.locator('.match-summary')).toContainText(/of 4 correct\./);
  await expect(page.locator('.result-item')).toHaveCount(4); // every answer is listed, correct ones too
  const menu = await page.locator('.result-menu button').allTextContents();
  // The highlighted final exam comes first, then the exercises in the order they were presented.
  expect(menu[0]).toBe('Final exam');
  await expect(page.locator('.result-menu .button-exam')).toHaveText('Final exam');
  expect(menu[1]).toBe('Matching'); // unscored parts (introduction, flashcards) are not offered
  expect(menu.join()).not.toMatch(/Introduction|Flashcards/);
  expect(menu.slice(-1)).toEqual(['Listening']); // listening has its own results (P2-04 review)
  // Gender results name the word once: "word: chosen gender", a mistake struck through → the correct gender.
  await page.getByRole('button', { name: 'Gender and overview' }).click();
  await expect(page.locator('.result-gender').first()).toHaveText(/^(livre|chaise|stylo|table):\s*(Your answer: )?(Masculine|Feminine)/);
  await expect(page.locator('.result-gender').first()).not.toContainText(/\b(un|une) /);
  await page.getByRole('button', { name: /^Practice/ }).click();
  // The card shows the selected part (heading and score), the lesson title and the lesson total only.
  await expect(page.locator('.summary-card h1')).toHaveText('Practice');
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
    // An error spotter shows its correction only after a word is selected (P3-07 review).
    const spot = page.locator('.spot');
    if (await spot.locator('button.token:not([disabled])').count()) await spot.locator('button.token:not([disabled])').first().click();
    const inputs = page.locator('.task-card input.text-input:not([readonly])');
    for (const input of await inputs.all()) await input.fill('ne pas');
    await chooseAll(page);
    for (const group of await page.locator('fieldset.choices:not([disabled])').all()) await group.locator('input').first().check();
    for (const bank of await page.locator('.order-bank').all()) while (await bank.locator('button').count()) await bank.locator('button').first().click();
    await proceed(page);
  }
  await expect(page.getByRole('timer')).toHaveText('1:00');
  await page.clock.fastForward('01:05');
  // The first page timed out; the second page starts its own 45-second limit.
  await expect(page.getByRole('timer')).toHaveText(/^0:4[45]$/);
});

/** Browser speech synthesis with (or without) one French voice; spoken texts are recorded in window.__spoken. */
function installFrenchVoice(hasVoice: boolean) {
  const spoken: string[] = [];
  // Tests switch the voice off later with window.__setVoice(false), which fires voiceschanged.
  const listeners: (() => void)[] = [];
  const state = window as unknown as { __hasVoice: boolean; __setVoice: (on: boolean) => void };
  state.__hasVoice = hasVoice;
  state.__setVoice = (on) => { state.__hasVoice = on; listeners.forEach((listener) => listener()); };
  Object.defineProperty(window, '__spoken', { value: spoken, configurable: true });
  const french = { lang: 'fr-FR', name: 'Test French', voiceURI: 'test-fr', localService: true, default: true };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => ((window as unknown as { __hasVoice: boolean }).__hasVoice ? [french] : []), cancel: () => undefined,
    speak: (utterance: { text: string }) => { spoken.push(utterance.text); },
    addEventListener: (_: string, listener: () => void) => { listeners.push(listener); }, removeEventListener: () => undefined,
  } });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class {
    text: string; lang = ''; voice: unknown;
    constructor(text: string) { this.text = text; }
  } });
}

async function mockFrenchVoice(page: Page, available: boolean) {
  await page.addInitScript(installFrenchVoice, available);
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
  for (const word of ['écoutez', 'lisez', 'écrivez', 'répétez']) {
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
    for (const option of await options.all()) if (((await option.locator('span[lang]').textContent())!.trim() === word) === right) return option.click();
  };
  await choose(false);
  await expect(page.locator('fieldset.choices .choice-gender')).toHaveCount(0); // fr-classroom-instructions has no nouns
  await proceed(page);
  // A wrong choice: the chosen option red, the correct one green, no feedback card.
  await expect(page.locator('.choice.is-wrong')).toHaveCount(1);
  await expect(page.locator('.choice.is-right')).toHaveCount(1);
  await expect(page.locator('.feedback')).toHaveCount(0);
  await proceed(page);
  await choose(true);
  await proceed(page);
  await expect(page.locator('.task-card.is-celebrating .choice:has(input:checked)')).toHaveCount(1);
  await expect(page.locator('.feedback')).toHaveCount(0);
  await expect(page.locator('.task-card.is-celebrating')).toHaveCount(0);
  for (let n = 0; n < 2; n++) await answerListening(page); // every word has a listening choice (P2-04)
  await passExamIntro(page);
  await expect(page.getByRole('timer')).toBeVisible();
  for (const input of await page.getByRole('textbox').all()) await input.fill('écoutez');
  await proceed(page);
  await expect(page.getByRole('button', { name: 'Listen' }).first()).toBeVisible();
  await expect(page.getByRole('timer')).toHaveText('2:00'); // derived: 30 s per word
  // Type back what the voice said: the first answer in capitals (half credit), the others exactly.
  const listen = page.getByRole('button', { name: 'Listen' });
  const heard = async (index: number) => {
    await listen.nth(index).click();
    return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
  };
  const first = await heard(0);
  expect(await heard(0)).toBe(first); // replay is allowed until the page locks
  await page.getByRole('textbox').first().fill(first.toUpperCase());
  for (let n = 1; n < 4; n++) await page.getByRole('textbox').nth(n).fill(await heard(n));
  await proceed(page);
  await expect(page.getByRole('heading', { name: 'Your exam answers' })).toBeVisible();
  // Translation (open) and dictation are separate accordions.
  await expect(page.locator('.result-accordion > summary')).toHaveText([/^Translation/, /^Dictation/]);
  await page.locator('.result-accordion > summary').filter({ hasText: 'Dictation' }).click();
  // The capitalised dictation answer is listed as "almost" (half a point).
  await expect(page.locator('.result-list > li.outcome-orthography_only')).toHaveCount(1);
  await expect(page.locator('.result-note-almost')).toBeVisible();
});

test('blocks a lesson with listening tasks on the start page while no French voice is installed', async ({ page }) => {
  await mockFrenchVoice(page, false);
  await page.goto('./#/lesson/fr-classroom-instructions/play');
  await expect(page.getByRole('alert').getByRole('heading', { name: 'French voice unavailable' })).toBeVisible();
  await expect(page.getByText('Steps for Windows with Chrome:')).toBeVisible(); // Playwright's Desktop Chrome user agent
  await expect(page.getByRole('button', { name: /^(Continue|Resume lesson)$/ })).toHaveCount(0);
  // A lesson without listening tasks (grammar) starts as usual.
  await page.goto('./#/lesson/fr-verb-etre-present/play');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  // Grammar start pages list the verbs the lesson introduces (P3-07).
  await expect(page.getByRole('heading', { name: 'New verbs' })).toBeVisible();
  await expect(page.getByRole('row', { name: /être.*to be/ })).toBeVisible();
});

test('replaces a revealed flashcard Listen button with Install language, which opens the help dialog', async ({ page }) => {
  await page.goto('./#/lesson/fr-classroom-objects/play');
  await proceed(page); // start (a voice is needed to start)
  await proceed(page); // introduction
  // The voice disappears during the lesson, e.g. after a browser update.
  await page.evaluate(() => (window as unknown as { __setVoice: (on: boolean) => void }).__setVoice(false));
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
  // Only the background turns green; boxes keep their colour and every curve stays.
  await expect(page.locator('.task-card.is-celebrating .matching')).toBeAttached();
  await expect(french.and(page.locator('.is-right'))).toHaveCount(0);
  if (page.viewportSize()!.width >= 720) await expect(page.locator('.match-curve.is-thin')).toHaveCount(4); // thin purple curves
  await expect(page.getByText('Gender and overview')).toBeVisible();
});

test('pronoun/form matching by drag and drop and by clicks, with per-row checks (P3-02)', async ({ page }) => {
  await page.goto('./#/lesson/fr-verb-etre-present/play');
  await proceed(page); // start
  await proceed(page); // explanation
  const bank = page.getByRole('group', { name: 'Available forms' });
  const slot = (pronoun: string) => page.locator('.form-row').filter({ has: page.locator('.form-pronoun', { hasText: new RegExp(`^${pronoun}$`) }) }).locator('.form-slot');
  const drag = async (from: Locator, to: Locator) => {
    const a = (await from.boundingBox())!, b = (await to.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 10, { steps: 3 });
    await expect(page.locator('.drag-ghost')).toBeVisible();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  // Drag suis onto je, then move it on to tu, then drag it back into the bank.
  await drag(bank.getByRole('button', { name: 'suis' }), slot('je'));
  await expect(slot('je')).toHaveText('suis');
  await expect(bank.getByRole('button', { name: 'suis' })).toHaveCount(0);
  await drag(slot('je').locator('.form-placed'), slot('tu'));
  await expect(slot('tu')).toHaveText('suis');
  await expect(slot('je')).toHaveText('Choose a form');
  await drag(slot('tu').locator('.form-placed'), bank);
  await expect(bank.getByRole('button', { name: 'suis' })).toBeVisible();
  await expect(slot('tu')).toHaveText('Choose a form');
  await expect(page.locator('.form-slot .token')).toHaveCount(0); // a placed form has no token frame
  // Click alternative: a form, then its row; a row, then its form.
  await drag(bank.getByRole('button', { name: 'suis' }), slot('je'));
  await bank.getByRole('button', { name: 'est' }).click();
  await slot('tu').click();
  await slot('il / elle').click();
  await bank.getByRole('button', { name: 'es' }).click();
  await expect(page.getByText('All forms are placed.')).toBeVisible();
  await proceed(page); // Check
  await expect(page.getByText('1 of 3 rows correct.')).toBeVisible();
  await expect(page.locator('.form-row.is-right')).toHaveCount(1);
  await expect(page.locator('.form-row.is-wrong')).toHaveCount(2);
  await expect(page.locator('.form-row.is-wrong').first()).toContainText('Tu takes es');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
});

test('person matching: persons in order, checked in place like vocabulary matching (P3-02 review)', async ({ page }) => {
  await page.goto('./#/lesson/fr-verb-etre-present/play');
  await proceed(page); // start
  await proceed(page); // explanation
  const bank = page.getByRole('group', { name: 'Available forms' });
  for (const [form, n] of [['suis', 0], ['es', 1], ['est', 2]] as const) {
    await bank.getByRole('button', { name: form, exact: true }).click();
    await page.locator('.form-slot').nth(n).click();
  }
  await proceed(page); // Check
  await proceed(page); // feedback
  for (const answer of ['es', 'suis']) {
    await page.locator('fieldset.choices label').filter({ hasText: new RegExp(`^${answer}$`) }).click();
    await proceed(page);
    await expect(page.locator('.task-card.is-celebrating')).toHaveCount(0);
  }
  // The board: je, tu, il / elle on the left in person order, the forms shuffled on the right.
  const left = page.locator('.matching-columns > ul').first().getByRole('button');
  const right = page.locator('.matching-columns > ul').last().locator('.match-item');
  await expect(left).toHaveText(['je', 'tu', 'il / elle']);
  await expect(page.locator('.match-gap')).toHaveCount(0); // one number: three rows, no gap
  // je → es and tu → suis are swapped; il / elle → est is right.
  for (const [pronoun, form] of [['je', 'es'], ['tu', 'suis'], ['il / elle', 'est']]) {
    await left.filter({ hasText: new RegExp(`^${pronoun}$`) }).click();
    await right.filter({ hasText: new RegExp(`^${form}$`) }).click();
  }
  await proceed(page); // Check
  await expect(page.locator('.match-summary')).toContainText('1 of 3 pairs correct.');
  await expect(right.and(page.locator('.is-wrong'))).toHaveCount(2);
  if (page.viewportSize()!.width >= 720) await expect(page.locator('.match-curve.is-checked')).toHaveCount(2);
  await page.waitForTimeout(1300); // the slide
  for (const [pronoun, form] of [['je', 'suis'], ['tu', 'es'], ['il / elle', 'est']]) {
    const a = (await left.filter({ hasText: new RegExp(`^${pronoun}\\d*$`) }).boundingBox())!, b = (await right.filter({ hasText: new RegExp(`^${form}\\d*$`) }).boundingBox())!; // wrong pairs keep their number badge
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  }
});
