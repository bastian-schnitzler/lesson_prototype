// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanContentDir } from '../../scripts/catalog.ts';
import { buildPlan } from '../../src/domain/session/plan.ts';
import { MESSAGES } from '../../src/i18n/messages.ts';
import { LOCALES } from '../../src/schemas/common.ts';
import { OutlineFileSchema } from '../../src/schemas/outline.ts';
import { countWords, documentWords, READING_GENRES, READING_QUESTION_TYPES, READING_STAGES, readingContentSchema, SKIM_FOCUS, STRUCTURE_TASKS } from '../../src/schemas/reading.ts';
import { validateBrief, validateContent, type OutlineContext } from '../../src/validation/artifacts.ts';

/** Reading rules (docs/reading-lessons.md, section 4.3), checked on the authored lessons and on broken copies of them. */
const ROOT = resolve(import.meta.dirname, '../..');
const CONTENT = join(ROOT, 'content');
type Json = any;
const read = (dir: string, id: string): Json => JSON.parse(readFileSync(join(CONTENT, dir, `${id}.json`), 'utf8'));

function ctx(id: string): OutlineContext {
  for (const level of ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']) {
    const outline = OutlineFileSchema.parse(JSON.parse(readFileSync(join(CONTENT, 'outlines', `fr-${level}.json`), 'utf8')));
    const entry = outline.entries.find((e) => e.id === id);
    if (entry) return { entry, lang: outline.lang, level: outline.level };
  }
  throw new Error(`no outline entry ${id}`);
}

/** A shipped lesson as fresh mutable copies. */
const lesson = (id: string) => ({ id, brief: read('briefs', id), content: read('lessons', id) });
type Lesson = ReturnType<typeof lesson>;
const A1 = () => lesson('fr-reading-a-text-message');
const B1 = () => lesson('fr-reading-an-article-on-la-bise');

const briefIssues = (s: Lesson) => validateBrief(s.brief, ctx(s.id)).issues.map((i) => i.message).join('\n');
function contentIssues(s: Lesson) {
  const brief = validateBrief(s.brief, ctx(s.id));
  expect(brief.issues).toEqual([]);
  return validateContent(s.content, { ...ctx(s.id), brief: brief.value! }).issues.map((i) => i.message).join('\n');
}
const step = (c: Json, stage: string) => c.steps.find((s: Json) => s.stage === stage);
const item = (c: Json, itemId: string) => c.steps.flatMap((s: Json) => s.pages.flatMap((p: Json) => p.items)).find((i: Json) => i.itemId === itemId);
const doc = (c: Json, documentId: string) => c.documents.find((d: Json) => d.documentId === documentId);

const READING_IDS = Object.keys(scanContentDir(CONTENT).manifest.artifacts).filter((id) => id.includes('-reading-'));
const AUTHORED = READING_IDS.filter((id) => scanContentDir(CONTENT).manifest.artifacts[id].content);

describe('authored reading lessons', () => {
  it('has sixteen valid lessons, at least two per level, with every structure task', () => {
    const manifest = scanContentDir(CONTENT).manifest;
    expect(AUTHORED).toHaveLength(16);
    for (const id of AUTHORED) expect([id, manifest.artifacts[id].draft?.status, manifest.artifacts[id].content?.status]).toEqual([id, 'valid', 'valid']);
    const levels = AUTHORED.map((id) => ctx(id).level);
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) expect(levels.filter((l) => l === level).length, level).toBeGreaterThanOrEqual(2);
    expect(new Set(AUTHORED.map((id) => read('briefs', id).stages.structure.task))).toEqual(new Set(STRUCTURE_TASKS));
    expect(new Set(AUTHORED.map((id) => read('briefs', id).stages.skim.focus))).toEqual(new Set(SKIM_FOCUS));
  });

  it.each(AUTHORED)('%s: a different exam document of the same genre, every question type used across the lesson', (id) => {
    const content = readingContentSchema('fr').parse(read('lessons', id));
    const [main, exam] = content.documents;
    expect(exam.genre).toBe(main.genre);
    expect(documentWords(exam)).toBeLessThan(documentWords(main));
    const texts = (d: typeof main) => new Set(d.parts.flatMap((p) => p.segments.map((s) => s.text)));
    expect([...texts(exam)].filter((t) => texts(main).has(t) && countWords(t) > 3)).toEqual([]);
    const types = new Set(content.steps.flatMap((s) => s.pages.flatMap((p) => p.items.map((i) => i.type))));
    for (const type of READING_QUESTION_TYPES) expect(types.has(type), `${id} uses ${type}`).toBe(true);
  });
});

