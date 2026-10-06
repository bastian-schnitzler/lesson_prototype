/**
 * Serves dist/ under the GitHub Pages project path, like Pages does.
 *
 *   node scripts/serve-dist.ts [--port 4173] [--base /lesson_prototype/] [--check]
 *
 * With --check it runs the HTTP smoke check and a browser check (the index
 * renders lessons and a refreshed hash route loads), then exits.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

import { smoke } from './smoke.ts';

const ROOT = resolve(import.meta.dirname, '..');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '4173' },
    base: { type: 'string', default: '/lesson_prototype/' },
    dir: { type: 'string', default: 'dist' },
    check: { type: 'boolean', default: false },
  },
});
const dist = resolve(ROOT, values.dir!);
const base = values.base!.endsWith('/') ? values.base! : `${values.base}/`;
if (!existsSync(join(dist, 'index.html'))) {
  console.error(`error: ${dist}/index.html not found; run make build first`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!path.startsWith(base)) {
    res.writeHead(404).end('not found');
    return;
  }
  let file = normalize(join(dist, path.slice(base.length)));
  if (file !== dist && !file.startsWith(dist + sep)) {
    res.writeHead(404).end('not found');
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

await new Promise<void>((done) => server.listen(Number(values.port), '127.0.0.1', done));
const url = `http://127.0.0.1:${values.port}${base}`;

if (!values.check) {
  console.log(`serving ${values.dir}/ at ${url}  (Ctrl+C to stop)`);
} else {
  let ok = true;
  try {
    const result = await smoke(url);
    for (const l of result.lines) console.log(l);
    ok = result.ok;

    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url);
      await page.locator('tbody tr').first().waitFor({ timeout: 15_000 });
      const rows = await page.locator('tbody tr').count();
      const firstId = await page.locator('tbody tr').first().getAttribute('data-lesson-id');
      console.log(`ok   browser renders ${rows} lesson rows`);
      await page.goto(`${url}#/lesson/${firstId}`);
      await page.reload();
      await page.getByRole('heading', { level: 2 }).first().waitFor({ timeout: 15_000 });
      console.log('ok   browser loads a refreshed lesson route');
      if (errors.length) {
        ok = false;
        console.log(`FAIL page errors: ${errors.join('; ')}`);
      }
    } finally {
      await browser.close();
    }
  } catch (e) {
    ok = false;
    console.log(`FAIL ${(e as Error).message}`);
  }
  server.close();
  console.log(ok ? `dist check passed under ${base}` : 'dist check FAILED');
  process.exit(ok ? 0 : 1);
}
