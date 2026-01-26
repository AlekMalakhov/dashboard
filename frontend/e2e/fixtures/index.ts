/**
 * Custom Playwright Test Fixtures
 *
 * Following Playwright best practices:
 * - Extend base test with custom fixtures
 * - Provide Page Object Models via fixtures
 * - Centralize common setup
 */

import { test as base } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard.page';

// Re-export mock data and API utilities
export * from './mock-data';
export * from './api-mocks';

/**
 * Custom fixture types
 */
type CustomFixtures = {
  dashboardPage: DashboardPage;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';
