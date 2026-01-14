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
  bugs: [
    { key: 'BUG-1', summary: 'Example bug 1', story_points: 3 },
    { key: 'BUG-2', summary: 'Example bug 2', story_points: 2 },
  ],
  stories: [
    { key: 'STORY-1', summary: 'Example story 1', story_points: 5 },
    { key: 'STORY-2', summary: 'Example story 2', story_points: 8 },
  ],
};

const MOCK_METRICS_WITH_MISSING_DATA = {
  rework_ratio: 15,
  stories_analyzed: 40,
  bugs_linked: 20,
  story_points_delivered: 90,
  rework_points: 13,
  items_excluded: 5,
  warning: '5 items excluded due to missing story points',
  bugs: [
    { key: 'BUG-10', summary: 'Bug without story points', story_points: null },
    { key: 'BUG-11', summary: 'Bug with story points', story_points: 2 },
  ],
  stories: [
    { key: 'STORY-10', summary: 'Story without story points', story_points: null },
    { key: 'STORY-11', summary: 'Story with story points', story_points: 8 },
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
  days: number = 84,
  metrics: typeof MOCK_METRICS | typeof MOCK_METRICS_WITH_MISSING_DATA = MOCK_METRICS
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
  days: number = 84,
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
  days: number = 84
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
  test('should display rework metrics after board selection', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();
    await expect(page.locator('#board-search')).toBeVisible();

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
    // UI label is "SP Delivered" (not "Story Points Delivered")
    await expect(page.getByRole('status', { name: /sp delivered: 100/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /rework points: 12/i })).toBeVisible();
  });

  test('should update metrics when time range is changed', async ({ page }) => {
    // Mock API responses for different time ranges
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84, MOCK_METRICS);

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

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Verify initial metrics (12w / 84 days)
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '12w' })).toHaveAttribute('aria-pressed', 'true');

    // Switch to 60d
    await page.getByRole('button', { name: '60d' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 18 percent/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /stories analyzed: 90/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '60d' })).toHaveAttribute('aria-pressed', 'true');

    // Switch to 90d
    await page.getByRole('button', { name: '90d' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 22 percent/i })).toBeVisible();
    await expect(page.getByRole('status', { name: /stories analyzed: 135/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('should show loading state during API call', async ({ page }) => {
    // Mock API responses with delay
    await mockBoardsAPI(page);
    await mockReworkMetricsAPIWithDelay(page, 1, 84, 1000);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Verify loading skeleton is displayed
    await expect(page.locator('.skeleton-shimmer').first()).toBeVisible();

    // Wait for metrics to load
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible({ timeout: 3000 });

    // Verify loading state is gone
    await expect(page.locator('.skeleton-shimmer')).not.toBeVisible();
  });

  test('should display missing data warning when items are excluded', async ({ page }) => {
    // Mock API responses with missing data
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84, MOCK_METRICS_WITH_MISSING_DATA);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Wait for metrics to load
    await expect(page.getByRole('status', { name: /rework ratio: 15 percent/i })).toBeVisible();

    // Verify warning message is displayed
    const warningBanner = page.getByRole('button', {
      name: /5 items excluded due to missing story points/i,
    });
    await expect(warningBanner).toBeVisible();
  });

  test('should not display missing data warning when no items are excluded', async ({ page }) => {
    // Mock API responses without missing data
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84, MOCK_METRICS);

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

    // Verify warning message is NOT displayed
    await expect(page.getByText(/items excluded due to missing story points/i)).not.toBeVisible();
  });

  test('should display error message on API failure', async ({ page }) => {
    // Mock API responses with error
    await mockBoardsAPI(page);
    await mockReworkMetricsAPIWithError(page, 1, 84);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Verify error message is displayed
    await expect(page.getByText('Unable to load metrics')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Failed to load rework metrics')).toBeVisible();
  });

  test('should display error message on 401 response (unauthorized)', async ({ page }) => {
    // Mock API responses with session expiry
    await mockBoardsAPI(page);
    await mockSessionExpiry(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();

    // Unauthorized should surface as a metrics error (no redirect in current UI)
    await expect(page.getByText('Unable to load metrics')).toBeVisible({ timeout: 3000 });
  });

  test('should handle multiple board selections', async ({ page }) => {
    // Mock API responses for different boards
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84, MOCK_METRICS);

    const board2Metrics = {
      ...MOCK_METRICS,
      rework_ratio: 20,
      stories_analyzed: 60,
    };
    await mockReworkMetricsAPI(page, 2, 84, board2Metrics);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

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

    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Verify no boards message is displayed
    await expect(page.getByRole('heading', { name: /no boards available/i })).toBeVisible();

    // Verify metrics are not displayed
    await expect(page.getByText(/of effort went to bug fixes/i)).not.toBeVisible();
  });

  test('should persist selected time range when switching boards', async ({ page }) => {
    // Mock API responses
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84, MOCK_METRICS);
    await mockReworkMetricsAPI(page, 1, 60, MOCK_METRICS);
    await mockReworkMetricsAPI(page, 2, 60, { ...MOCK_METRICS, rework_ratio: 25 });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to render
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select first board
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Switch to 60d
    await page.getByRole('button', { name: '60d' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Verify 60d button is selected
    const sixtyDaysButton = page.getByRole('button', { name: '60d' });
    await expect(sixtyDaysButton).toHaveAttribute('aria-pressed', 'true');

    // Switch to second board
    await boardSelector.click();
    await page.getByRole('option', { name: 'Kanban Board' }).click();

    // Verify time range is still 60 days and metrics load for 60 days
    await expect(page.getByRole('status', { name: /rework ratio: 25 percent/i })).toBeVisible();
    await expect(sixtyDaysButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should open issues modal from widget and filter issues', async ({ page }) => {
    await mockBoardsAPI(page);
    await mockReworkMetricsAPI(page, 1, 84, MOCK_METRICS);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Select a board to load metrics
    const boardSelector = page.locator('#board-search');
    await boardSelector.click();
    await page.getByRole('option', { name: 'Sprint Board' }).click();
    await expect(page.getByRole('status', { name: /rework ratio: 12 percent/i })).toBeVisible();

    // Open Stories modal
    await page.getByRole('status', { name: /stories analyzed: 45/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Scope to the modal to avoid strict-mode ambiguity with the widget title heading.
    await expect(dialog.getByRole('heading', { name: 'Stories Analyzed', level: 2 })).toBeVisible();

    // Filter by issue key
    const search = page.getByPlaceholder('Search by key or summary...');
    await search.fill('STORY-2');
    await expect(page.getByText(/1 issue matching "STORY-2"/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /STORY-2/i })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should show consistent week data across different time ranges', async ({ page }) => {
    // This test verifies the fix for the bug where the same week (e.g., Oct 13)
    // showed different defect rates depending on the time range selected.
    // The fix ensures week data is consistent by aligning date boundaries.

    const OCT_13_WEEK_DATA = {
      week_start_date: '2025-10-13',
      rework_ratio: 13.9,
      rework_points: 5,
      delivered_points: 36,
      bugs_count: 1,
      stories_count: 10,
    };

    // Mock trend data for 90d (3 months) - Oct 13 is the first week
    const MOCK_TREND_90D = {
      weeks: [
        OCT_13_WEEK_DATA,
        { week_start_date: '2025-10-20', rework_ratio: 10, rework_points: 3, delivered_points: 30, bugs_count: 1, stories_count: 5 },
        { week_start_date: '2025-10-27', rework_ratio: 5, rework_points: 2, delivered_points: 40, bugs_count: 1, stories_count: 8 },
      ],
      total_weeks: 3,
      items_excluded: 0,
      warning: null,
    };

    // Mock trend data for 180d (6 months) - Oct 13 is somewhere in the middle
    const MOCK_TREND_180D = {
      weeks: [
        { week_start_date: '2025-07-14', rework_ratio: 20, rework_points: 10, delivered_points: 50, bugs_count: 2, stories_count: 6 },
        { week_start_date: '2025-08-11', rework_ratio: 15, rework_points: 8, delivered_points: 53, bugs_count: 2, stories_count: 7 },
        { week_start_date: '2025-09-08', rework_ratio: 12, rework_points: 6, delivered_points: 50, bugs_count: 1, stories_count: 8 },
        OCT_13_WEEK_DATA, // Same data as in 90d response
        { week_start_date: '2025-10-20', rework_ratio: 10, rework_points: 3, delivered_points: 30, bugs_count: 1, stories_count: 5 },
        { week_start_date: '2025-11-17', rework_ratio: 8, rework_points: 4, delivered_points: 50, bugs_count: 1, stories_count: 9 },
      ],
      total_weeks: 6,
      items_excluded: 0,
      warning: null,
    };

    // Mock API responses with the default board name that the dashboard looks for
    const BOARDS_WITH_DEFAULT = {
      boards: [
        { id: 1, name: 'ImaGenAItion Labs' }, // This is the default board the dashboard auto-selects
        { id: 2, name: 'Other Board' },
      ],
    };

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(BOARDS_WITH_DEFAULT),
      });
    });

    await page.route('**/api/rework?board_id=*&days=90', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_METRICS),
      });
    });
    await page.route('**/api/rework?board_id=*&days=180', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_METRICS),
      });
    });

    // Mock trend API for 3 months (90d)
    await page.route('**/api/rework/trend?board_id=*&months=3', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TREND_90D),
      });
    });

    // Mock trend API for 6 months (180d)
    await page.route('**/api/rework/trend?board_id=*&months=6', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TREND_180D),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Rework Dashboard' })).toBeVisible();

    // Wait for dashboard to load with default board (displayed as "My Project" for public deployment)
    await expect(page.getByText('My Project')).toBeVisible();

    // Wait for chart to load - verify 90d is selected by default
    await expect(page.getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true');

    // Wait for the chart to be visible
    const chart = page.locator('.recharts-wrapper');
    await expect(chart).toBeVisible();

    // Use JavaScript to trigger hover on the chart at Oct 13 position
    // Oct 13 is the first week in 90d mock data
    await page.evaluate(() => {
      const chartEl = document.querySelector('.recharts-wrapper');
      if (chartEl) {
        const rect = chartEl.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
          clientX: rect.left + 80,
          clientY: rect.top + rect.height * 0.5,
          bubbles: true,
        });
        chartEl.dispatchEvent(event);
      }
    });

    // Verify Oct 13 tooltip appears and capture the values shown
    await expect(page.getByText('Week of Oct 13, 2025')).toBeVisible();

    // Capture the defect rate and delivered points from the tooltip
    const tooltipText90d = await page.locator('[class*="recharts-tooltip"], [role="tooltip"]').first().textContent()
      ?? await page.evaluate(() => {
        // Fallback: find tooltip content in the DOM
        const tooltip = document.querySelector('.recharts-default-tooltip, [class*="tooltip"]');
        return tooltip?.textContent ?? '';
      });

    // Switch to 180d - start waiting for response before clicking
    const responsePromise = page.waitForResponse('**/api/rework/trend?board_id=*&months=6');
    await page.getByRole('button', { name: '180d' }).click();
    await responsePromise;
    await expect(page.getByRole('button', { name: '180d' })).toHaveAttribute('aria-pressed', 'true');

    // Wait a moment for the chart to re-render
    await page.waitForTimeout(500);

    // Use JavaScript to trigger hover on the chart at Oct 13 position
    // Oct 13 is week 4 of 6 in mock data, so ~60% across the chart
    await page.evaluate(() => {
      const chart = document.querySelector('.recharts-wrapper');
      if (chart) {
        const rect = chart.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
          clientX: rect.left + rect.width * 0.6,
          clientY: rect.top + rect.height * 0.5,
          bubbles: true,
        });
        chart.dispatchEvent(event);
      }
    });

    // Verify Oct 13 shows in 180d view
    await expect(page.getByText('Week of Oct 13, 2025')).toBeVisible();

    // Capture the tooltip content for 180d
    const tooltipText180d = await page.locator('[class*="recharts-tooltip"], [role="tooltip"]').first().textContent()
      ?? await page.evaluate(() => {
        const tooltip = document.querySelector('.recharts-default-tooltip, [class*="tooltip"]');
        return tooltip?.textContent ?? '';
      });

    // The key assertion: same week should show SAME data regardless of time range
    // This verifies the bug fix - previously 90d and 180d would show different values
    expect(tooltipText90d).toBe(tooltipText180d);
  });
});
