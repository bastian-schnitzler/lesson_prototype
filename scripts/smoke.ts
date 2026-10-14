/**
 * HTTP smoke check of a deployed (or locally previewed) site.
 *
 *   node scripts/smoke.ts https://bastian-schnitzler.github.io/lesson_prototype/
 *
 * Fetches index.html, every script/stylesheet it references, the manifest, the feedback page,
 * each course outline and one artifact, and a refreshed hash route. Hash
 * routes never reach the server, so a refresh must return the same index.html.
 */
import { ManifestSchema } from '../src/schemas/manifest.ts';
import { OutlineFileSchema } from '../src/schemas/outline.ts';

export interface SmokeResult {
  ok: boolean;
  lines: string[];
}

async function get(url: string): Promise<{ status: number; type: string; text: string }> {
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  return { status: res.status, type: res.headers.get('content-type') ?? '', text: await res.text() };
}

export async function smoke(base: string): Promise<SmokeResult> {
  const root = base.endsWith('/') ? base : `${base}/`;
  const lines: string[] = [];
  let ok = true;
  const check = (pass: boolean, label: string) => {
    lines.push(`${pass ? 'ok  ' : 'FAIL'} ${label}`);
    ok &&= pass;
    return pass;
  };

  const index = await get(root);
  if (!check(index.status === 200 && index.text.includes('<div id="root">'), `index.html ${index.status}`)) return { ok, lines };

  const assets = [...index.text.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
  check(assets.length > 0, `index.html references ${assets.length} relative assets`);
  for (const a of assets) {
    const r = await get(new URL(a, root).href);
    check(r.status === 200 && r.text.length > 0, `${a} ${r.status}`);
  }

  const m = await get(new URL('content/manifest.json', root).href);
  const manifest = check(m.status === 200, `content/manifest.json ${m.status}`) ? ManifestSchema.safeParse(JSON.parse(m.text)) : null;
  if (!manifest || !check(manifest.success, 'manifest matches its schema') || !manifest.success) return { ok, lines };

  for (const course of manifest.data.courses) {
    const o = await get(new URL(course.outlineUrl, root).href);
    const valid = o.status === 200 && OutlineFileSchema.safeParse(JSON.parse(o.text)).success;
    check(valid, `${course.outlineUrl} ${o.status} (${course.lessonIds.length} lessons)`);
  }
  const artifact = Object.values(manifest.data.artifacts).flatMap((a) => [a.draft?.url, a.content?.url]).find(Boolean);
  if (artifact) {
    const a = await get(new URL(artifact, root).href);
    check(a.status === 200, `${artifact} ${a.status}`);
  } else {
    lines.push('info no generated artifacts deployed yet');
  }

  const refreshed = await get(`${root}#/lesson/${manifest.data.courses[0]?.lessonIds[0] ?? 'x'}`);
  check(refreshed.status === 200 && refreshed.text === index.text, 'refreshed hash route returns index.html');

  const feedback = await get(new URL('docs/feedback.html', root).href);
  check(feedback.status === 200 && feedback.text.includes('href="../"'), `docs/feedback.html ${feedback.status}`);

  const env = await get(new URL('.env', root).href);
  check(env.status === 404, `.env not served (${env.status})`);
  return { ok, lines };
}

if (import.meta.main) {
  const base = process.argv[2];
  if (!base) {
    console.error('usage: node scripts/smoke.ts <site-url>');
    process.exit(2);
  }
  const result = await smoke(base);
  for (const l of result.lines) console.log(l);
  console.log(result.ok ? `smoke check passed: ${base}` : `smoke check FAILED: ${base}`);
  process.exit(result.ok ? 0 : 1);
}
