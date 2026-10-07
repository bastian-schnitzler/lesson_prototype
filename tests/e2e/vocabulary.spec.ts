import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * P2-04: complete vocabulary sessions in the browser. A small solver reads the fixture brief and
 * lesson, so a run can answer every task correctly (or deliberately wrongly) and the scores can be
 * checked exactly.
 */
type Json = any;
const fixture = (dir: string, id: string): Json => JSON.parse(readFileSync(new URL(`../fixtures/content/${dir}/${id}.json`, import.meta.url), 'utf8'));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The answers of a vocabulary lesson, read from its brief (the brief is the whole lesson, P2-04). */
function lessonData(id: string) {
  const brief = fixture('briefs', id);
  const target = new Map<string, Json>(brief.targets.map((t: Json) => [t.id, t]));
  return {
    brief, target,
    /** Mother-tongue label → French teaching form, for matching pages. */
    matching: new Map<string, string>(brief.targets.map((t: Json) => [t.matchingLabel?.en ?? t.translations.en[0], t.teachingForm])),
    gaps: brief.targets.map((t: Json) => t.gap),
    /** Translation prompt → exam answer. */
    exam: new Map<string, string>(brief.targets.map((t: Json) => [t.examPrompt?.en ?? t.translations.en[0], t.examForms[0]])),
    /** Scored exam units: one translation and one dictation per word. */
    examUnits: 2 * brief.targets.length,
    /** Words on the first exam page: the first group, at most six (derived pages). */
    firstExamPage: Math.min(6, brief.groups[0].targetIds.length),
  };
}

/** A French test voice: lessons with listening tasks need one to start. */
async function mockFrenchVoice(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Object.defineProperty(window, '__spoken', { value: spoken, configurable: true });
    const french = { lang: 'fr-FR', name: 'Test French', voiceURI: 'test-fr', localService: true, default: true };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [french], cancel: () => undefined, speak: (u: { text: string }) => { spoken.push(u.text); },
      addEventListener: () => undefined, removeEventListener: () => undefined,
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; lang = ''; voice: unknown; constructor(text: string) { this.text = text; } } });
  });
}

/** Plays a unit's audio and returns the spoken text (mocked voice). */
async function heard(page: Page, unit: ReturnType<Page['locator']>) {
  await unit.getByRole('button', { name: 'Listen' }).click();
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.at(-1)!);
}

const primary = (page: Page) => page.getByRole('button', { name: /^(Continue|Check)$/ });

/**
 * Plays from the current page to the results. `exam` decides each exam answer (default: correct);
 * `stopAtExam` returns as soon as the first timed exam page is shown.
 */
type Options = { exam?: (correct: string) => string; stopAtExam?: boolean };
async function solve(page: Page, data: ReturnType<typeof lessonData>, opts: Options = {}) {
  for (let guard = 0; guard < 80; guard++) {
    if (await page.locator('.summary-card').count()) return;
    if (opts.stopAtExam && (await page.getByRole('timer').count())) return;
    await step(page, data, opts);
  }
  throw new Error('the session did not reach the results');
}

