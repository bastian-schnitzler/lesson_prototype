import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { scanContentDir } from '../../scripts/catalog.ts';
import { readiness } from '../../src/domain/courses.ts';
import { highlightRanges } from '../../src/domain/readingLesson.ts';
import { buildPlan, type LessonPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { SKIMMED } from '../../src/domain/session/readingPlan.ts';
import { lessonResults, requiredReveals, sessionReducer, startSession, type SessionAction, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { isGeneratedKind } from '../../src/schemas/artifacts.ts';
import { LOCALES, type Locale } from '../../src/schemas/common.ts';
import type { ReadingBrief, ReadingContent, ReadingItem } from '../../src/schemas/reading.ts';
import { rendererRegistry } from '../../src/session/renderers.tsx';
import { SessionView } from '../../src/session/views.tsx';

/**
 * P5-07: course audit of the reading lessons. The prototype's reading scope is the ten hand-written
 * fr/A1 test lessons (SPEC section 9, "Production of reading lessons"); every other reading entry of
 * the outlines has no artifacts and cannot be started. Each lesson is checked for current artifacts and
 * registered renderers, and played through the real session reducer and scorer in every mother tongue.
 */

afterEach(cleanup);
const CONTENT = resolve(import.meta.dirname, '../../content');
const catalog = scanContentDir(CONTENT);
const entries = [...catalog.outlines.values()].flatMap((o) => o.entries.filter((e) => e.kind === 'reading'));
const authored = entries.filter((e) => catalog.manifest.artifacts[e.id]?.draft);
const read = (folder: string, id: string) => JSON.parse(readFileSync(join(CONTENT, folder, `${id}.json`), 'utf8'));
const lessons = authored.map(({ id }) => ({ id, brief: read('briefs', id) as ReadingBrief, content: read('lessons', id) as ReadingContent }));

const right = (u: PlanUnit): UnitResponse | undefined => (u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : undefined);
function wrong(u: PlanUnit): UnitResponse | undefined {
  if (u.kind === 'choice') return u.options.find((o) => !u.correct.includes(o.id))?.id;
  if (u.kind === 'order') {
    const reversed = [...u.acceptedOrders[0]].reverse();
    return u.acceptedOrders.some((o) => o.join() === reversed.join()) ? undefined : reversed;
  }
  return undefined;
}

const planOf = (brief: ReadingBrief, content: ReadingContent, motherTongue: Locale = 'en') => buildPlan(content as never, brief as never, motherTongue, { examIntro: true });

/** Plays a session: the skim document is put away, cards turned, every unit answered, then Continue. */
function play(plan: LessonPlan, answer: (u: PlanUnit) => UnitResponse | undefined, onPage?: (r: SessionRecord) => void) {
  let record = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 7, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  for (let guard = 0; record.status === 'active' && guard < 100; guard++) {
    onPage?.(record);
    const page = plan.pages[record.pageIndex];
    const skim = page.items.find((it) => it.type === 'reading_document' && it.view === 'skim');
    if (skim) act({ type: 'reveal', itemKey: `${page.pageId}/${skim.itemId}`, key: SKIMMED, now: 0 });
    for (const { itemKey, keys } of requiredReveals(page)) for (const key of keys) act({ type: 'reveal', itemKey, key, now: 0 });
    if (record.phase === 'answering') for (const u of page.units) {
      const response = answer(u);
      if (response !== undefined) act({ type: 'draft', unitId: u.id, response, now: 0 });
    }
    act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
  }
  return record;
}

describe('reading course audit (P5-07)', () => {
  it('has content for exactly the ten fr/A1 test lessons; no other reading entry has artifacts', () => {
    expect(entries.length).toBeGreaterThan(800);
    expect(authored.map((e) => e.id).sort()).toEqual(catalog.outlines.get('fr-a1')!.entries.filter((e) => e.kind === 'reading').map((e) => e.id).sort());
    expect(authored).toHaveLength(10);
  });

  it.each(authored.map((e) => e.id))('%s: brief and content are valid with current input hashes', (id) => {
    expect(catalog.manifest.artifacts[id]?.draft?.status).toBe('valid');
    expect(catalog.manifest.artifacts[id]?.content?.status).toBe('valid');
    expect(readiness('reading', catalog.manifest.artifacts[id])).toEqual([]);
  });

  it('cannot start an entry without artifacts and names the reasons; the generator does not produce reading', () => {
    const missing = entries.find((e) => !catalog.manifest.artifacts[e.id]?.draft)!;
    expect(readiness('reading', catalog.manifest.artifacts[missing.id])).toEqual(['missingDraft', 'missingContent']);
    expect(isGeneratedKind('reading')).toBe(false);
  });
});

describe.each(lessons)('$id', ({ brief, content }) => {
  const plan = planOf(brief, content);
  const items = content.steps.flatMap((s) => s.pages.flatMap((p) => p.items)) as ReadingItem[];

  it('uses only item types with a registered renderer', () => {
    for (const it of items) expect(rendererRegistry[it.type], it.type).toBeDefined();
  });

  it('highlights every key word as a whole word of the main document, nothing in the exam document', () => {
    const [main, exam] = ['main', 'exam'].map((id) => content.documents.find((d) => d.documentId === id)!);
    for (const h of main.highlights) expect(main.paragraphs.some((p) => highlightRanges(p, [h.text]).length > 0), h.text).toBe(true);
    expect(exam.highlights).toEqual([]);
  });

  it('plays with every answer right: 100 points, every unit fully correct', () => {
    const record = play(plan, right);
    expect(record.status).toBe('completed');
    for (const u of plan.pages.flatMap((p) => p.units)) expect(record.locked[u.id]?.outcome, u.id).toBe('fully_correct');
    expect(lessonResults(plan, record).total).toBe(100);
  });

  it('plays with every answer wrong: 0 points', () => {
    const record = play(plan, wrong);
    expect(record.status).toBe('completed');
    expect(lessonResults(plan, record).total).toBe(0);
  });

  it.each(LOCALES)('has instructions, answers and explanations for mother tongue %s', (locale) => {
    const localized = planOf(brief, content, locale);
    for (const page of localized.pages) {
      expect(page.instructions[locale], page.pageId).toBeTruthy();
      for (const u of page.units) {
        expect(u.answer, u.id).toBeTruthy();
        expect(u.explanation[locale], u.id).toBeTruthy();
      }
    }
  });

  it('renders every page of a session without errors', () => {
    const seen = new Set<number>();
    play(plan, right, (record) => {
      if (seen.has(record.pageIndex)) return;
      seen.add(record.pageIndex);
      render(
        <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>
          <SessionView plan={plan} record={record} dispatch={() => undefined} />
        </PreferencesProvider>,
      );
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1);
      cleanup();
    });
    expect(seen.size).toBe(plan.pages.length);
  });
});
