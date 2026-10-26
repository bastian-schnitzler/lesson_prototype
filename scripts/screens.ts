/**
 * Rendered screens (replace all Salt mockups): drives the real prototype on content/ in a headless
 * browser and saves every screen listed below as a full-page PNG and a self-contained HTML snapshot
 * (rendered DOM with the app's CSS inlined, no scripts) under docs/mockups/. Lesson screens build
 * their session state here with the app's own plan and session reducer, store it in browser storage
 * and resume it, so the screens are reproducible; index and artifact screens open their route.
 *
 *   node scripts/screens.ts [--only <path-prefix>] [--port 5176]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { scanContentDir } from './catalog.ts';
import { buildPlan, type LessonPlan, type PlanPage, type PlanUnit } from '../src/domain/session/plan.ts';
import { nextDialogueLine, requiredReveals, sessionReducer, startSession, type SessionAction, type SessionRecord, type UnitResponse } from '../src/domain/session/session.ts';
import { SESSION_KEY_PREFIX } from '../src/domain/session/storage.ts';
import { PREFERENCES_KEY } from '../src/domain/preferences.ts';
import { vocabularyLesson } from '../src/domain/vocabularyLesson.ts';
import { SKIMMED } from '../src/domain/session/readingPlan.ts';
import type { Page } from '@playwright/test';

const ROOT = resolve(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');
export const SCREENS_DIR = join(ROOT, 'docs', 'mockups');
/** Fixed browser time, so countdowns and dates are the same on every run. */
const T0 = Date.UTC(2026, 9, 16, 9, 0, 0);
const VIEWPORT = { width: 1280, height: 900 };

/* ------------------------------------------------------------- sessions */

let catalog: ReturnType<typeof scanContentDir> | undefined;
const read = (dir: string, id: string) => JSON.parse(readFileSync(join(CONTENT, dir, `${id}.json`), 'utf8'));

function lesson(id: string) {
  const brief = read('briefs', id);
  const vocabulary = brief.kind === 'vocabulary';
  const content = vocabulary ? vocabularyLesson(brief) : read('lessons', id);
  catalog ??= scanContentDir(CONTENT);
  const artifacts = catalog.manifest.artifacts[id];
  const contentHash = (vocabulary ? artifacts?.draft?.sourceHash : artifacts?.content?.sourceHash) ?? '';
  return { plan: buildPlan(content, brief, 'en', { interleaveGroups: true, examIntro: true }), contentHash };
}

const right = (u: PlanUnit): UnitResponse => (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] });

/** Builds one attempt with the app's reducer: walk to a page, type drafts, check. */
class Attempt {
  record: SessionRecord;
  readonly plan: LessonPlan;
  constructor(plan: LessonPlan, contentHash: string) {
    this.plan = plan;
    this.record = startSession(plan, { sessionId: 'screens', contentHash, level: 'A1', motherTongue: 'en', seed: 11, now: T0 });
  }
  get page(): PlanPage { return this.plan.pages[this.record.pageIndex]; }
  act(action: SessionAction) { this.record = sessionReducer(this.plan, this.record, action); return this; }
  /** Answers every page right (a matching board uses each option once) until `stop` holds for the current page. */
  to(stop: (p: PlanPage) => boolean) {
    for (let guard = 0; !stop(this.page) && this.record.status === 'active' && guard < 400; guard++) {
      for (const { itemKey, keys } of requiredReveals(this.page)) for (const key of keys) this.act({ type: 'reveal', itemKey, key, now: T0 });
      this.act({ type: 'voice_ready', now: T0 }); // a listening exam page starts its countdown with the voice
      const used = new Set<unknown>();
      for (const u of this.page.units) {
        let r = right(u);
        if (u.kind === 'choice' && used.has(r)) r = u.correct.find((c) => !used.has(c)) ?? r;
        used.add(r);
        this.act({ type: 'draft', unitId: u.id, response: r as never, now: T0 });
      }
      this.act({ type: 'continue', now: T0, interfaceLanguage: 'en' });
      if (this.record.phase === 'feedback') this.act({ type: 'continue', now: T0, interfaceLanguage: 'en' });
    }
    if (!stop(this.page)) throw new Error(`no such page in ${this.plan.lessonId}`);
    this.act({ type: 'voice_ready', now: T0 });
    return this;
  }
  /** Drafts for the current page's units, by index; a function gets the unit and may return undefined. */
  draft(answers: (UnitResponse | ((u: PlanUnit) => UnitResponse | undefined) | undefined)[]) {
    this.page.units.forEach((u, n) => {
      const a = answers[n];
      const r = typeof a === 'function' ? a(u) : a;
      if (r !== undefined) this.act({ type: 'draft', unitId: u.id, response: r as never, now: T0 });
    });
    return this;
  }
  rightAll() { return this.draft(this.page.units.map(() => right)); }
  reveal(n: number) {
    for (const { itemKey, keys } of requiredReveals(this.page)) for (const key of keys.slice(0, n)) this.act({ type: 'reveal', itemKey, key, now: T0 });
    return this;
  }
  /** Shows `n` more lines of an exam dialogue (Next line). */
  lines(n: number) {
    for (let i = 0; i < n; i++) {
      const next = nextDialogueLine(this.page, this.record);
      if (!next) break;
      this.act({ type: 'reveal', ...next, now: T0 });
    }
    return this;
  }
  check() { return this.act({ type: 'continue', now: T0, interfaceLanguage: 'en' }); }
  /** Puts a reading skim document away: its question is then answered from memory. */
  skim() {
    const doc = this.page.items.find((it) => it.type === 'reading_document');
    if (doc) this.act({ type: 'reveal', itemKey: `${this.page.pageId}/${doc.itemId}`, key: SKIMMED, now: T0 });
    return this;
  }
}

