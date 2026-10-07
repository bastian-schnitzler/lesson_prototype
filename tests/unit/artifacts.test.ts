import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { briefSchema, contentSchema, type Brief } from '../../src/schemas/artifacts.ts';
import { OutlineFileSchema } from '../../src/schemas/outline.ts';
import { validateBrief, validateContent, type OutlineContext } from '../../src/validation/artifacts.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures', 'content');
const outline = OutlineFileSchema.parse(JSON.parse(readFileSync(join(ROOT, 'content', 'outlines', 'fr-a1.json'), 'utf8')));

const FIXTURE_IDS = ['fr-classroom-objects', 'fr-classroom-instructions', 'fr-verb-etre-present', 'fr-negation-ne-pas'] as const;
type FixtureId = (typeof FIXTURE_IDS)[number];

type Json = any;
const load = (id: FixtureId, file: 'brief' | 'content'): Json =>
  JSON.parse(readFileSync(join(FIXTURES, file === 'brief' ? 'briefs' : 'lessons', `${id}.json`), 'utf8'));

function ctx(id: string): OutlineContext {
  const entry = outline.entries.find((e) => e.id === id);
  if (!entry) throw new Error(`no outline entry ${id}`);
  return { entry, lang: outline.lang, level: outline.level };
}

function checkBrief(id: FixtureId, mutate?: (b: Json) => void) {
  const brief = load(id, 'brief');
  mutate?.(brief);
  return validateBrief(brief, ctx(id));
}

function checkContent(id: FixtureId, mutate?: (c: Json) => void, mutateBrief?: (b: Json) => void) {
  const brief = load(id, 'brief');
  mutateBrief?.(brief);
  const content = load(id, 'content');
  mutate?.(content);
  return validateContent(content, { ...ctx(id), brief: brief as Brief });
}

const messages = (r: { issues: { path: string; message: string }[] }) => r.issues.map((i) => `${i.path}: ${i.message}`).join('\n');

describe('fixture artifacts', () => {
  it.each(FIXTURE_IDS)('%s brief and content are valid', (id) => {
    const brief = checkBrief(id);
    expect(messages(brief)).toBe('');
    expect(brief.status).toBe('valid');
    const content = checkContent(id);
    expect(messages(content)).toBe('');
    expect(content.status).toBe('valid');
  });

  it('covers nouns, non-nouns, conjugation and non-conjugation grammar', () => {
    expect(load('fr-classroom-objects', 'brief').targets.every((t: Json) => t.wordClass === 'noun')).toBe(true);
    expect(load('fr-classroom-instructions', 'brief').targets.every((t: Json) => t.wordClass !== 'noun')).toBe(true);
    expect(load('fr-verb-etre-present', 'brief').topic).toBe('verbs_morphology');
    expect(load('fr-negation-ne-pas', 'brief').topic).toBe('negation');
  });

  it.each(FIXTURE_IDS)('%s schemas convert to JSON Schema for structured output', (id) => {
    const kind = load(id, 'brief').kind;
    expect(() => z.toJSONSchema(briefSchema(kind, 'fr'))).not.toThrow();
    expect(() => z.toJSONSchema(contentSchema(kind, 'fr'))).not.toThrow();
  });
});

describe('multilingual contract', () => {
  it('rejects partial locale maps', () => {
    expect(checkBrief('fr-classroom-objects', (b) => delete b.objective.de).status).toBe('invalid');
    expect(checkContent('fr-verb-etre-present', (c) => delete c.steps[1].pages[0].items[0].rows[0].answerExplanation.fr).status).toBe('invalid');
  });

  it('requires native translations for every mother tongue except the learning language', () => {
    expect(checkBrief('fr-classroom-objects', (b) => delete b.targets[0].translations.de).status).toBe('invalid');
    expect(checkBrief('fr-classroom-objects', (b) => (b.targets[0].translations.fr = ['livre'])).status).toBe('invalid');
  });

  it('rejects a single nativeLanguage field and older schema versions', () => {
    expect(checkBrief('fr-classroom-objects', (b) => (b.nativeLanguage = 'en')).status).toBe('invalid');
    expect(checkBrief('fr-classroom-objects', (b) => (b.schemaVersion = 1)).status).toBe('invalid');
  });
});

