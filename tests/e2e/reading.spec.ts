import { readFileSync } from 'node:fs';
import { lessonNav } from './nav.ts';
import { expect, test, type Page } from '@playwright/test';

/** Reading lesson (docs/reading-lessons.md) on the fixture fr-fix-menu: the A1 menu lesson. */
type Json = any;
const fixture = (dir: string): Json => JSON.parse(readFileSync(new URL(`../fixtures/content/${dir}/fr-fix-menu.json`, import.meta.url), 'utf8'));
const brief = fixture('briefs'), lesson = fixture('lessons');
const items: Json[] = lesson.steps.flatMap((s: Json) => s.pages.flatMap((p: Json) => p.items));
const segment = (id: string) => lesson.documents.flatMap((d: Json) => d.parts.flatMap((p: Json) => p.segments)).find((s: Json) => s.segmentId === id);
const meaning = new Map<string, string>(brief.keywords.map((k: Json) => [k.translations.en[0], k.term]));
const right = (q: Json) => q.options.find((o: Json) => o.optionId === q.answerOptionId).text;
const TF = { true: 'Vrai', false: 'Faux', not_stated: 'Pas dans le texte' } as Record<string, string>;
const primary = (page: Page) => page.locator('.task-footer .button-primary');

test.beforeEach(async ({ page }) => {
  // The key word cards offer audio; a stub voice keeps the audio buttons in their normal state.
  await page.addInitScript(() => {
    const french = { lang: 'fr-FR', name: 'Test French', voiceURI: 'test-fr', localService: true, default: true };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [french], cancel: () => undefined, speak: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; constructor(text: string) { this.text = text; } } });
  });
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

/** Answers the questions of the page: right ones, or the first wrong option / a wrong typed answer. */
async function answer(page: Page, wrong = false) {
  for (const unit of await page.locator('.reading-questions .unit').all()) {
    const question = (await unit.locator('.reading-question > span').first().textContent())!.replace(/^Statement: /, '');
    const q = items.find((i) => i.question === question || i.statement === question);
    if (q.type === 'reading_short_answer') await unit.getByRole('textbox').fill(wrong ? 'zzz' : q.accepted.answers[0]);
    else {
      const text = q.type === 'reading_true_false' ? TF[q.answer] : right(q);
      const choice = wrong ? unit.locator('.choice').filter({ hasNotText: new RegExp(`^${text}$`) }).first() : unit.locator('.choice').filter({ hasText: new RegExp(`^${text}$`) });
      await choice.click();
    }
  }
}