const type = (t: string) => (p: PlanPage) => p.items.some((it) => it.type === t);
const id = (pageId: string) => (p: PlanPage) => p.pageId === pageId;
const wrongChoice = (u: PlanUnit) => (u.kind === 'choice' ? u.options.find((o) => !u.correct.includes(o.id))?.id : undefined);

/* -------------------------------------------------------------- screens */

interface Screen {
  /** Path under docs/mockups/ without extension. */
  path: string;
  title: string;
  lessonId: string;
  /** Opens the index or the lesson's combined artifact view instead of playing the lesson. */
  route?: 'index' | 'lesson';
  /** The saved attempt to resume; none shows the start page. */
  state?: (a: Attempt) => Attempt;
  /** Browser steps after resuming (results menu, Continue on the last exam page…). */
  after?: (page: Page) => Promise<void>;
  /** The French voice disappears after resuming (the no-voice help page). */
  noVoice?: boolean;
}

const V = 'fr-classroom-objects';
const G = 'fr-verb-avoir-present';
const F = 'fr-ordering-at-a-cafe';
const R = 'fr-reading-a-text-message';
const toResults = async (page: Page) => { await page.getByRole('button', { name: 'Continue' }).click(); await page.locator('.summary-card').waitFor(); };
const lastExam = (a: Attempt) => a.to((p) => p.index === a.plan.pages.length - 1);

const rawJson = async (page: Page) => { await page.getByRole('button', { name: 'Raw JSON' }).click(); await page.getByRole('tree').waitFor(); };

