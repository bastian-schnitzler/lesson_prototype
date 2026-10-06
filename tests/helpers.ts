import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { vi } from 'vitest';

import { scanContentDir } from '../scripts/catalog.ts';

export const FIXTURE_CONTENT = resolve(import.meta.dirname, 'fixtures', 'content');

/**
 * Serves `content/...` requests from a content directory, deriving the
 * manifest with the shared scanner like the dev server does.
 */
export function mockContentFetch(contentDir = FIXTURE_CONTENT) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === 'content/manifest.json') {
      return new Response(JSON.stringify(scanContentDir(contentDir).manifest), { status: 200 });
    }
    if (url.startsWith('content/')) {
      try {
        return new Response(readFileSync(join(contentDir, url.slice('content/'.length)), 'utf8'), { status: 200 });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
