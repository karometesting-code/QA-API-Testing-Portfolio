import { defineConfig, devices } from '@playwright/test';

/**
 * Central configuration for the whole test suite.
 *
 * Why this matters for an interview: this file is where you show you understand
 * that a test framework is not just "the tests" — it's also retries, reporting,
 * parallelism, base URL management and environment isolation. Interviewers often
 * ask "how would you make your suite CI-friendly?" — the answer lives here.
 */
export default defineConfig({
  // Folder where Playwright looks for test files.
  testDir: './tests',

  // Fail the build if a developer accidentally leaves `test.only` in the code.
  // This protects CI from silently running a single test instead of the whole suite.
  forbidOnly: !!process.env.CI,

  // Retries add resilience against flaky UI tests (network hiccups, animations).
  // We retry twice on CI (unstable shared runners) but never locally, so failures
  // during local development are never masked by an automatic retry.
  retries: process.env.CI ? 2 : 0,

  // Run spec files in parallel workers to keep the suite fast.
  // Locally we let Playwright pick based on CPU cores; on CI we cap it because
  // shared runners usually have fewer resources.
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,

  // Reporters: "html" gives a rich local report with traces/screenshots/videos,
  // "list" prints readable progress in the terminal — useful in CI logs.
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // Every relative goto('/') resolves against this, so tests aren't hardcoded
    // to one environment and can be pointed at staging/prod via env vars.
    baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',

    // Captures a step-by-step trace only when a test fails and is retried —
    // this is the single most useful debugging artifact Playwright offers.
    trace: 'on-first-retry',

    // Screenshot and video only on failure, to keep the report light while still
    // giving visual evidence of what went wrong.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Fails fast on actions/assertions instead of hanging the whole run.
    actionTimeout: 10_000,
  },

  // Cross-browser coverage. Interviewers like seeing that a suite isn't
  // accidentally coupled to a single rendering engine.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