export const SCREENS: Screen[] = [
  // Index and combined artifact view (SPEC section 3)
  { path: '01-lesson-overview/index/lesson-index', title: 'Lesson index', lessonId: V, route: 'index' },
  { path: '02-artifact-view/vocabulary/lesson-detail', title: 'Vocabulary: combined artifact view', lessonId: V, route: 'lesson' },
  { path: '02-artifact-view/grammar/lesson-detail', title: 'Grammar: combined artifact view', lessonId: 'fr-verb-etre-present', route: 'lesson' },
  { path: '02-artifact-view/reading/lesson-detail', title: 'Reading: combined artifact view', lessonId: R, route: 'lesson' },
  { path: '02-artifact-view/raw-json/json-tree', title: 'Raw JSON tree', lessonId: V, route: 'lesson', after: rawJson },
  { path: '02-artifact-view/raw-json/json-tree-expanded', title: 'Raw JSON tree expanded', lessonId: V, route: 'lesson',
    after: async (page) => { await rawJson(page); await page.getByRole('treeitem', { name: /^draft/ }).first().click(); } },

  // Vocabulary (SPEC section 6)
  { path: '03-vocabulary-lesson/01-startpage/lesson-start', title: 'Vocabulary: Lesson start', lessonId: V },
  { path: '03-vocabulary-lesson/02-introduction/introduction', title: 'Vocabulary: Introduction', lessonId: V, state: (a) => a },
  { path: '03-vocabulary-lesson/03-flashcards/front', title: 'Vocabulary: Flashcards', lessonId: V, state: (a) => a.to(type('vocabulary_flashcards')) },
  { path: '03-vocabulary-lesson/03-flashcards/revealed', title: 'Vocabulary: Flashcards turned', lessonId: V, state: (a) => a.to(type('vocabulary_flashcards')).reveal(99) },
  { path: '03-vocabulary-lesson/04-matching/matching', title: 'Vocabulary: Matching', lessonId: V, state: (a) => a.to(type('vocabulary_matching')).draft([right, right]) },
  { path: '03-vocabulary-lesson/05-gender-overview/gender-select', title: 'Vocabulary: Gender', lessonId: V, state: (a) => a.to(type('vocabulary_gender_select')).draft([right, right, right]) },
  { path: '03-vocabulary-lesson/05-gender-overview/reviewed-overview', title: 'Vocabulary: Gender checked', lessonId: V, state: (a) => a.to(type('vocabulary_gender_select')).draft(a.page.units.map((_, n) => (n === 1 ? wrongChoice : right))).check() },
  { path: '03-vocabulary-lesson/06-typed-gaps/answer', title: 'Vocabulary: Typed gap', lessonId: V, state: (a) => a.to(type('vocabulary_typed_gap')).draft(['livr']) },
  { path: '03-vocabulary-lesson/06-typed-gaps/feedback', title: 'Vocabulary: Typed gap checked', lessonId: V, state: (a) => a.to(type('vocabulary_typed_gap')).draft(['cahier']).check() },
  { path: '03-vocabulary-lesson/06-listening/listening-choice', title: 'Vocabulary: Listening choice', lessonId: V, state: (a) => a.to(type('vocabulary_listening_choice')) },
  { path: '03-vocabulary-lesson/06-listening/no-voice-help', title: 'Vocabulary: No French voice', lessonId: V, noVoice: true, state: (a) => a.to(type('vocabulary_listening_choice')) },
  { path: '03-vocabulary-lesson/07-exam/exam-info', title: 'Vocabulary: Exam info', lessonId: V, state: (a) => a.to((p) => p.special === 'examIntro') },
  { path: '03-vocabulary-lesson/07-exam/exam-page', title: 'Vocabulary: Translation exam', lessonId: V, state: (a) => a.to(type('vocabulary_translation_exam')).draft([right, 'stylo']) },
  { path: '03-vocabulary-lesson/07-exam/listening-dictation', title: 'Vocabulary: Listening dictation', lessonId: V, state: (a) => a.to(type('vocabulary_listening_dictation')).draft([right]) },
  { path: '03-vocabulary-lesson/08-results/exam-results', title: 'Vocabulary: Results', lessonId: V, state: (a) => lastExam(a).draft([right, right, 'regle']), after: toResults },
  { path: '03-vocabulary-lesson/08-results/gender-results', title: 'Vocabulary: Gender results', lessonId: V,
    state: (a) => { a.to(type('vocabulary_gender_select')).draft(a.page.units.map((_, n) => (n === 1 ? wrongChoice : right))).check().check(); return lastExam(a).rightAll(); },
    after: async (page) => { await toResults(page); await page.locator('aside.lesson-nav').getByRole('button', { name: /^Gender/ }).click(); } },

  // Grammar (SPEC section 7)
  { path: '04-grammar-lesson/01-startpage/lesson-start', title: 'Grammar: Lesson start', lessonId: G },
  { path: '04-grammar-lesson/02-00-explanation/explanation', title: 'Grammar: Explanation', lessonId: G, state: (a) => a },
  { path: '04-grammar-lesson/02-07-exercise-person-matching/person-matching', title: 'Grammar: Person matching', lessonId: G, state: (a) => a.to(type('grammar_person_matching')).draft([right, right, right]) },
  { path: '04-grammar-lesson/02-01-exercise-pronoun-match/pronoun-match', title: 'Grammar: Pronoun matching', lessonId: G, state: (a) => a.to(type('grammar_pronoun_form_match')).draft([right]) },
  { path: '04-grammar-lesson/02-02-exercise-pronoun-typing/pronoun-typing', title: 'Grammar: Pronoun typing', lessonId: G, state: (a) => a.to(type('grammar_pronoun_form_typing')).draft([right, 'a']).check() },
  { path: '04-grammar-lesson/02-03-exercise-gap-choice/gap-choice', title: 'Grammar: Multiple-choice gap', lessonId: G, state: (a) => a.to(type('grammar_gap_choice')) },
  { path: '04-grammar-lesson/02-04-exercise-gap-typing/gap-typing', title: 'Grammar: Typed gap', lessonId: G, state: (a) => a.to(type('grammar_gap_typing')).draft(['a']) },
  { path: '04-grammar-lesson/02-04-exercise-gap-typing/feedback', title: 'Grammar: Typed gap checked', lessonId: G, state: (a) => a.to(type('grammar_gap_typing')).draft(['est']).check() },
  { path: '04-grammar-lesson/02-05-exercise-word-order/word-order', title: 'Grammar: Word order', lessonId: G, state: (a) => a.to(type('grammar_word_order')).draft([(u) => (u.kind === 'order' ? u.acceptedOrders[0].slice(0, 2) : undefined)]) },
  { path: '04-grammar-lesson/02-06-exercise-error-spotter/error-spotter', title: 'Grammar: Error spotter', lessonId: G, state: (a) => a.to(type('grammar_error_spotter')).draft([(u) => (u.kind === 'spot' ? { tokenId: u.faultyTokenId, text: '' } : undefined)]) },
  { path: '04-grammar-lesson/03-feedback-placeholder/feedback-placeholder', title: 'Grammar: Feedback placeholder', lessonId: G, state: (a) => a.to(type('production_feedback_placeholder')) },
  { path: '04-grammar-lesson/04-exam/exam-info', title: 'Grammar: Exam info', lessonId: G, state: (a) => a.to((p) => p.special === 'examIntro') },
  { path: '04-grammar-lesson/04-exam/mixed-exam', title: 'Grammar: Exam page', lessonId: G, state: (a) => a.to((p) => p.role === 'exam').draft([right, right, 'a']) },
  { path: '04-grammar-lesson/05-results/exam-results', title: 'Grammar: Results', lessonId: G,
    state: (a) => { a.to((p) => p.role === 'exam').draft([right, right, right, right, 'avon', right]).check(); return lastExam(a).draft([right]); }, after: toResults },

  // Functions (SPEC section 8)
  { path: '05-function-lesson/01-startpage/lesson-start', title: 'Functions: Lesson start', lessonId: F },
  { path: '05-function-lesson/02-flashcards/expression-flashcards', title: 'Functions: Expression flashcards', lessonId: F, state: (a) => a.to(id('cards-expressions')).reveal(2) },
  { path: '05-function-lesson/03-dialogue/dialogue', title: 'Functions: Model dialogue', lessonId: F, state: (a) => a.to(type('function_dialogue')).reveal(3) },
  { path: '05-function-lesson/04-matching/expression-matching', title: 'Functions: Expression matching', lessonId: F, state: (a) => a.to(type('function_matching')).draft([right, right]) },
  { path: '05-function-lesson/04-matching/gender', title: 'Functions: Gender', lessonId: F, state: (a) => a.to(type('function_gender_select')).draft([right, right]) },
  { path: '05-function-lesson/05-dialogue-gap-choice/dialogue-gap-choice', title: 'Functions: Dialogue gap', lessonId: F, state: (a) => a.to(type('function_dialogue_gap_choice')) },
  { path: '05-function-lesson/06-word-order/word-order', title: 'Functions: Word order', lessonId: F, state: (a) => a.to(type('function_word_order')).draft([(u) => (u.kind === 'order' ? u.acceptedOrders[0].slice(0, 2) : undefined)]) },
  { path: '05-function-lesson/07-listening-choice/listening-choice', title: 'Functions: Listening choice', lessonId: F, state: (a) => a.to(type('function_listening_choice')) },
  { path: '05-function-lesson/08-exam/translation-exam', title: 'Functions: Translation exam', lessonId: F, state: (a) => a.to(type('function_translation_exam')).draft([right, right]) },
  { path: '05-function-lesson/08-exam/reply-word-order', title: 'Functions: Exam replies', lessonId: F, state: (a) => a.to((p) => p.role === 'exam' && type('function_word_order')(p)).draft([right]) },
  { path: '05-function-lesson/08-exam/dialogue-gap-typing', title: 'Functions: Exam dialogue', lessonId: F, state: (a) => a.to(type('function_dialogue_gap_typing')).lines(5).draft([right, right]) },
  { path: '05-function-lesson/09-results/exam-results', title: 'Functions: Results', lessonId: F, state: (a) => lastExam(a).lines(99).draft([right, right, 'un café']), after: toResults },

  // Reading (SPEC section 9)
  { path: '06-reading-lesson/01-startpage/lesson-start', title: 'Reading: Lesson start', lessonId: R },
  { path: '06-reading-lesson/02-flashcards/flashcards', title: 'Reading: Flashcards', lessonId: R, state: (a) => a.reveal(2) },
  { path: '06-reading-lesson/02-flashcards/matching', title: 'Reading: Matching', lessonId: R, state: (a) => a.to(type('reading_keyword_matching')).draft([right, right]) },
  { path: '06-reading-lesson/03-skim/skim', title: 'Reading: Skim', lessonId: R, state: (a) => a.to(type('reading_skim_choice')) },
  { path: '06-reading-lesson/03-skim/skim-question', title: 'Reading: Skim question', lessonId: R, state: (a) => a.to(type('reading_skim_choice')).skim() },
  { path: '06-reading-lesson/03-skim/skim-feedback', title: 'Reading: Skim checked', lessonId: R, state: (a) => a.to(type('reading_skim_choice')).skim().rightAll().check() },
  { path: '06-reading-lesson/04-detail/detail', title: 'Reading: Detail questions', lessonId: R, state: (a) => a.to((p) => p.role === 'practice' && type('reading_choice')(p)).draft([right, right]) },
  { path: '06-reading-lesson/04-detail/detail-feedback', title: 'Reading: Detail checked', lessonId: R, state: (a) => a.to((p) => p.role === 'practice' && type('reading_choice')(p)).draft([right, wrongChoice, right, right]).check() },
  { path: '06-reading-lesson/05-structure/ordering', title: 'Reading: Ordering', lessonId: R, state: (a) => a.to(type('reading_order')).draft([(u) => (u.kind === 'order' ? u.acceptedOrders[0].slice(0, 2) : undefined)]) },
  { path: '06-reading-lesson/05-structure/ordering-feedback', title: 'Reading: Ordering checked', lessonId: R,
    state: (a) => a.to(type('reading_order')).draft([(u) => (u.kind === 'order' ? [...u.acceptedOrders[0]].reverse() : undefined)]).check() },
  { path: '06-reading-lesson/06-exam/exam-info', title: 'Reading: Exam info', lessonId: R, state: (a) => a.to((p) => p.special === 'examIntro') },
  { path: '06-reading-lesson/06-exam/exam-page', title: 'Reading: Exam page', lessonId: R, state: (a) => a.to((p) => p.role === 'exam').draft([right, right, right]) },
  { path: '06-reading-lesson/07-results/exam-results', title: 'Reading: Results', lessonId: R, state: (a) => lastExam(a).draft([right, right, wrongChoice, right, right]), after: toResults },
];

