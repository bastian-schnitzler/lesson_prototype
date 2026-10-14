import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../../src/app/context.tsx';
import { lessonOf } from './lessonFixture.ts';
import { buildPlan } from '../../src/domain/session/plan.ts';
import { lessonOutline, numberedPoints } from '../../src/domain/session/outline.ts';
import { sessionReducer, startSession, type SessionAction, type SessionRecord } from '../../src/domain/session/session.ts';
import { NavLayout, PointStrip } from '../../src/session/LessonNav.tsx';

/** P6-01: lesson navigation (sidebar, phone strip); it shows the way and never goes back. */

afterEach(cleanup);
const CONTENT = resolve(import.meta.dirname, '../../content');
const planOf = (id: string) => buildPlan(lessonOf(CONTENT, id), JSON.parse(readFileSync(join(CONTENT, 'briefs', `${id}.json`), 'utf8')), 'en', { interleaveGroups: true, examIntro: true });
const GRAM = planOf('fr-indefinite-articles-and-noun-gender');

function session(plan = GRAM) {
  let record: SessionRecord = startSession(plan, { sessionId: 's', contentHash: 'h', level: 'A1', motherTongue: 'en', seed: 2, now: 0 });
  const act = (action: SessionAction) => (record = sessionReducer(plan, record, action));
  /** Answers the current page correctly and continues until `pageIndex` is reached. */
  const to = (pageIndex: number) => {
    for (let guard = 0; record.pageIndex < pageIndex && guard < 300; guard++) {
      const page = plan.pages[record.pageIndex];
      if (record.phase === 'answering') for (const u of page.units) act({ type: 'draft', unitId: u.id, response: (u.kind === 'text' ? u.accepted.answers[0] : u.kind === 'choice' ? u.correct[0] : u.kind === 'order' ? u.acceptedOrders[0] : { tokenId: u.faultyTokenId, text: u.correction.accepted.answers[0] }) as never, now: 0 });
      act({ type: 'continue', now: 0, interfaceLanguage: 'en' });
    }
  };
  return { act, to, get record() { return record; } };
}
const wrap = (node: React.ReactNode) => <PreferencesProvider initial={{ interfaceLanguage: 'en', motherTongue: 'en' }}>{node}</PreferencesProvider>;

describe('lesson outline (P6-01)', () => {
  it('follows the start page: one section per grammar block with its explanation and exercises, then the exam', () => {
    const sections = lessonOutline(GRAM);
    const blocks = [...new Set(GRAM.pages.filter((p) => p.role !== 'exam' && p.blockId).map((p) => p.blockId))];
    expect(sections.map((s) => s.key)).toEqual([...blocks, 'exam']);
    expect(sections.at(-1)!.kind).toBe('exam');
    expect(sections.at(-1)!.points).toEqual([]);
    const first = sections[0].points;
    expect(first[0].kind).toBe('theory');
    expect(first.slice(1).map((p) => p.title.en)).toEqual(['Multiple-choice gaps 1', 'Typed gaps 1', 'Error spotting 1']);
    // Every page belongs to exactly one section, in lesson order.
    expect(sections.flatMap((s) => s.pages)).toEqual(GRAM.pages.map((_, i) => i));
  });

  it('groups a vocabulary lesson by word group, then the exercises and the exam', () => {
    const plan = planOf('fr-classroom-objects');
    const sections = lessonOutline(plan);
    expect(sections.slice(0, plan.groups.length).map((s) => s.title?.en)).toEqual(plan.groups.map((g) => g.label.en));
    expect(sections[0].points.map((p) => p.kind)).toEqual(['theory', 'theory']);
    expect(sections[plan.groups.length].titleKey).toBe('nav.exercises');
    expect(sections.at(-1)!.kind).toBe('exam');
  });
});

describe('navigation views (P6-01)', () => {
  it('shows the timeline with done, current and upcoming points, without links back', () => {
    const s = session();
    s.to(GRAM.pages.findIndex((p) => p.role === 'practice'));
    const dispatch = vi.fn();
    render(wrap(<NavLayout plan={GRAM} record={s.record} dispatch={dispatch}><p>content</p></NavLayout>));
    const nav = screen.getByRole('complementary');
    expect(within(nav).getByText(/1 of \d+ points done/)).toBeInTheDocument();
    const here = nav.querySelector('[aria-current]')!;
    expect(here).toHaveTextContent('Multiple-choice gaps 1');
    expect(here).toHaveTextContent('You are here');
    // Numbers stay on done points (P6-01 review).
    expect([...nav.querySelectorAll('.timeline-marker')].slice(0, 2).map((m) => m.textContent)).toEqual(['1', '2']);
    expect(within(nav).queryAllByRole('button')).toHaveLength(0);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('lists the exam pages with tasks and time limits during the exam, without links', () => {
    const s = session();
    const exam = GRAM.pages.findIndex((p) => p.role === 'exam');
    s.to(exam);
    render(wrap(<NavLayout plan={GRAM} record={s.record} dispatch={vi.fn()}><p>content</p></NavLayout>));
    const nav = screen.getByRole('complementary');
    const pages = GRAM.pages.filter((p) => p.role === 'exam');
    expect(nav.querySelectorAll('.exam-page')).toHaveLength(pages.length);
    expect(nav.querySelector('.exam-page.is-current')).toHaveTextContent(`${pages[0].units.length} tasks`);
    expect(nav.querySelector('.exam-page.is-current')).toHaveTextContent('in progress');
    expect(within(nav).queryAllByRole('button')).toHaveLength(0);
  });

  it('phone strip: one numbered marker per point; a press shows the title, Esc closes it', () => {
    const s = session();
    s.to(GRAM.pages.findIndex((p) => p.role === 'practice'));
    const { container } = render(wrap(<PointStrip plan={GRAM} record={s.record} />));
    const markers = [...container.querySelectorAll('.strip-marker')];
    const points = numberedPoints(lessonOutline(GRAM));
    expect(markers).toHaveLength(points.length);
    // Done points keep their number (P6-01 review); the exam has a flag.
    expect(markers.slice(0, 3).map((m) => m.textContent)).toEqual(['1', '2', '3']);
    expect(markers[1]).toHaveAttribute('aria-current', 'step');
    fireEvent.click(markers[0]);
    const tip = container.querySelector('.strip-tip')!;
    expect(tip).toHaveTextContent(`1. ${points[0].title.en}`);
    expect(within(tip as HTMLElement).queryAllByRole('button')).toHaveLength(0); // no way back
    fireEvent.click(markers[2]);
    expect(container.querySelector('.strip-tip')).toHaveTextContent('Not yet open');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('.strip-tip')).toBeNull();
  });
});