/** Answers and confirms the current page. */
async function step(page: Page, data: ReturnType<typeof lessonData>, opts: Options) {
  {
    const skip = page.getByRole('button', { name: 'Skip listening task' });
    if (await skip.count()) return skip.click();
    const flip = page.getByRole('button', { name: 'Flip card to French' });
    while (await flip.count()) await flip.first().click();
    // Matching: click each meaning, then its French partner.
    const native = page.locator('.matching-columns > ul').first().locator('.match-item');
    for (const label of await native.allTextContents()) {
      await native.filter({ hasText: new RegExp(`^${escape(label)}$`) }).click();
      await page.locator('.matching-columns > ul').last().locator('.match-item').filter({ hasText: new RegExp(`^${escape(data.matching.get(label)!)}`) }).click();
    }
    // Gender page: pick the accepted gender of each bare term.
    for (const row of await page.locator('.gender-row').all()) {
      const term = (await row.locator('.gender-label > span').first().locator('.gender-lemma').textContent())!;
      const t = [...data.target.values()].find((x) => x.term === term);
      if (t?.genders.length && (await row.locator('fieldset:not([disabled])').count())) await row.getByText(t.genders[0] === 'feminine' ? 'Feminine' : 'Masculine', { exact: true }).click();
    }
    // Typed gap: find the item by its sentence start.
    const sentence = page.locator('.gap-sentence');
    if (await sentence.count()) {
      const text = (await sentence.textContent())!;
      const gap = data.gaps.find((g: Json) => text.includes(g.before.trim()) && text.includes(g.after.trim()));
      await page.getByRole('textbox').fill(gap.accepted.answers[0]);
    }
    // Listening choice: play the word, then pick the option that says it.
    for (const unit of await page.locator('.units .unit:has(fieldset.choices)').all()) {
      const word = await heard(page, unit);
      await unit.locator('fieldset.choices label').filter({ hasText: new RegExp(`^\\s*${escape(word)}\\s*$`) }).click();
    }
    // Translation and dictation exam.
    for (const unit of await page.locator('.units .unit:has(.field)').all()) {
      const field = unit.locator('.field');
      const label = (await field.locator('span').first().textContent())!.replace(/(with|without) article$/, '').trim();
      const correct = data.exam.get(label) ?? (label === 'Write what you hear' ? await heard(page, unit) : undefined);
      if (correct !== undefined) await field.locator('input').fill(opts.exam ? opts.exam(correct) : correct);
    }
    await primary(page).click();
    // A correct practice page flashes green and moves on; otherwise confirm the shown feedback.
    await expect(page.locator('.task-card.is-celebrating')).toHaveCount(0, { timeout: 10_000 });
    if ((await page.locator('.feedback, .text-input.is-wrong, .text-input.is-almost, .choice.is-wrong, .matching.is-checked, .gender-page .match-summary').count()) && (await primary(page).count())) await primary(page).click();
  }
}

// Whole-lesson journeys take longer than the default 30 s, especially with parallel workers.
test.describe.configure({ timeout: 150_000 });