/** The SPEC block body of a screen (kept by `make mockups-sync`): the PNG inline, linked to the HTML snapshot. */
export function screenBlock(screen: Pick<Screen, 'path' | 'title' | 'lessonId'>): string {
  const p = `mockups/${screen.path}`;
  return `[![${screen.title}](${p}.png)](${p}.html)\n\nRendered by the prototype (lesson \`${screen.lessonId}\`): [HTML snapshot](${p}.html) · [PNG](${p}.png). Refresh with \`make screens\`.\n`;
}

/* ------------------------------------------------------------- capture */

/** A French test voice (headless Chromium has none); `window.__dropVoice()` removes it and tells the app. */
function installVoice() {
  const french = { lang: 'fr-FR', name: 'Test French', voiceURI: 'test-fr', localService: true, default: true };
  const listeners: (() => void)[] = [];
  let hasVoice = true;
  (window as unknown as { __dropVoice: () => void }).__dropVoice = () => { hasVoice = false; listeners.forEach((l) => l()); };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => (hasVoice ? [french] : []), cancel: () => undefined, speak: () => undefined,
    addEventListener: (_: string, l: () => void) => { listeners.push(l); }, removeEventListener: () => undefined,
  } });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: class { text: string; lang = ''; voice: unknown; constructor(text: string) { this.text = text; } } });
}

