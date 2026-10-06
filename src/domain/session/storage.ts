import type { SessionRecord } from './session.ts';

/**
 * One saved attempt per lesson in browser storage. Storage can be unavailable or full;
 * callers keep the in-memory session and show a notice when saving fails. The index
 * last-try scores are never stored here (D11).
 */
export const SESSION_KEY_PREFIX = 'lesson-prototype:session:';

export function loadSession(lessonId: string): SessionRecord | undefined {
  try {
    const raw = localStorage.getItem(SESSION_KEY_PREFIX + lessonId);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as SessionRecord;
    return value?.version === 1 && value.lessonId === lessonId && typeof value.contentHash === 'string' ? { ...value, skippedNoVoice: value.skippedNoVoice ?? [], revealed: value.revealed ?? {} } : undefined;
  } catch {
    return undefined;
  }
}

/** Returns false when the browser refused to store the session. */
export function saveSession(record: SessionRecord): boolean {
  try {
    localStorage.setItem(SESSION_KEY_PREFIX + record.lessonId, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(lessonId: string) {
  try {
    localStorage.removeItem(SESSION_KEY_PREFIX + lessonId);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