describe('reading word count', () => {
  it('counts tokens with a letter or digit', () => {
    expect(countWords('Salut Tom !')).toBe(2);
    expect(countWords('À 15 h – l’heure du café ?')).toBe(6);
    expect(countWords('Entrée + plat + dessert 15 €')).toBe(4);
  });
});

describe('reading brief rules', () => {
  it('accepts the shipped briefs', () => {
    expect(briefIssues(A1())).toBe('');
    expect(briefIssues(B1())).toBe('');
  });
  it('wants 4 to 6 key words', () => {
    const s = A1();
    s.brief.keywords = s.brief.keywords.slice(0, 3);
    expect(briefIssues(s)).toMatch(/>=4/);
  });
  it('wants different matching labels per mother tongue', () => {
    const s = A1();
    s.brief.keywords[1].translations.en[0] = s.brief.keywords[0].translations.en[0];
    expect(briefIssues(s)).toMatch(/duplicate en matching label/);
  });
  it('keeps planned lengths within the level', () => {
    const s = A1();
    s.brief.documents.main.targetWords = 120;
    s.brief.documents.exam.targetWords = 60;
    expect(briefIssues(s)).toMatch(/main document has 120 words; 40–80/);
    expect(briefIssues(s)).toMatch(/exam document has 60 words; 20–40/);
  });
  it('takes the skim time from the level', () => {
    const s = A1();
    s.brief.stages.skim.skimSeconds = 60;
    expect(briefIssues(s)).toMatch(/must be 45 at A1/);
  });
  it('plans exactly five exam questions', () => {
    const s = A1();
    s.brief.exam.pages[0].itemCount = 4;
    expect(briefIssues(s)).toMatch(/exactly 5 questions/);
  });
  it('scores reading 30 / 70', () => {
    const s = A1();
    s.brief.scoring = { practiceWeight: 35, examWeight: 65, orthographyCredit: 0.5 };
    expect(briefIssues(s)).toMatch(/expected 30/);
  });
  it('checks the minutes', () => {
    const s = A1();
    s.brief.estimatedMinutes = 20;
    expect(briefIssues(s)).toMatch(/rounded to minutes \(9\)/);
  });
});

