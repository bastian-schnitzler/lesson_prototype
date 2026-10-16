import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 5174);
const COURSE_PORT = PORT + 1;
/** Journeys through the real course content (P3-06); every other spec uses the fixtures. */
const COURSE_SPECS = /course\.spec\.ts$/;

/** End-to-end checks against fixture-backed local pages (tests/fixtures/content) and the real content/. */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', testIgnore: COURSE_SPECS, use: { ...devices['Desktop Chrome'] } },
    { name: 'narrow', testIgnore: COURSE_SPECS, use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 740 } } },
    { name: 'course', testMatch: COURSE_SPECS, use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${COURSE_PORT}/` } },
  ],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: `http://127.0.0.1:${PORT}/`,
      env: { LP_CONTENT_DIR: 'tests/fixtures/content' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${COURSE_PORT} --strictPort`,
      url: `http://127.0.0.1:${COURSE_PORT}/`,
      env: { LP_CONTENT_DIR: 'content' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
