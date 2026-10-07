// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan } from '../../src/domain/session/plan.ts';
import { headerScore, isListeningPage, lessonResults, progress, sessionReducer, startSession, type SessionRecord } from '../../src/domain/session/session.ts';

const fixture = resolve(import.meta.dirname, '../fixtures/content');
const read = (dir: string) => JSON.parse(readFileSync(join(fixture, dir, 'fr-classroom-instructions.json'), 'utf8'));
const plan = buildPlan(lessonOf(fixture, 'fr-classroom-instructions'), read('briefs'), 'en');
const start = () => startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now: 0 });
const apply = (record: SessionRecord, type: 'continue' | 'skip_no_voice' | 'voice_ready', now = 0) => sessionReducer(plan, record, { type, now, interfaceLanguage: 'en' });
const answer = (record: SessionRecord) => {
  let next = record;
  for (const u of plan.pages[next.pageIndex].units) {
    const response = u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] };
    next = sessionReducer(plan, next, { type: 'draft', unitId: u.id, response, now: 0 });
  }
  return next;
};
const advanceTo = (record: SessionRecord, wanted: (record: SessionRecord) => boolean) => {
  let next = record;
  while (!wanted(next)) {
    const page = plan.pages[next.pageIndex];
    if (next.phase === 'answering' && page.role === 'practice') next = answer(next);
    for (const item of page.items) if (item.type === 'vocabulary_flashcards') for (const key of item.targetIds) next = sessionReducer(plan, next, { type: 'reveal', itemKey: `${page.pageId}/${item.itemId}`, key, now: 0 });
    next = apply(next, 'continue');
  }
  return next;
};

it('speaks the written teaching form, including its article, rather than pronunciation notation', () => {
  const choice = plan.pages.find((p) => p.units[0]?.itemType === 'vocabulary_listening_choice')!.units[0];
  const dictation = plan.pages.find((p) => p.units[0]?.itemType === 'vocabulary_listening_dictation')!.units[0];
  expect(choice.speak).toBe(plan.targets.get(choice.kind === 'choice' ? choice.correct[0] : '')?.teachingForm);
  expect(dictation.speak).toBe(dictation.answer);
  expect(choice.speak).not.toContain('/');
});

it('skips unavailable listening pages without points, deadline, progress weight or results rows', () => {
  let record = advanceTo(start(), (r) => isListeningPage(plan.pages[r.pageIndex]));
  const page = plan.pages[record.pageIndex];
  expect(page.role).toBe('practice');
  const before = progress(plan, record);
  record = apply(record, 'skip_no_voice', 100);
  expect(record.skippedNoVoice).toContain(page.pageId);
  expect(record.completed).toContain(page.pageId);
  expect(page.units.every((u) => !record.locked[u.id])).toBe(true);
  expect(progress(plan, record)).toBeGreaterThan(before);
  const practiceUnits = plan.pages.filter((p) => p.role === 'practice' && p.pageId !== page.pageId).flatMap((p) => p.units);
  expect(lessonResults(plan, record).practice.possible).toBe(practiceUnits.length);
  expect(headerScore(plan, record)).toBeGreaterThan(0);
  const resumed = structuredClone(record);
  expect(resumed.skippedNoVoice).toEqual([page.pageId]);
  record = advanceTo(resumed, (r) => plan.pages[r.pageIndex].units[0]?.itemType === 'vocabulary_listening_dictation');
  const exam = plan.pages[record.pageIndex];
  expect(record.exam[exam.pageId]).toBeUndefined();
  expect(apply(record, 'continue', 200)).toBe(record);
  record = apply(record, 'skip_no_voice', 300);
  expect(record.exam[exam.pageId]).toBeUndefined();
  expect(lessonResults(plan, record).exam.possible).toBe(plan.pages.filter((p) => p.role === 'exam' && p.pageId !== exam.pageId).flatMap((p) => p.units).length);
});

it('starts a dictation deadline only when voice is ready and grades a case-only answer at half credit', () => {
  let record = advanceTo(start(), (r) => plan.pages[r.pageIndex].units[0]?.itemType === 'vocabulary_listening_dictation');
  const page = plan.pages[record.pageIndex];
  expect(record.exam[page.pageId]).toBeUndefined();
  record = apply(record, 'voice_ready', 2_000);
  expect(record.exam[page.pageId]).toEqual({ startedAt: 2_000, deadline: 2_000 + page.timeLimitS! * 1_000, timedOut: false });
  const again = apply(record, 'voice_ready', 3_000);
  expect(again).toBe(record);
  const unit = page.units[0];
  if (unit.kind !== 'text') throw new Error('Expected dictation');
  record = sessionReducer(plan, record, { type: 'draft', unitId: unit.id, response: unit.accepted.answers[0].toUpperCase(), now: 3_000 });
  record = apply(record, 'continue', 3_000);
  expect(record.locked[unit.id]).toMatchObject({ outcome: 'orthography_only', points: 0.5 });
});