test('plays a reading lesson: key words, skim with blur, detail with evidence, structure, timed exam, results and resume', async ({ page }) => {
  await page.goto('./#/lesson/fr-fix-menu/play');
  await expect(page.locator('.kind-badge')).toHaveText('Reading');
  await expect(page.locator('.flow-section')).toHaveCount(5); // the five stages as lettered sections
  await page.locator('.start-card .button-primary').click();

  // 1. Key words, then the matching board.
  await expect(page.locator('.keyword-cards li')).toHaveCount(brief.keywords.length);
  await primary(page).click();
  const native = page.locator('.matching-columns > ul').first().locator('.match-item');
  for (const label of await native.allTextContents()) {
    await native.filter({ hasText: new RegExp(`^${label.trim()}$`) }).click();
    await page.locator('.matching-columns > ul').last().locator('.match-item').filter({ hasText: meaning.get(label.trim())! }).click();
  }
  await primary(page).click();
  await expect(page.locator('.reading-skim-bar')).toBeVisible({ timeout: 5000 }); // a fully correct board goes straight on

  // 2. Skim: the question opens once the document blurs.
  await expect(page.getByRole('timer')).toContainText(/0:4\d/);
  await expect(page.getByText('The question opens when the text blurs')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  await expect(page.getByRole('timer')).toBeVisible(); // the skim countdown restarts after a reload
  await page.getByRole('button', { name: 'I’ve finished reading' }).click();
  await expect(page.locator('.reading-document')).toHaveClass(/is-blurred/);
  const skim = items.find((i) => i.type === 'reading_skim_choice');
  await page.locator('.choice').filter({ hasText: right(skim) }).click();
  await primary(page).click();
  await expect(page.locator('.feedback.outcome-fully_correct')).toBeVisible(); // reading always shows its correction
  await page.reload();
  await page.getByRole('button', { name: 'Resume lesson' }).click();
  await expect(page.locator('.reading-document')).not.toHaveClass(/is-blurred/); // checked: the document is readable again
  await primary(page).click();

  // 3. Detail: wrong answers show the right one and the proof in the document.
  await expect(page.locator('.reading-doc-slot.is-side')).toBeVisible();
  await answer(page, true);
  await primary(page).click();
  const evidence = new Set(items.filter((i) => i.evidenceSegmentIds && lesson.steps[2].pages[0].items.includes(i)).flatMap((i) => i.evidenceSegmentIds));
  await expect(page.locator('.reading-segment.is-evidence')).toHaveCount(evidence.size);
  await expect(page.locator('.feedback.outcome-incorrect').first()).toBeVisible();
  await primary(page).click();

  // 4. Structure: heading matching next to the document.
  const task = lesson.steps[3].pages[0].items.find((i: Json) => i.type === 'reading_part_heading_matching');
  const headingOf = new Map<string, string>(task.headings.map((h: Json) => [h.headingId, h.text]));
  const partLabel = (partId: string) => lesson.documents[0].parts.find((p: Json) => p.partId === partId).segments[0].text.split(/\s+/).slice(0, 3).join(' ');
  for (const pair of task.pairs) {
    await page.locator('.matching-columns > ul').first().locator('.match-item').filter({ hasText: headingOf.get(pair.headingId)! }).click();
    await page.locator('.matching-columns > ul').last().locator('.match-item').filter({ hasText: partLabel(pair.partId) }).click();
  }
  await primary(page).click();
  // The page also shows the document, so it keeps its checked view even when every pair is right.
  await expect(page.locator('.match-summary')).toHaveText(`${task.pairs.length} of ${task.pairs.length} pairs correct.`);
  await primary(page).click();

  // 5. Exam: info page, then the new document without highlights and with a countdown.
  await expect(page.locator('.exam-intro')).toContainText('Questions on the document');
  await primary(page).click();
  await expect(page.locator('.timer-box')).toBeVisible();
  await expect(page.locator('.reading-keyword')).toHaveCount(0);
  await answer(page);
  await primary(page).click();

  // Results: exam 5 / 5; the lesson total weights practice 30 % and the exam 70 %.
  await expect(page.locator('.total-score')).toHaveText('5 / 5');
  const practice = (brief.keywords.length + 1 + task.pairs.length) / (brief.keywords.length + 1 + 4 + task.pairs.length);
  await expect(page.locator('.results-total')).toHaveText(`Lesson total: ${(Math.round((30 * practice + 70) * 10) / 10).toLocaleString('en')} / 100`);
  await (await lessonNav(page)).getByRole('button', { name: /^Detail/ }).click();
  const firstWrong = items.find((i) => i.itemId === lesson.steps[2].pages[0].items[1].itemId);
  await expect(page.locator('.result-evidence').first()).toContainText(segment(firstWrong.evidenceSegmentIds[0]).text);
});

test('shows the reading brief and the content review in the three interface languages', async ({ page }) => {
  await page.goto('./#/lesson/fr-fix-menu');
  await expect(page.getByRole('heading', { name: 'Key words', level: 3, exact: true })).toBeVisible();
  await expect(page.getByText('Genre: menu')).toBeVisible();
  await expect(page.locator('.reading-review-documents .reading-document')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Start lesson' })).toBeVisible();
  for (const [locale, heading] of [['fr', 'Mots clés'], ['de', 'Schlüsselwörter']]) {
    await page.getByRole('combobox', { name: /Interface language|Langue de l'interface|Sprache der Oberfläche/ }).selectOption(locale);
    await expect(page.getByRole('heading', { name: heading, level: 3, exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
