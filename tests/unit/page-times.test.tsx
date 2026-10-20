import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PreferencesProvider } from '../../src/app/context.tsx';
import { pageTimeRows, pageTimesExport } from '../../src/domain/session/pageTimes.ts';
import { buildPlan, type PlanUnit } from '../../src/domain/session/plan.ts';
import { SKIMMED } from '../../src/domain/session/readingPlan.ts';
import { lessonResults, progress, requiredReveals, sessionReducer, startSession, type SessionRecord, type UnitResponse } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';
import { isPlayTest, PlayTestTimes } from '../../src/session/views.tsx';

/** P5-05: play-test times per page, recorded by the shared reducer (SPEC section 5). */
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});
const ROOT = resolve(import.meta.dirname, '../..');
const ID = 'fr-reading-a-text-message';
const read = (dir: string) => JSON.parse(readFileSync(join(ROOT, 'content', dir, `${ID}.json`), 'utf8'));
const plan = buildPlan(contentSchema('reading', 'fr').parse(read('lessons')), briefSchema('reading', 'fr').parse(read('briefs')), 'en', { examIntro: true });
const key = (u: PlanUnit): UnitResponse => (u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : '');

/** Plays every page right with a clock that advances 10 s per page; the skim document is put away after 30 s. */
function play(): SessionRecord {
  let now = 1_000_000;
  let r = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now });
  for (let guard = 0; r.status !== 'completed' && guard < 100; guard++) {
    const page = plan.pages[r.pageIndex];
    const skim = page.items.find((it) => it.type === 'reading_document' && it.view === 'skim');
    if (skim && r.phase === 'answering') r = sessionReducer(plan, r, { type: 'reveal', itemKey: `${page.pageId}/${skim.itemId}`, key: SKIMMED, now: now + 30_000 });
    if (r.phase === 'answering') for (const u of page.units) r = sessionReducer(plan, r, { type: 'draft', unitId: u.id, response: key(u), now });
    for (const { itemKey, keys } of requiredReveals(page)) for (const k of keys) r = sessionReducer(plan, r, { type: 'reveal', itemKey, key: k, now });
    now += skim && r.phase === 'answering' ? 45_000 : 10_000;
    r = sessionReducer(plan, r, { type: 'continue', now, interfaceLanguage: 'en' });
  }
  return r;
}

describe('play-test times', () => {
  const record = play();
  const rows = pageTimeRows(plan, record);
  const skimRow = rows.find((r) => r.stepId === 'skim')!;

  it('records the time of every page, and changes neither scores nor progress', () => {
    expect(record.status).toBe('completed');
    expect(rows).toHaveLength(plan.pages.length);
    expect(rows.every((r) => r.actualS !== undefined && r.actualS > 0)).toBe(true);
    expect(lessonResults(plan, record).total).toBe(100);
    expect(progress(plan, { ...record, pageTimes: undefined })).toBe(progress(plan, record));
  });

  it('separates the skim time used from the time to answer from memory', () => {
    expect(skimRow.skimSeconds).toBe(45);
    expect(skimRow.skimUsedS).toBe(30);
    expect(skimRow.answerS).toBe(15);
    expect(rows.find((r) => r.stepId === 'detail')?.skimSeconds).toBeUndefined();
  });

  it('exports the attempt and its rows as JSON', () => {
    const data = pageTimesExport(plan, record);
    expect(data).toMatchObject({ lessonId: ID, level: 'A1', contentHash: 'h', status: 'completed' });
    expect(data.pages.map((p) => p.pageId)).toEqual(plan.pages.map((p) => p.pageId));
  });

  it('shows the table only when the app was opened with ?playtest', () => {
    expect(isPlayTest()).toBe(false);
    window.history.replaceState(null, '', '/?playtest#/lesson/x/play');
    expect(isPlayTest()).toBe(true);
    render(<PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}><PlayTestTimes plan={plan} record={record} /></PreferencesProvider>);
    const table = within(screen.getByRole('table'));
    expect(table.getAllByRole('row')).toHaveLength(plan.pages.length + 1);
    expect(table.getByRole('row', { name: /^\d+\. Skim/ })).toHaveTextContent('45 / 30');
    expect(screen.getByRole('button', { name: 'Download times (JSON)' })).toBeInTheDocument();
  });

  it('keeps working for records saved before P5-05', () => {
    expect(pageTimeRows(plan, { ...record, pageTimes: undefined }).every((r) => r.actualS === undefined)).toBe(true);
  });
});