test.beforeEach(async ({ page }) => {
  await mockFrenchVoice(page); // every vocabulary lesson has listening tasks (P2-04)
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('plays a multi-group noun lesson perfectly: group-wise stages, exam info, 100 points, transient last-try score', async ({ page }) => {
  const data = lessonData('fr-family-members');
  await page.goto('./#/lesson/fr-family-members/play');
  await expect(page.locator('.group-list li')).toHaveCount(data.brief.groups.length, { timeout: 20_000 }); // start page lists the word groups
  await primary(page).click();
  // Each group's introduction is followed by its flashcards.
  const order: string[] = [];
  for (let i = 0; i < 4; i++) {
    order.push((await page.locator('.task-card .label-muted').first().textContent())!);
    const flip = page.getByRole('button', { name: 'Flip card to French' });
    while (await flip.count()) await flip.first().click();
    await primary(page).click();
  }
  expect(order).toEqual(['Introduction', 'Flashcards', 'Introduction', 'Flashcards']);
  await solve(page, data, { stopAtExam: true });
  // No answer leaks during the exam: no French teaching form is on the page.
  const body = (await page.locator('main').textContent())!;
  for (const t of data.target.values()) expect(body).not.toContain(t.teachingForm);
  await solve(page, data);
  await expect(page.locator('.summary-card .results-total')).toHaveText('Lesson total: 100 / 100');
  await expect(page.locator('.summary-card .total-score')).toHaveText(`${data.examUnits} / ${data.examUnits}`);
  // Only scored parts are offered; each word group is one frame with its name shown once.
  await expect(page.locator('.result-menu button')).toHaveText(['Final exam', 'Matching', 'Gender and overview', 'Practice', 'Listening']);
  await page.getByRole('button', { name: 'Practice' }).click();
  await expect(page.locator('.result-section.is-framed')).toHaveCount(data.brief.groups.length);
  await expect(page.locator('.result-section-title')).toHaveText(data.brief.groups.map((g: Json) => g.label.en));
  // The last-try score appears on the index and disappears after a full reload.
  await page.locator('.results-footer').getByRole('link', { name: 'Lesson overview' }).click();
  const score = page.locator('tr[data-lesson-id="fr-family-members"] .score');
  await expect(score).toHaveText(/100/);
  await page.reload();
  await expect(score).toBeEmpty();
});

test('a timed vocabulary exam page locks at its countdown and the results mark the timeout', async ({ page }) => {
  await page.clock.install();
  const data = lessonData('fr-family-members');
  await page.goto('./#/lesson/fr-family-members/play');
  await primary(page).click();
  await solve(page, data, { stopAtExam: true });
  const limit = 20 * data.firstExamPage; // derived: 20 s per word
  await page.clock.fastForward(limit * 1000 + 2000);
  await expect(page.getByRole('timer')).toBeVisible(); // the second exam page starts its own countdown
  await solve(page, data);
  // The first exam page timed out empty; the second was answered in time.
  const timedOut = data.firstExamPage;
  await expect(page.locator('.result-note').filter({ hasText: 'Time expired' })).toHaveCount(timedOut);
  await expect(page.locator('.summary-card .total-score')).toHaveText(`${data.examUnits - timedOut} / ${data.examUnits}`);
});

test('half credit for a capitalised exam answer, then Repeat lesson starts a fresh attempt', async ({ page }) => {
  const data = lessonData('fr-family-members');
  await page.goto('./#/lesson/fr-family-members/play');
  await primary(page).click();
  let first = true;
  await solve(page, data, { exam: (correct) => (first ? ((first = false), correct.toUpperCase()) : correct) });
  await expect(page.locator('.result-note-almost')).toHaveCount(1);
  await expect(page.locator('.summary-card .total-score')).toHaveText(`${data.examUnits - 0.5} / ${data.examUnits}`);
  await page.getByRole('button', { name: 'Repeat lesson' }).click();
  await expect(page.locator('.task-card .label-muted').first()).toHaveText('Introduction');
  await expect(page.locator('.session-score')).toHaveText('0 / 100');
});

test('a lesson without nouns has no gender page, no gender tags and non-clickable reference words', async ({ page }) => {
  const data = lessonData('fr-classroom-instructions');
  await page.goto('./#/lesson/fr-classroom-instructions/play');
  await primary(page).click();
  const stages = new Set<string>();
  for (let guard = 0; guard < 40 && !(await page.getByRole('timer').count()) && !(await page.locator('.summary-card').count()); guard++) {
    // The voice-unavailable page has no stage label; step() skips it.
    if (await page.locator('.task-card .label-muted').count()) stages.add((await page.locator('.task-card .label-muted').first().textContent()) ?? '');
    await expect(page.locator('fieldset.gender-options')).toHaveCount(0);
    const flip = page.getByRole('button', { name: 'Flip card to French' });
    while (await flip.count()) await flip.first().click();
    for (const back of await page.locator('.flashcard-back').all()) await expect(back).not.toContainText(/Masculine|Feminine/);
    if (await page.locator('.reference-list').count()) {
      await expect(page.locator('.reference-list').getByRole('button')).toHaveCount(0);
      await page.locator('.reference-list li').first().click();
      await expect(page.getByRole('textbox')).toHaveValue(''); // clicking a reference word selects nothing
    }
    await step(page, data, {});
  }
  expect([...stages]).toEqual(expect.arrayContaining(['Introduction', 'Flashcards', 'Matching', 'Overview']));
  expect([...stages]).not.toContain('Gender and overview');
});