/** The rendered document without scripts, with form state as attributes and every stylesheet inlined. */
function snapshot({ title, note }: { title: string; note: string }) {
  const css = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\n'); } catch { return ''; } }).join('\n');
  for (const el of document.querySelectorAll('input')) {
    el.setAttribute('value', el.value);
    if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked');
  }
  for (const el of document.querySelectorAll('option')) if (el.selected) el.setAttribute('selected', ''); else el.removeAttribute('selected');
  const doc = document.documentElement.cloneNode(true) as HTMLElement;
  doc.querySelectorAll('script, style, link').forEach((el) => el.remove());
  doc.querySelectorAll('dialog:not([open])').forEach((el) => el.remove());
  const head = doc.querySelector('head')!;
  head.querySelector('title')!.textContent = title;
  head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
  return `<!doctype html>\n<!-- ${note} -->\n${doc.outerHTML}\n`;
}

async function capture(page: Page, screen: Screen, baseUrl: string, revision: string) {
  const { plan, contentHash } = screen.route ? { plan: undefined, contentHash: '' } : lesson(screen.lessonId);
  const record = plan && screen.state?.(new Attempt(plan, contentHash)).record;
  await page.goto(baseUrl);
  await page.evaluate(({ key, value, prefs, prefsKey }) => {
    localStorage.clear();
    localStorage.setItem(prefsKey, prefs);
    if (value) localStorage.setItem(key, value);
  }, { key: SESSION_KEY_PREFIX + screen.lessonId, value: record ? JSON.stringify(record) : '', prefs: JSON.stringify({ motherTongue: 'en', interfaceLanguage: 'en', autoplay: true }), prefsKey: PREFERENCES_KEY });
  await page.goto(baseUrl + (screen.route === 'index' ? '#/' : screen.route === 'lesson' ? `#/lesson/${screen.lessonId}` : `#/lesson/${screen.lessonId}/play`));
  await page.reload();
  if (screen.route === 'index') await page.locator('table tbody tr').first().waitFor({ timeout: 30_000 });
  else if (screen.route === 'lesson') await page.getByRole('button', { name: 'Raw JSON' }).waitFor({ timeout: 30_000 });
  else if (record) await page.getByRole('button', { name: 'Resume lesson' }).click({ timeout: 30_000 });
  else await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 30_000 });
  if (screen.noVoice) await page.evaluate(() => (window as unknown as { __dropVoice: () => void }).__dropVoice());
  await screen.after?.(page);
  await page.waitForTimeout(1500); // animations (matching slide, card flips) settle
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const file = join(SCREENS_DIR, screen.path);
  mkdirSync(dirname(file), { recursive: true });
  await page.screenshot({ path: `${file}.png`, fullPage: true });
  const note = `Rendered screen "${screen.title}" of the prototype (lesson ${screen.lessonId}, revision ${revision}), captured by scripts/screens.ts. Static: no scripts.`;
  writeFileSync(`${file}.html`, await page.evaluate(snapshot, { title: screen.title, note }), 'utf8');
}

