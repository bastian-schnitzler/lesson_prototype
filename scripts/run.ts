/**
 * `make run`: refresh the course catalog, serve index.html over HTTP and open
 * it in the configured browser.
 *
 *   node scripts/run.ts --port 5173 --browser "xdg-open"
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { createServer } from 'vite';

import { scanContentDir } from './catalog.ts';

const { values } = parseArgs({
  options: { port: { type: 'string', default: '5173' }, browser: { type: 'string', default: 'xdg-open' } },
});

const catalog = scanContentDir();
for (const w of catalog.warnings) console.warn(`warning: ${w}`);
for (const e of catalog.errors) console.error(`error: ${e}`);
if (catalog.errors.length || catalog.manifest.courses.length === 0) {
  console.error('error: fix the course catalog before running the app');
  process.exit(1);
}
for (const c of catalog.manifest.courses) console.log(`course ${c.lang}/${c.level}: ${c.lessonIds.length} lessons`);

const server = await createServer({ server: { port: Number(values.port), strictPort: true } });
await server.listen();
const url = server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${values.port}/`;
console.log(`\nLesson prototype running at ${url}  (Ctrl+C to stop)\n`);

// BROWSER_CMD may be a plain command, a command with arguments, or a path with
// spaces (e.g. /mnt/c/Program Files/Mozilla Firefox/firefox.exe).
const browser = (values.browser ?? '').trim();
if (browser) {
  const command = existsSync(browser) ? `'${browser.replace(/'/g, `'\\''`)}'` : browser;
  const child = spawn(`${command} '${url}'`, { shell: true, stdio: ['ignore', 'ignore', 'pipe'], detached: true });
  let stderr = '';
  child.stderr?.on('data', (d) => (stderr += d));
  child.on('exit', (code) => {
    if (code) {
      console.error(`could not open the browser with "${browser}" (exit ${code})${stderr ? `: ${stderr.trim()}` : ''}`);
      console.error(`open ${url} manually, or set BROWSER_CMD, e.g. make run BROWSER_CMD=wslview`);
    }
  });
  child.unref();
}

let closing = false;
const stop = async () => {
  if (closing) return;
  closing = true;
  console.log('\nstopping server');
  await server.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