describe('brief validation', () => {
  it('checks outline metadata', () => {
    expect(messages(checkBrief('fr-classroom-objects', (b) => (b.theme = 'travel')))).toMatch(/theme: must equal the outline theme education/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (b.id = 'fr-family-members')))).toMatch(/id: must equal/);
  });

  it('checks target counts, groups and noun article rules', () => {
    expect(messages(checkBrief('fr-classroom-objects', (b) => (b.targetCount = 5)))).toMatch(/targetCount/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => b.groups[0].targetIds.pop()))).toMatch(/exactly one group/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (b.targets[0].examForms = ['le livre'])))).toMatch(/indefinite article/);
    expect(messages(checkBrief('fr-classroom-instructions', (b) => (b.targets[0].genders = ['masculine'])))).toMatch(/only nouns have a gender/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (b.plan.genderOverview.scored = false)))).toMatch(/must be true when the lesson has nouns/);
  });

  it('keeps listening-choice items on pages of their own, so the no-voice help can replace the page', () => {
    const practice = (c: Json) => c.steps.find((st: Json) => st.stage === 'practice').pages;
    expect(messages(checkContent('fr-classroom-instructions', (c) => practice(c)[2].items.push(practice(c)[0].items[0])))).toMatch(/listening-choice pages contain only listening-choice items/);
  });

  it('enforces the French noun article policy in exam forms, teaching forms and exceptions (D39)', () => {
    const noun = (b: Json) => b.targets[0]; // un livre, masculine singular
    expect(messages(checkBrief('fr-classroom-objects', (b) => (noun(b).examForms = ['un livre', 'des livres'])))).toMatch(/"des livres" uses "des" but a singular masculine noun takes un/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (noun(b).examForms = ['une livre'])))).toMatch(/"une livre" uses "une"/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (noun(b).teachingForm = 'le livre')))).toMatch(/"le livre" must be one of the exam forms/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (noun(b).term = 'le livre')))).toMatch(/"le livre" must be the base term without article/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (noun(b).articleException = { en: 'x', fr: 'x', de: 'x' })))).toMatch(/remove the articleException/);
  });

  it('derives exam answers only from exam forms; extra accepted answers are rejected', () => {
    const exam = (c: Json) => c.steps.find((st: Json) => st.stage === 'exam').pages[0].items[0];
    expect(messages(checkContent('fr-classroom-objects', (c) => exam(c).accepted.answers.push('livre')))).toMatch(/accepted\.answers: must be exactly "un livre"/);
    expect(messages(checkContent('fr-classroom-objects'))).toBe('');
  });

  it('validates formatted introductions and explanations: syntax and locale parity (D46)', () => {
    const intro = (c: Json) => c.steps[0].pages[0].items[0];
    expect(messages(checkContent('fr-classroom-objects', (c) => (intro(c).text.de = '# Titel\n\n' + intro(c).text.de)))).toMatch(/text\.de: block 1: headings are not allowed/);
    expect(messages(checkContent('fr-classroom-objects', (c) => (intro(c).text.fr = 'Un paragraphe.\n\n- liste')))).toMatch(/text\.fr: block structure p\|ul:1 differs from en/);
    expect(messages(checkContent('fr-classroom-objects', (c) => (intro(c).text.en = intro(c).text.en + ' Also `une table`.')))).toMatch(/learning-language forms differ/);
    const explanation = (c: Json) => c.steps[0].pages[0].items[0];
    expect(messages(checkContent('fr-verb-etre-present', (c) => (explanation(c).text.en = '<b>HTML</b>')))).toMatch(/HTML not allowed/);
  });

  it('requires listening when the intent asks for oral recognition', () => {
    expect(messages(checkBrief('fr-classroom-instructions', (b) => (b.plan.listening.required = false)))).toMatch(/oral recognition/);
  });

  it('requires every target in exactly one translation exam item and matching minutes', () => {
    expect(messages(checkBrief('fr-classroom-objects', (b) => b.plan.exam.pages[1].targetIds.pop()))).toMatch(/exactly one translation exam item/);
    expect(messages(checkBrief('fr-classroom-objects', (b) => (b.estimatedMinutes += 3)))).toMatch(/estimatedMinutes/);
  });

  it('checks grammar rule coverage', () => {
    expect(messages(checkBrief('fr-verb-etre-present', (b) => (b.blocks[0].ruleIds = ['r-unknown'])))).toMatch(/unknown rule r-unknown/);
    expect(messages(checkBrief('fr-verb-etre-present', (b) => (b.exam.pages = [b.exam.pages[1]])))).toMatch(/does not cover rule r-singular/);
    expect(checkBrief('fr-verb-etre-present', (b) => (b.blocks = [b.blocks[0]])).status).toBe('invalid');
  });

  it('marks valid briefs from older outline entries as stale', () => {
    const r = validateBrief(load('fr-classroom-objects', 'brief'), { ...ctx('fr-classroom-objects'), outlineHash: 'another-outline-hash-0000' });
    expect(r.status).toBe('stale');
    expect(r.staleReasons).toHaveLength(1);
  });
});