async function main() {
  const { values } = parseArgs({ options: { only: { type: 'string' }, port: { type: 'string', default: '5176' } } });
  const screens = SCREENS.filter((s) => !values.only || s.path.startsWith(values.only));
  const port = Number(values.port);
  const revision = await new Promise<string>((done) => {
    const git = spawn('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT });
    let out = '';
    git.stdout.on('data', (d) => (out += d));
    git.on('close', () => done(out.trim() || 'unknown'));
  });
  const server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: ROOT, env: { ...process.env, LP_CONTENT_DIR: 'content' }, stdio: 'ignore', detached: true });
  const baseUrl = `http://127.0.0.1:${port}/`;
  try {
    for (let i = 0; ; i++) {
      try { if ((await fetch(baseUrl)).ok) break; } catch { /* not up yet */ }
      if (i > 120) throw new Error('vite did not start');
      await new Promise((r) => setTimeout(r, 500));
    }
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    try {
      for (const screen of screens) {
        const context = await browser.newContext({ viewport: VIEWPORT, colorScheme: 'dark', locale: 'en-US', reducedMotion: 'reduce' });
        await context.addInitScript(installVoice);
        const page = await context.newPage();
        await page.clock.setFixedTime(T0 + 15_000); // Date stays fixed, timers still run
        await capture(page, screen, baseUrl, revision);
        await context.close();
        console.log(`ok   ${screen.path}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    process.kill(-server.pid!);
  }
}

if (import.meta.main) await main();
