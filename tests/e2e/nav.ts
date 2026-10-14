import type { Page } from '@playwright/test';

/**
 * The lesson navigation (P6-01): the sidebar on wide screens; on phones the results page shows the same
 * result parts above the answers.
 */
export async function lessonNav(page: Page) {
  return page.locator('aside.lesson-nav');
}
