import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests for Rework Ratio Trend Chart Feature
 *
 * These tests verify the trend chart functionality including time range selection,
 * data visualization, loading states, error handling, and tooltip interactions.
 *
 * NOTE: These are test-first tests - the feature is not yet implemented,
 * so all tests will initially fail. This is expected behavior.
 */

const MOCK_BOARDS = {
  boards: [
    { id: 1, name: 'Sprint Board' },
    { id: 2, name: 'Kanban Board' },
    { id: 3, name: 'Team Board' },
  ],
};

const MOCK_REWORK_METRICS = {
  rework_ratio: 12,
  stories_analyzed: 45,
  bugs_linked: 23,
  story_points_delivered: 100,
  rework_points: 12,
  items_excluded: 0,
  warning: null,
  bugs: [
    { key: 'BUG-1', summary: 'Example bug 1', story_points: 3 },
    { key: 'BUG-2', summary: 'Example bug 2', story_points: 2 },
  ],
  stories: [
    { key: 'STORY-1', summary: 'Example story 1', story_points: 5 },
    { key: 'STORY-2', summary: 'Example story 2', story_points: 8 },
  ],
};

const MOCK_TREND_DATA_3M = {
  weeks: [
    { week_start_date: '2025-10-06', rework_ratio: 10, rework_points: 8, delivered_points: 80, bugs_count: 4, stories_count: 12 },
    { week_start_date: '2025-10-13', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-10-20', rework_ratio: 15, rework_points: 12, delivered_points: 80, bugs_count: 6, stories_count: 12 },
    { week_start_date: '2025-10-27', rework_ratio: 11, rework_points: 9, delivered_points: 82, bugs_count: 4, stories_count: 13 },
    { week_start_date: '2025-11-03', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
    { week_start_date: '2025-11-10', rework_ratio: 14, rework_points: 12, delivered_points: 86, bugs_count: 6, stories_count: 14 },
    { week_start_date: '2025-11-17', rework_ratio: 10, rework_points: 8, delivered_points: 80, bugs_count: 4, stories_count: 12 },
    { week_start_date: '2025-11-24', rework_ratio: 16, rework_points: 13, delivered_points: 81, bugs_count: 6, stories_count: 13 },
    { week_start_date: '2025-12-01', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-12-08', rework_ratio: 14, rework_points: 11, delivered_points: 79, bugs_count: 5, stories_count: 12 },
    { week_start_date: '2025-12-15', rework_ratio: 15, rework_points: 12, delivered_points: 80, bugs_count: 6, stories_count: 12 },
    { week_start_date: '2025-12-22', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
  ],
};

const MOCK_TREND_DATA_1M = {
  weeks: [
    { week_start_date: '2025-12-01', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-12-08', rework_ratio: 14, rework_points: 11, delivered_points: 79, bugs_count: 5, stories_count: 12 },
    { week_start_date: '2025-12-15', rework_ratio: 15, rework_points: 12, delivered_points: 80, bugs_count: 6, stories_count: 12 },
    { week_start_date: '2025-12-22', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
  ],
};

const MOCK_TREND_DATA_6M = {
  weeks: [
    { week_start_date: '2025-06-30', rework_ratio: 8, rework_points: 6, delivered_points: 75, bugs_count: 3, stories_count: 11 },
    { week_start_date: '2025-07-07', rework_ratio: 10, rework_points: 8, delivered_points: 80, bugs_count: 4, stories_count: 12 },
    { week_start_date: '2025-07-14', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-07-21', rework_ratio: 11, rework_points: 9, delivered_points: 82, bugs_count: 4, stories_count: 13 },
    { week_start_date: '2025-07-28', rework_ratio: 9, rework_points: 7, delivered_points: 78, bugs_count: 3, stories_count: 12 },
    { week_start_date: '2025-08-04', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
    { week_start_date: '2025-08-11', rework_ratio: 14, rework_points: 12, delivered_points: 86, bugs_count: 6, stories_count: 14 },
    { week_start_date: '2025-08-18', rework_ratio: 10, rework_points: 8, delivered_points: 80, bugs_count: 4, stories_count: 12 },
    { week_start_date: '2025-08-25', rework_ratio: 16, rework_points: 13, delivered_points: 81, bugs_count: 6, stories_count: 13 },
    { week_start_date: '2025-09-01', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-09-08', rework_ratio: 14, rework_points: 11, delivered_points: 79, bugs_count: 5, stories_count: 12 },
    { week_start_date: '2025-09-15', rework_ratio: 15, rework_points: 12, delivered_points: 80, bugs_count: 6, stories_count: 12 },
    { week_start_date: '2025-09-22', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
    { week_start_date: '2025-09-29', rework_ratio: 11, rework_points: 9, delivered_points: 82, bugs_count: 4, stories_count: 13 },
    { week_start_date: '2025-10-06', rework_ratio: 10, rework_points: 8, delivered_points: 80, bugs_count: 4, stories_count: 12 },
    { week_start_date: '2025-10-13', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-10-20', rework_ratio: 15, rework_points: 12, delivered_points: 80, bugs_count: 6, stories_count: 12 },
    { week_start_date: '2025-10-27', rework_ratio: 11, rework_points: 9, delivered_points: 82, bugs_count: 4, stories_count: 13 },
    { week_start_date: '2025-11-03', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
    { week_start_date: '2025-11-10', rework_ratio: 14, rework_points: 12, delivered_points: 86, bugs_count: 6, stories_count: 14 },
    { week_start_date: '2025-11-17', rework_ratio: 10, rework_points: 8, delivered_points: 80, bugs_count: 4, stories_count: 12 },
    { week_start_date: '2025-11-24', rework_ratio: 16, rework_points: 13, delivered_points: 81, bugs_count: 6, stories_count: 13 },
    { week_start_date: '2025-12-01', rework_ratio: 12, rework_points: 10, delivered_points: 83, bugs_count: 5, stories_count: 13 },
    { week_start_date: '2025-12-08', rework_ratio: 14, rework_points: 11, delivered_points: 79, bugs_count: 5, stories_count: 12 },
    { week_start_date: '2025-12-15', rework_ratio: 15, rework_points: 12, delivered_points: 80, bugs_count: 6, stories_count: 12 },
    { week_start_date: '2025-12-22', rework_ratio: 13, rework_points: 11, delivered_points: 85, bugs_count: 5, stories_count: 14 },
  ],
};

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
  days: number = 84
) {
  await page.route(
    `**/api/rework?board_id=${boardId}&days=${days}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_REWORK_METRICS),
      });
    }
  );
}

/**
 * Helper function to mock trend API
 */
async function mockTrendAPI(
  page: Page,
  boardId: number = 1,
  months: number = 3,
  trendData = MOCK_TREND_DATA_3M
) {
  await page.route(
    `**/api/rework/trend?board_id=${boardId}&months=${months}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(trendData),
      });
    }
  );
}

/**
 * Helper function to mock trend API with delay (for loading state testing)
 */
async function mockTrendAPIWithDelay(
  page: Page,
  boardId: number = 1,
  months: number = 3,
  delayMs: number = 1000
) {
  await page.route(
    `**/api/rework/trend?board_id=${boardId}&months=${months}`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TREND_DATA_3M),
      });
    }
  );
}

/**
 * Helper function to mock trend API with error
 */
async function mockTrendAPIWithError(
  page: Page,
  boardId: number = 1,
  months: number = 3
) {
  await page.route(
    `**/api/rework/trend?board_id=${boardId}&months=${months}`,
    async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    }
  );
}

test.describe('Rework Ratio Trend Chart', () => {
  test('should display chart container after board selection', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);
    await mockTrendAPI(page, 1, 3, MOCK_TREND_DATA_3M);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for metrics to load
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Verify trend chart section is visible
    await expect(page.getByRole('region', { name: /rework ratio trend/i })).toBeVisible();

    // Verify chart heading is visible
    await expect(page.getByRole('heading', { name: /rework ratio trend/i })).toBeVisible();
  });

  test('should display time range selector with 1m/3m/6m options and 3m default', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);
    await mockTrendAPI(page, 1, 3, MOCK_TREND_DATA_3M);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for trend chart to be visible
    await expect(page.getByRole('region', { name: /rework ratio trend/i })).toBeVisible();

    // Verify time range buttons exist
    const oneMonthButton = page.getByRole('button', { name: '1m' });
    const threeMonthsButton = page.getByRole('button', { name: '3m' });
    const sixMonthsButton = page.getByRole('button', { name: '6m' });

    await expect(oneMonthButton).toBeVisible();
    await expect(threeMonthsButton).toBeVisible();
    await expect(sixMonthsButton).toBeVisible();

    // Verify 3 months is selected by default
    await expect(threeMonthsButton).toHaveAttribute('aria-pressed', 'true');
    await expect(oneMonthButton).toHaveAttribute('aria-pressed', 'false');
    await expect(sixMonthsButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should trigger data reload when switching time range', async ({ page }) => {
    // Mock API responses for different time ranges
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);
    await mockTrendAPI(page, 1, 3, MOCK_TREND_DATA_3M);
    await mockTrendAPI(page, 1, 1, MOCK_TREND_DATA_1M);
    await mockTrendAPI(page, 1, 6, MOCK_TREND_DATA_6M);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for trend chart to be visible with 3m data (default)
    await expect(page.getByRole('region', { name: /rework ratio trend/i })).toBeVisible();
    const threeMonthsButton = page.getByRole('button', { name: '3m' });
    await expect(threeMonthsButton).toHaveAttribute('aria-pressed', 'true');

    // Switch to 1 month and verify button state changes
    const oneMonthButton = page.getByRole('button', { name: '1m' });
    await oneMonthButton.click();
    await expect(oneMonthButton).toHaveAttribute('aria-pressed', 'true');
    await expect(threeMonthsButton).toHaveAttribute('aria-pressed', 'false');

    // Switch to 6 months and verify button state changes
    const sixMonthsButton = page.getByRole('button', { name: '6m' });
    await sixMonthsButton.click();
    await expect(sixMonthsButton).toHaveAttribute('aria-pressed', 'true');
    await expect(oneMonthButton).toHaveAttribute('aria-pressed', 'false');

    // Switch back to 3 months and verify button state changes
    await threeMonthsButton.click();
    await expect(threeMonthsButton).toHaveAttribute('aria-pressed', 'true');
    await expect(sixMonthsButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should display loading skeleton during data fetch', async ({ page }) => {
    // Mock API responses with delay for trend API
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);
    await mockTrendAPIWithDelay(page, 1, 3, 1000);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for trend chart section to be visible
    await expect(page.getByRole('region', { name: /rework ratio trend/i })).toBeVisible();

    // Verify loading skeleton is displayed
    // The skeleton should be within the trend chart region
    const trendChartRegion = page.getByRole('region', { name: /rework ratio trend/i });
    await expect(trendChartRegion.locator('.skeleton-shimmer').first()).toBeVisible();

    // Wait for chart to load (skeleton should disappear)
    await expect(trendChartRegion.locator('.skeleton-shimmer')).not.toBeVisible({ timeout: 3000 });
  });

  test('should display error state with retry button on API failure', async ({ page }) => {
    // Mock API responses with error for trend API
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);
    await mockTrendAPIWithError(page, 1, 3);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for trend chart section to be visible
    await expect(page.getByRole('region', { name: /rework ratio trend/i })).toBeVisible();

    // Verify error message is displayed
    const trendChartRegion = page.getByRole('region', { name: /rework ratio trend/i });
    await expect(trendChartRegion.getByText(/unable to load trend data/i)).toBeVisible({ timeout: 3000 });
    await expect(trendChartRegion.getByText(/failed to load rework trend data/i)).toBeVisible();

    // Verify retry button is present
    const retryButton = trendChartRegion.getByRole('button', { name: /retry/i });
    await expect(retryButton).toBeVisible();

    // Test retry button functionality
    // First, set up a successful response for the retry
    await mockTrendAPI(page, 1, 3, MOCK_TREND_DATA_3M);

    // Click retry button
    await retryButton.click();

    // Verify error message disappears and chart loads
    await expect(trendChartRegion.getByText(/unable to load trend data/i)).not.toBeVisible({ timeout: 3000 });
  });

  test('should display tooltip on chart hover', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);
    await mockTrendAPI(page, 1, 3, MOCK_TREND_DATA_3M);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for trend chart to be visible and fully loaded
    await expect(page.getByRole('region', { name: /rework ratio trend/i })).toBeVisible();

    // Wait for the chart to finish loading (skeleton disappears)
    const trendChartRegion = page.getByRole('region', { name: /rework ratio trend/i });
    await expect(trendChartRegion.locator('.skeleton-shimmer')).not.toBeVisible({ timeout: 3000 });

    // Hover over a chart element (Recharts typically uses SVG)
    // Look for the recharts responsive container or the chart itself
    const chartContainer = trendChartRegion.locator('.recharts-wrapper, [class*="recharts"]').first();
    await expect(chartContainer).toBeVisible();

    // Hover over the chart area to trigger tooltip
    await chartContainer.hover();

    // Verify tooltip appears with expected content
    // Recharts typically uses a div with class 'recharts-tooltip-wrapper'
    const tooltip = page.locator('.recharts-tooltip-wrapper, [role="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 2000 });

    // Verify tooltip contains expected data fields within the tooltip element
    // The tooltip should show: week label, rework ratio %, rework points, delivered points
    // Scope searches to within tooltip to avoid strict mode violations
    await expect(tooltip.getByText(/week of/i)).toBeVisible();
    await expect(tooltip.getByText(/rework ratio:/i)).toBeVisible();
    await expect(tooltip.getByText(/rework points:/i)).toBeVisible();
    await expect(tooltip.getByText(/delivered points:/i)).toBeVisible();
  });
});
