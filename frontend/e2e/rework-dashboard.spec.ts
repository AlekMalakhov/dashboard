import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests for Rework Dashboard Feature
 *
 * These tests verify the complete user flow for the rework dashboard,
 * including board selection, time range switching, loading states,
 * error handling, and session expiry scenarios.
 */

const MOCK_BOARDS = {
  boards: [
    { id: 1, name: 'Sprint Board' },
    { id: 2, name: 'Kanban Board' },
    { id: 3, name: 'Team Board' },
  ],
};

const MOCK_METRICS = {
  rework_ratio: 12,
  stories_analyzed: 45,
  bugs_linked: 23,
  story_points_delivered: 100,
  rework_points: 12,
  items_excluded: 0,
  warning: null,
};

const MOCK_METRICS_WITH_MISSING_DATA = {
  rework_ratio: 15,
  stories_analyzed: 40,
  bugs_linked: 20,
  story_points_delivered: 90,
  rework_points: 13,
  items_excluded: 5,
  warning: '5 items excluded due to missing story points',
};

/**
 * Helper function to mock authentication
 */
async function mockAuthentication(page: Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ authenticated: true, user: { id: 'test-user' } }),
    });
  });
}

/**
 * Helper function to mock boards API
 */
async function mockBoardsAPI(page: Page) {
  await page.route('**/api/boards', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_BOARDS),
    });
  });
}

/**
 * Helper function to mock rework metrics API
 */