describe('reading content rules', () => {
  it('accepts the shipped lessons', () => {
    expect(contentIssues(A1())).toBe('');
    expect(contentIssues(B1())).toBe('');
  });
  it('keeps both documents in the brief genre', () => {
    const s = A1();
    doc(s.content, 'exam').genre = 'menu';
    expect(contentIssues(s)).toMatch(/exam document must be a text_message/);
  });
  it('keeps documents within the word range', () => {
    const s = A1();
    doc(s.content, 'main').parts[1].segments.splice(0, 3);
    expect(contentIssues(s)).toMatch(/main document has \d+ words; 40–80/);
  });
  it('finds every highlight in its segment and highlights every key word', () => {
    const s = A1();
    doc(s.content, 'main').highlights[0].text = 'dimanche';
    doc(s.content, 'main').highlights.pop();
    expect(contentIssues(s)).toMatch(/"dimanche" is not in segment/);
    expect(contentIssues(s)).toMatch(/keyword apres is never highlighted/);
  });
  it('takes evidence from the document of the stage', () => {
    const s = A1();
    item(s.content, 'q-day').evidenceSegmentIds = ['x-s2'];
    item(s.content, 'x-day').evidenceSegmentIds = ['nowhere'];
    expect(contentIssues(s)).toMatch(/segment x-s2 is not in the main document/);
    expect(contentIssues(s)).toMatch(/segment nowhere is not in the exam document/);
  });
  it('asks for evidence, except for "not stated"', () => {
    const s = B1();
    item(s.content, 'q-men').evidenceSegmentIds = [];
    item(s.content, 'q-belgium').evidenceSegmentIds = ['m-s12'];
    expect(contentIssues(s)).toMatch(/name the segments that prove the answer/);
    expect(contentIssues(s)).toMatch(/a "not stated" answer has no evidence/);
  });
  it('offers "not stated" from B1 only', () => {
    const a1 = A1();
    item(a1.content, 'q-dinner').allowNotStated = true;
    expect(contentIssues(a1)).toMatch(/"not stated" starts at B1, not A1/);
    const b1 = B1();
    item(b1.content, 'q-men').allowNotStated = false;
    expect(contentIssues(b1)).toMatch(/offer "not stated" from B1/);
  });
  it('asks one skim question', () => {
    const s = A1();
    step(s.content, 'skim').pages[0].items.pop();
    expect(contentIssues(s)).toMatch(/one reading_skim_choice/);
  });
  it('follows the brief’s detail questions', () => {
    const s = A1();
    step(s.content, 'detail').pages[0].items.pop();
    expect(contentIssues(s)).toMatch(/expected the brief's questions in order/);
  });
  it('pairs every part once in heading matching', () => {
    const s = B1();
    step(s.content, 'structure').pages[0].items[1].pairs[0].partId = 'm-who';
    expect(contentIssues(s)).toMatch(/pair every part of the main document once/);
  });
  it('hides part headings when they are to be matched', () => {
    const s = B1();
    doc(s.content, 'main').parts[0].heading = 'Un geste qui intrigue';
    expect(contentIssues(s)).toMatch(/shows no part headings/);
  });
  it('hides the document when the parts are put back in order', () => {
    const s = lesson('fr-reading-a-party-invitation');
    expect(contentIssues(s)).toBe('');
    step(s.content, 'structure').pages[0].items.unshift({ type: 'reading_document', itemId: 'doc-structure', documentId: 'main', view: 'open', skimSeconds: null });
    expect(contentIssues(s)).toMatch(/hides the document/);
  });
  it('asks five exam questions as planned', () => {
    const s = A1();
    step(s.content, 'exam').pages[0].items.pop();
    expect(contentIssues(s)).toMatch(/page plan expects 5 questions/);
  });
  it('shows the document first, in the view of its stage', () => {
    const s = A1();
    item(s.content, 'doc-detail').view = 'exam';
    expect(contentIssues(s)).toMatch(/detail stage shows the document in open view/);
  });
});

describe('reading plan', () => {
  const plan = buildPlan(readingContentSchema('fr').parse(read('lessons', 'fr-reading-an-article-on-la-bise')), read('briefs', 'fr-reading-an-article-on-la-bise'), 'de');
  const units = plan.pages.flatMap((p) => p.units);

  it('scores key words, questions and structure; documents and the key word list are presentation', () => {
    expect(plan.pages.map((p) => [p.pageId, p.role, p.units.length])).toEqual([
      ['keywords', 'presentation', 0], ['keyword-matching', 'practice', 6], ['skim', 'practice', 1], ['detail', 'practice', 4],
      ['structure', 'practice', 4], ['exam-1', 'exam', 3], ['exam-2', 'exam', 2],
    ]);
    expect(plan.scoring).toEqual({ practiceWeight: 30, examWeight: 70, orthographyCredit: 0.5 });
    expect(plan.reading?.documents.size).toBe(2);
  });

  it('matches key words with their first meaning in the mother tongue', () => {
    const matching = plan.pages.find((p) => p.pageId === 'keyword-matching')!.units[0];
    if (matching.kind !== 'choice') throw new Error('matching rows are choices');
    expect(matching.options.every((o) => o.lang === 'native')).toBe(true);
    expect(matching.answer).toBe(plan.reading?.keywords.get(matching.correct[0])?.translations.de?.[0]);
  });

  it('keeps true / false / not stated in the learning language and quotes the evidence', () => {
    const statement = units.find((u) => u.itemType === 'reading_true_false')!;
    expect(statement.kind === 'choice' && statement.options.map((o) => o.text)).toEqual(['Vrai', 'Faux', 'Pas dans le texte']);
    const proved = units.find((u) => u.evidence)!;
    expect(proved.evidence!.quotes).toEqual(proved.evidence!.segmentIds.map((id) => plan.reading!.segments.get(id)!.text));
    expect(units.filter((u) => u.itemType === 'reading_skim_choice' || u.itemType === 'reading_keyword_matching').every((u) => !u.evidence)).toBe(true);
  });
});

describe('reading interface texts', () => {
  it.each(LOCALES)('%s names every genre, stage, question type, skim focus and structure task', (locale) => {
    const needed = [
      ...READING_GENRES.map((g) => `genre.${g}`), ...READING_STAGES.map((s) => `stage.${s}`), ...READING_QUESTION_TYPES.map((q) => `exercise.${q}`),
      ...SKIM_FOCUS.map((f) => `skimFocus.${f}`), ...STRUCTURE_TASKS.map((s) => `activity.reading.${s}`),
    ];
    for (const key of needed) expect(MESSAGES[locale], `${locale} ${key}`).toHaveProperty([key]);
  });
});
