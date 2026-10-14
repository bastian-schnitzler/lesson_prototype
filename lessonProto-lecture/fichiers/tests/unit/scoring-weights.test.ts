// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan, type LessonPlan } from '../../src/domain/session/plan.ts';
import { headerScore, lessonResults, POLICY, startSession, type SessionRecord } from '../../src/domain/session/session.ts';
import { briefSchema, contentSchema } from '../../src/schemas/artifacts.ts';

/**
 * Lesson totals take their weights from the brief: vocabulary and grammar keep practice 35 / exam 65
 * exactly as before reading was added; reading uses practice 30 / exam 70 (docs/reading-lessons.md).
 */
const CONTENT = join(resolve(import.meta.dirname, '../..'), 'content');
const IDS = readdirSync(join(CONTENT, 'briefs')).map((f) => f.replace(/\.json$/, '')).sort();
const read = (id: string) => JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8'));
const planOf = (id: string): LessonPlan => {
  const brief = read(id);
  const content = lessonOf(CONTENT, id);
  return buildPlan(brief.kind === 'vocabulary' ? content : contentSchema(brief.kind, 'fr').parse(content), briefSchema(brief.kind, 'fr').parse(brief), 'en');
};

/** Every practice unit right, every exam unit wrong (or the reverse). */
function record(plan: LessonPlan, practiceRight: boolean): SessionRecord {
  const r = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 1, now: 0 });
  const locked: SessionRecord['locked'] = {};
  for (const page of plan.pages) for (const unit of page.units) {
    const right = (page.role === 'exam') !== practiceRight;
    locked[unit.id] = { response: null, outcome: right ? 'fully_correct' : 'incorrect', points: right ? 1 : 0, timedOut: false, interfaceLanguage: 'en' };
  }
  return { ...r, locked };
}

describe('lesson weights', () => {
  const byKind = (kind: string) => IDS.filter((id) => read(id).kind === kind);

  it('finds lessons of every playable kind', () => {
    expect(byKind('vocabulary').length).toBeGreaterThan(0);
    expect(byKind('grammar').length).toBeGreaterThan(0);
    expect(byKind('reading')).toHaveLength(16);
  });

  it.each([...byKind('vocabulary'), ...byKind('grammar')])('%s keeps practice 35 / exam 65', (id) => {
    const plan = planOf(id);
    expect(plan.scoring).toEqual(POLICY);
    expect(lessonResults(plan, record(plan, true)).total).toBeCloseTo(35);
    expect(lessonResults(plan, record(plan, false)).total).toBeCloseTo(65);
    expect(headerScore(plan, record(plan, true))).toBeCloseTo(35);
  });

  it.each(byKind('reading'))('%s uses practice 30 / exam 70', (id) => {
    const plan = planOf(id);
    expect(plan.scoring).toEqual({ practiceWeight: 30, examWeight: 70, orthographyCredit: 0.5 });
    expect(lessonResults(plan, record(plan, true)).total).toBeCloseTo(30);
    expect(lessonResults(plan, record(plan, false)).total).toBeCloseTo(70);
  });
});