async function mockReworkMetricsAPI(
  page: Page,
  boardId: number = 1,
  days: number = 30,
  metrics = MOCK_METRICS
) {
  await page.route(
    `**/api/rework?board_id=${boardId}&days=${days}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(metrics),
      });
    }
  );
}

/**
 * Helper function to mock rework metrics API with delay (for loading state testing)
 */
async function mockReworkMetricsAPIWithDelay(
  page: Page,
  boardId: number = 1,
  days: number = 30,
  delayMs: number = 1000
) {
  await page.route(
    `**/api/rework?board_id=${boardId}&days=${days}`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_METRICS),
      });
    }
  );
}

/**
 * Helper function to mock rework metrics API with error
 */
async function mockReworkMetricsAPIWithError(
  page: Page,
  boardId: number = 1,
  days: number = 30
) {
  await page.route(
    `**/api/rework?board_id=${boardId}&days=${days}`,
    async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
  );
}

/**
 * Helper function to mock session expiry (401 response)
 */
async function mockSessionExpiry(page: Page) {
  await page.route('**/api/rework?**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });
}

test.describe('Rework Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for all tests
    await mockAuthentication(page);
  });

  test('should display rework metrics after board selection', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 30);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication check
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Wait for boards to load
    await expect(page.locator('text=Loading boards...')).not.toBeVisible();

    // Click on board selector input to open dropdown
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();

    // Select the first board
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for metrics to load - use aria-label for more robust selection
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Verify context text is displayed
    await expect(page.getByText('12% of effort went to bug fixes')).toBeVisible();

    // Verify all context widgets are displayed
    await expect(page.getByRole('status', { name: /stories analyzed: 45/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /bugs linked: 23/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /story points delivered: 100/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /rework points: 12/i })).toBeVisible();
  });

  test('should update metrics when time range is changed', async ({ page }) => {
    // Mock API responses for different time ranges
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 30, MOCK_METRICS);

    const metrics60Days = {
      ...MOCK_METRICS,
      rework_ratio: 18,
      stories_analyzed: 90,
      bugs_linked: 40,
      story_points_delivered: 200,
      rework_points: 36,
    };
    await mockReworkMetricsAPI(page, 1, 60, metrics60Days);

    const metrics90Days = {
      ...MOCK_METRICS,
      rework_ratio: 22,
      stories_analyzed: 135,
      bugs_linked: 55,
      story_points_delivered: 300,
      rework_points: 66,
    };
    await mockReworkMetricsAPI(page, 1, 90, metrics90Days);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Verify initial metrics (30 days)
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Switch to 60 days
    await page.getByRole('button', { name: '60 days' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 18 percent/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /stories analyzed: 90/i })).toBeVisible();

    // Switch to 90 days
    await page.getByRole('button', { name: '90 days' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 22 percent/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /stories analyzed: 135/i })).toBeVisible();
  });

  test('should show loading state during API call', async ({ page }) => {
    // Mock API responses with delay
    await mockBoardsAPI(page);
    await mockReworkMetricsAPIWithDelay(page, 1, 30, 1000);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Verify loading skeleton is displayed
    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    // Wait for metrics to load
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible({ timeout: 3000 });

    // Verify loading state is gone
    await expect(page.locator('.animate-pulse')).not.toBeVisible();
  });

  test('should display missing data warning when items are excluded', async ({ page }) => {
    // Mock API responses with missing data
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 30, MOCK_METRICS_WITH_MISSING_DATA);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for metrics to load
    await expect(page.getByRole('status', { name: /rework ratio: 15 percent/i })).toBeVisible();

    // Verify warning message is displayed
    const warningBanner = page.locator('[role="alert"]').filter({
      hasText: /5 items excluded due to missing story points/i,
    });
    await expect(warningBanner).toBeVisible();

    // Verify warning icon is present
    await expect(warningBanner.locator('text=⚠️')).toBeVisible();
  });

  test('should not display missing data warning when no items are excluded', async ({ page }) => {
    // Mock API responses without missing data
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 30, MOCK_METRICS);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for metrics to load
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Verify warning message is NOT displayed
    const warningBanner = page.locator('[role="alert"]').filter({
      hasText: /items excluded/i,
    });
    await expect(warningBanner).not.toBeVisible();
  });

  test('should display error message on API failure', async ({ page }) => {
    // Mock API responses with error
    await mockBoardsAPI(page);
    await mockReworkMetricsAPIWithError(page, 1, 30);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Verify error message is displayed
    const errorMessage = page.locator('.bg-red-50').filter({
      hasText: /failed to load rework metrics/i,
    });
    await expect(errorMessage).toBeVisible({ timeout: 3000 });

    // Verify the error message has appropriate styling
    await expect(errorMessage.locator('.text-red-700')).toBeVisible();
  });

  test('should redirect to landing page on session expiry', async ({ page }) => {
    // Mock API responses with session expiry
    await mockBoardsAPI(page);
    await mockSessionExpiry(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for redirect to landing page (session expiry should trigger redirect)
    await expect(page).toHaveURL('/', { timeout: 3000 });
  });

  test('should handle multiple board selections', async ({ page }) => {
    // Mock API responses for different boards
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 30, MOCK_METRICS);

    const board2Metrics = {
      ...MOCK_METRICS,
      rework_ratio: 20,
      stories_analyzed: 60,
    };
    await mockReworkMetricsAPI(page, 2, 30, board2Metrics);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select first board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Select second board
    await boardSelector.click();
    await page.getByRole('option', { name: 'Kanban Board' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 20 percent/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /stories analyzed: 60/i })).toBeVisible();
  });

  test('should handle no boards available scenario', async ({ page }) => {
    // Mock empty boards response
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Verify no boards message is displayed
    const noBoardsMessage = page.locator('.bg-yellow-50').filter({
      hasText: /no boards available/i,
    });
    await expect(noBoardsMessage).toBeVisible();

    // Verify metrics are not displayed
    await expect(page.locator('text=% of effort went to bug fixes')).not.toBeVisible();
  });

  test('should persist selected time range when switching boards', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 30, MOCK_METRICS);
    await mockReworkMetricsAPI(page, 1, 60, MOCK_METRICS);
    await mockReworkMetricsAPI(page, 2, 60, { ...MOCK_METRICS, rework_ratio: 25 });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for authentication and boards
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Select first board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Switch to 60 days
    await page.getByRole('button', { name: '60 days' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Verify 60 days button is selected (has active styling)
    const sixtyDaysButton = page.getByRole('button', { name: '60 days' });
    await expect(sixtyDaysButton).toHaveClass(/bg-blue-600/);

    // Switch to second board
    await boardSelector.click();
    await page.getByRole('option', { name: 'Kanban Board' }).click();

    // Verify time range is still 60 days and metrics load for 60 days
    await expect(page.getByRole('status', { name: /rework ratio: 25 percent/i })).toBeVisible();
    await expect(sixtyDaysButton).toHaveClass(/bg-blue-600/);
  });
});
