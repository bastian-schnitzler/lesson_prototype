import { useCallback, useEffect, useRef, useState } from 'react';

import type { Locale } from '../schemas/common.ts';
import type { LessonPlan } from '../domain/session/plan.ts';
import { isListeningPage, sessionReducer, type SessionAction, type SessionRecord, type UnitResponse } from '../domain/session/session.ts';
import type { VoiceStatus } from './speech.ts';
import { saveSession } from '../domain/session/storage.ts';

/** Reducer actions without the time and interface language, which the hook adds. */
export type SessionInput = { type: 'draft'; unitId: string; response: UnitResponse } | { type: 'continue' } | { type: 'expire' } | { type: 'voice_ready' } | { type: 'skip_no_voice' } | { type: 'reveal'; itemKey: string; key: string } | { type: 'select'; selection: string };

/** Injectable clock, so tests can drive countdowns. */
export const clock = { now: () => Date.now() };

/**
 * Runs one attempt: applies reducer actions, saves after every transition and finalizes an
 * exam page whose absolute deadline passed, also right after a resume.
 */
export function useSession(plan: LessonPlan, initial: SessionRecord, interfaceLanguage: Locale, voiceStatus: VoiceStatus = 'available') {
  const [record, setRecord] = useState(initial);
  const [saveFailed, setSaveFailed] = useState(false);
  const [now, setNow] = useState(() => clock.now());
  const latest = useRef(record);
  latest.current = record;

  const dispatch = useCallback(
    (action: SessionInput) => {
      const full = { ...action, now: clock.now(), interfaceLanguage } as SessionAction;
      const next = sessionReducer(plan, latest.current, full);
      if (next === latest.current) return;
      latest.current = next;
      setRecord(next);
      setSaveFailed(!saveSession(next));
    },
    [plan, interfaceLanguage],
  );

  const page = plan.pages[record.pageIndex];
  const deadline = record.phase === 'answering' && page?.role === 'exam' && (!isListeningPage(page) || voiceStatus === 'available') ? record.exam[page.pageId]?.deadline : undefined;
  useEffect(() => {
    if (deadline === undefined) return;
    const tick = () => {
      const t = clock.now();
      setNow(t);
      if (t >= deadline) dispatch({ type: 'expire' });
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [deadline, dispatch]);

  // Persist the initial record too (a new attempt, or the exam page activated on resume).
  useEffect(() => {
    setSaveFailed(!saveSession(latest.current));
  }, []);

  return { record, dispatch, saveFailed, remainingMs: deadline === undefined ? undefined : Math.max(0, deadline - now) };
}
