import { useCallback, useEffect, useState } from 'react';

import { ManifestSchema, type Course, type Manifest } from '../schemas/manifest.ts';
import { OutlineFileSchema, type OutlineFile } from '../schemas/outline.ts';

/** All URLs are relative to index.html, so they work under any Pages base path. */
export const MANIFEST_URL = 'content/manifest.json';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T };

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function fetchManifest(signal?: AbortSignal): Promise<Manifest> {
  const data: unknown = JSON.parse(await fetchText(MANIFEST_URL, signal));
  const parsed = ManifestSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'invalid manifest');
  return parsed.data;
}

export async function fetchOutline(course: Course, signal?: AbortSignal): Promise<OutlineFile> {
  const parsed = OutlineFileSchema.safeParse(JSON.parse(await fetchText(course.outlineUrl, signal)));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'invalid outline');
  return parsed.data;
}

export type ArtifactText = { status: 'ok'; text: string } | { status: 'error'; error: string };

export async function fetchArtifactText(url: string, signal?: AbortSignal): Promise<ArtifactText> {
  try {
    return { status: 'ok', text: await fetchText(url, signal) };
  } catch (e) {
    if (signal?.aborted) throw e;
    return { status: 'error', error: describe(e) };
  }
}

export function useManifest(): Loadable<Manifest> & { retry: () => void } {
  const [state, setState] = useState<Loadable<Manifest>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetchManifest(ctrl.signal).then(
      (data) => setState({ status: 'ready', data }),
      (e) => !ctrl.signal.aborted && setState({ status: 'error', error: describe(e) }),
    );
    return () => ctrl.abort();
  }, [attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}

const outlineCache = new Map<string, Promise<OutlineFile>>();

/** Clears cached outlines (tests). */
export function clearOutlineCache() {
  outlineCache.clear();
}

/**
 * Loads the selected course's outline. A response for a course that is no
 * longer selected is ignored, so a late reply never replaces the current list.
 */
export function useOutline(course: Course | undefined): Loadable<OutlineFile> & { retry: () => void } {
  const [state, setState] = useState<{ key?: string; value: Loadable<OutlineFile> }>({ value: { status: 'loading' } });
  const [attempt, setAttempt] = useState(0);
  const key = course ? `${course.key}:${course.sourceHash}` : undefined;
  useEffect(() => {
    if (!course || !key) return;
    let current = true;
    let promise = outlineCache.get(key);
    if (!promise) {
      promise = fetchOutline(course);
      outlineCache.set(key, promise);
      promise.catch(() => outlineCache.delete(key));
    }
    setState({ key, value: { status: 'loading' } });
    promise.then(
      (data) => current && setState({ key, value: { status: 'ready', data } }),
      (e) => current && setState({ key, value: { status: 'error', error: describe(e) } }),
    );
    return () => {
      current = false;
    };
    // `course` is identified by `key`.
  }, [key, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const value: Loadable<OutlineFile> = state.key === key ? state.value : { status: 'loading' };
  return { ...value, retry };
}