describe('vocabulary content validation', () => {
  it('enforces the six-stage order and allowed item types', () => {
    expect(messages(checkContent('fr-classroom-objects', (c) => c.steps.reverse()))).toMatch(/expected stage introduction/);
    expect(messages(checkContent('fr-classroom-instructions', (c) => (c.steps[3].pages[0].items[0].type = 'vocabulary_gender_select')))).not.toBe('');
  });

  it('copies exam limits from the brief and keeps practice untimed', () => {
    expect(messages(checkContent('fr-classroom-objects', (c) => (c.steps[5].pages[0].timeLimitS = 30)))).toMatch(/brief's limit 60s/);
    expect(messages(checkContent('fr-classroom-objects', (c) => (c.steps[4].pages[0].timeLimitS = 30)))).toMatch(/no countdown/);
  });

  it('checks typed gaps, matching labels and gender rows', () => {
    expect(messages(checkContent('fr-classroom-objects', (c) => (c.steps[4].pages[0].items[0].accepted.answers = ['un livre'])))).toMatch(/article-free/);
    expect(messages(checkContent('fr-classroom-objects', (c) => (c.steps[2].pages[0].items[0].pairs[1].nativeLabel = { en: 'book', de: 'Stuhl' })))).toMatch(/duplicate en label book/);
    expect(messages(checkContent('fr-classroom-objects', (c) => c.steps[3].pages[0].items[0].rows.pop()))).toMatch(/exactly the nouns/);
  });

  it('requires disambiguated prompts or all gender variants in translation exams', () => {
    const r = checkContent('fr-classroom-objects', (c) => (c.steps[5].pages[0].items[0].prompt = { en: 'book', de: 'Buch' }), (b) => (b.targets[0].genderVariants = ['une livre']));
    expect(messages(r)).toMatch(/disambiguate gender/);
  });

  it('requires corrections to name the accent mark', () => {
    const r = checkContent('fr-classroom-instructions', (c) => (c.steps[5].pages[0].items[0].answerExplanation.en = 'Écoutez is written with é.'));
    expect(messages(r)).toMatch(/must name the mark/);
  });

  it('checks the summed page estimates', () => {
    expect(messages(checkContent('fr-classroom-objects', (c) => (c.steps[0].pages[0].estimatedDurationS = 600)))).toMatch(/estimatedMinutes/);
  });

  it('marks content stale when its brief changed', () => {
    const r = validateContent(load('fr-classroom-objects', 'content'), {
      ...ctx('fr-classroom-objects'),
      brief: load('fr-classroom-objects', 'brief'),
      briefHash: 'some-other-brief-hash-00',
    });
    expect(r.status).toBe('stale');
  });
});

describe('grammar content validation', () => {
  it('follows the brief block, exercise, feedback and exam sequence', () => {
    expect(messages(checkContent('fr-verb-etre-present', (c) => c.steps.splice(7, 1)))).toMatch(/expected \d+ steps/);
    expect(messages(checkContent('fr-verb-etre-present', (c) => ([c.steps[1], c.steps[2]] = [c.steps[2], c.steps[1]])))).toMatch(/planned exercise/);
  });

  it('validates answer keys of every interaction', () => {
    expect(messages(checkContent('fr-verb-etre-present', (c) => (c.steps[2].pages[0].items[0].answerChoiceId = 'c-x')))).toMatch(/answerChoiceId/);
    expect(messages(checkContent('fr-verb-etre-present', (c) => (c.steps[2].pages[0].items[0].choices[1].text = 'suis')))).toMatch(/duplicate choice text/);
    expect(messages(checkContent('fr-verb-etre-present', (c) => (c.steps[1].pages[0].items[0].rows[0].validForms = ['sommes'])))).toMatch(/no token with a valid form/);
    expect(messages(checkContent('fr-negation-ne-pas', (c) => c.steps[1].pages[0].items[0].acceptedOrders[0].pop()))).toMatch(/every token exactly once/);
    expect(messages(checkContent('fr-negation-ne-pas', (c) => (c.steps[4].pages[0].items[0].faultyTokenId = 'w9')))).toMatch(/faultyTokenId/);
    expect(messages(checkContent('fr-negation-ne-pas', (c) => (c.steps[4].pages[0].items[0].correction.choices = ['pas', 'non'])))).toMatch(/select mode/);
    expect(messages(checkContent('fr-verb-etre-present', (c) => (c.steps[8].pages[0].items[0].hint = { en: 'h', fr: 'h', de: 'h' })))).toMatch(/no hint/);
    expect(messages(checkContent('fr-verb-etre-present', (c) => (c.steps[6].pages[0].items[0].ruleIds = ['r-x'])))).toMatch(/unknown rule r-x/);
  });

  it('keeps the production feedback step a fixed placeholder', () => {
    const r = checkContent('fr-negation-ne-pas', (c) => c.steps[5].pages[0].items.push({ type: 'production_feedback_placeholder', itemId: 'feedback-2' }));
    expect(messages(r)).toMatch(/fixed production placeholder/);
  });
});

describe('legacy drafts', () => {
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });

  it('are not imported by the app, scripts or tests', () => {
    const offenders = ['src', 'scripts', 'tests'].flatMap((d) => sources(join(ROOT, d))).filter((f) => /from ['"][^'"]*old_prompt/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
