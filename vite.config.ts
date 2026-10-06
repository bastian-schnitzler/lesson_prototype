import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

import { DEFAULT_CONTENT_DIR, scanContentDir } from './scripts/catalog.ts';

/**
 * Serves content/ under /content/ during development. The manifest is derived
 * on every request by the shared catalog scanner, so outline edits show up
 * after a browser reload without a separate step. LP_CONTENT_DIR points the
 * app at fixture content (used by end-to-end tests).
 */
function contentPlugin(contentDir: string): Plugin {
  return {
    name: 'lesson-content',
    configureServer(server) {
      server.middlewares.use('/content', (req, res, next) => {
        const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
        if (path === '/manifest.json') {
          const result = scanContentDir(contentDir);
          for (const e of result.errors) server.config.logger.error(`catalog: ${e}`);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(result.manifest));
          return;
        }
        const file = normalize(join(contentDir, path));
        if (!file.startsWith(contentDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
          next();
          return;
        }
        res.setHeader('Content-Type', file.endsWith('.json') ? 'application/json' : 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(file));
      });
    },
  };
}

const contentDir = resolve(process.env.LP_CONTENT_DIR ?? DEFAULT_CONTENT_DIR);

export default defineConfig({
  base: './',
  plugins: [react(), contentPlugin(contentDir)],
  // IPv4 loopback: reachable from Windows browsers through WSL localhost forwarding,
  // which does not cover the IPv6 ::1 that 'localhost' resolves to by default.
  server: { host: '127.0.0.1', strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'tests/unit/**/*.test.{ts,tsx}'],
  },
});
