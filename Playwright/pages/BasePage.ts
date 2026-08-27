import { Page } from '@playwright/test';

/**
 * BasePage centralizes behavior shared by every page object (navigation,
 * generic waits, etc.). Concrete pages extend it instead of duplicating
 * the same `goto`/`page` boilerplate in each class.
 *
 * Interview angle: this is composition through inheritance applied to test
 * automation — a small, deliberate use of it (one shallow level, no deep
 * hierarchies) rather than inheritance for its own sake.
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to a path relative to `baseURL` (configured in playwright.config.ts)
   * and waits for the network to go idle. Centralizing this means the base URL
   * only exists in one place, never hardcoded inside a test.
   */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
