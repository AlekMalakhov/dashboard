/**
 * E2E Tests for Rework Dashboard
 *
 * Following Playwright best practices:
 * - Use Page Object Model for page interactions
 * - Use fixtures for common setup
 * - Use web-first assertions that auto-wait
 * - Use built-in locators (getByRole, getByText)
 * - Avoid hardcoded values where possible
 *
 * Note: The dashboard auto-selects the default board and displays "My Project".
 * Board selection UI is disabled in the current implementation.
 */

import {
  test,
  expect,
  mockBoardsApi,
  mockReworkMetricsApi,
  mockTrendApi,
  mockAllApis,
  mockSessionExpiry,
  createReworkMetrics,
  createMetricsWithWarning,
  createTrendData,
  createWeekData,
  TREND_DATA_3M,
} from './fixtures';

test.describe('Rework Dashboard', () => {
  test.describe('Metrics Display', () => {
    test('displays rework metrics after board auto-selection', async ({ page, dashboardPage }) => {
      const metrics = createReworkMetrics({ rework_ratio: 12 });
      await mockAllApis(page, { metrics });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded(12);

      // Verify context text
      await expect(page.getByText('12% of effort went to bug fixes')).toBeVisible();

      // Verify all context widgets
      await expect(dashboardPage.storiesWidget).toBeVisible();
      await expect(dashboardPage.bugsWidget).toBeVisible();
      await expect(dashboardPage.spDeliveredWidget).toBeVisible();
      await expect(dashboardPage.reworkPointsWidget).toBeVisible();
    });

    test('displays missing data warning when items are excluded', async ({ page, dashboardPage }) => {
      const metricsWithWarning = createMetricsWithWarning(5);
      await mockAllApis(page, { metrics: metricsWithWarning });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded(15);

      await dashboardPage.expectWarningBanner(5);
    });

    test('does not display warning when no items are excluded', async ({ page, dashboardPage }) => {
      const metrics = createReworkMetrics();
      await mockAllApis(page, { metrics });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      await dashboardPage.expectNoWarningBanner();
    });
  });

  test.describe('Time Range Selection', () => {
    test('updates metrics when time range is changed via slider', async ({ page, dashboardPage }) => {
      const metrics90d = createReworkMetrics({ rework_ratio: 12 });
      const metrics60d = createReworkMetrics({ rework_ratio: 18 });
      const metrics30d = createReworkMetrics({ rework_ratio: 22 });

      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, metrics90d, { days: 90 });
      await mockReworkMetricsApi(page, metrics60d, { days: 60 });
      await mockReworkMetricsApi(page, metrics30d, { days: 30 });
      await mockTrendApi(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      // Verify initial metrics (90d default)
      await dashboardPage.waitForMetricsLoaded(12);
      await dashboardPage.expectTimeRangeValue(90);

      // Switch to 60d using preset label
      await dashboardPage.selectTimeRangePreset('60d');
      await dashboardPage.waitForMetricsLoaded(18);
      await dashboardPage.expectTimeRangeValue(60);

      // Switch to 30d using preset label
      await dashboardPage.selectTimeRangePreset('30d');
      await dashboardPage.waitForMetricsLoaded(22);
      await dashboardPage.expectTimeRangeValue(30);
    });

    test('accepts arbitrary day values via slider', async ({ page, dashboardPage }) => {
      const metrics45d = createReworkMetrics({ rework_ratio: 15 });

      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, metrics45d, { days: 45 });
      await mockTrendApi(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      // Change to 45 days using slider
      await dashboardPage.selectTimeRange(45);
      await dashboardPage.expectTimeRangeValue(45);
      await dashboardPage.waitForMetricsLoaded(15);
    });
  });

  test.describe('Loading States', () => {
    test('shows loading skeleton during API call', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      // Use a longer delay to ensure we can observe the loading state
      await mockReworkMetricsApi(page, createReworkMetrics(), { delay: 2000 });
      await mockTrendApi(page, TREND_DATA_3M, { delay: 2000 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      // Verify loading skeleton is displayed (use assertion that waits)
      await expect(page.locator('[class*="skeleton"]').first()).toBeVisible({ timeout: 1000 });

      // Wait for metrics to load
      await dashboardPage.waitForMetricsLoaded();

      // Verify loading state is gone
      await expect(page.locator('[class*="skeleton"]')).not.toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('displays error message on API failure', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics(), { status: 500 });
      await mockTrendApi(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      await dashboardPage.expectErrorMessage();
      await expect(page.getByText('Failed to load rework metrics')).toBeVisible();
    });

    test('displays error message on unauthorized (401) response', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockSessionExpiry(page);
      await mockTrendApi(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      await dashboardPage.expectErrorMessage();
    });

    test('handles no boards available scenario', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page, []);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();

      // When no boards, the dashboard shows "No Boards Available" or remains empty
      // Metrics should not be visible
      await expect(page.getByText(/of effort went to bug fixes/i)).not.toBeVisible();
    });
  });

  test.describe('Issues Modal', () => {
    test('opens and filters issues from widget', async ({ page, dashboardPage }) => {
      const metrics = createReworkMetrics();
      await mockAllApis(page, { metrics });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Open Stories (Completed) modal
      await dashboardPage.openStoriesModal();
      await expect(dashboardPage.modal).toBeVisible();
      // Modal heading is "Completed" (matching the widget title)
      await expect(dashboardPage.modal.getByRole('heading', { name: 'Completed', level: 2 })).toBeVisible();

      // Filter by issue key
      await dashboardPage.filterIssues('STORY-2');
      await expect(page.getByText(/1 issue matching "STORY-2"/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /STORY-2/i })).toBeVisible();

      // Close modal
      await dashboardPage.closeModal();
      await expect(dashboardPage.modal).not.toBeVisible();
    });
  });

  test.describe('Week Data Consistency', () => {
    test('shows consistent week data across different time ranges', async ({ page, dashboardPage }) => {
      // This test verifies the fix for the bug where the same week showed
      // different defect rates depending on the time range selected.

      const OCT_13_WEEK = createWeekData('2025-10-13', {
        rework_ratio: 13.9,
        rework_points: 5,
        delivered_points: 36,
      });

      // 90d trend data - Oct 13 is the first week
      const trend90d = createTrendData([
        OCT_13_WEEK,
        createWeekData('2025-10-20', { rework_ratio: 10 }),
        createWeekData('2025-10-27', { rework_ratio: 5 }),
      ]);

      // 180d trend data - Oct 13 is in the middle
      const trend180d = createTrendData([
        createWeekData('2025-07-14', { rework_ratio: 20 }),
        createWeekData('2025-08-11', { rework_ratio: 15 }),
        createWeekData('2025-09-08', { rework_ratio: 12 }),
        OCT_13_WEEK, // Same data as in 90d
        createWeekData('2025-10-20', { rework_ratio: 10 }),
        createWeekData('2025-11-17', { rework_ratio: 8 }),
      ]);

      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics(), { days: 90 });
      await mockReworkMetricsApi(page, createReworkMetrics(), { days: 180 });
      await mockTrendApi(page, trend90d, { months: 3 });
      await mockTrendApi(page, trend180d, { months: 6 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();
      await dashboardPage.waitForTrendChartLoaded();

      // Verify 90d is selected by default
      await dashboardPage.expectTimeRangeValue(90);

      // Hover over chart at Oct 13 position (first week in 90d)
      await dashboardPage.hoverChartAtPosition(10);
      await dashboardPage.expectTooltipShowsWeek('Week of Oct 13, 2025');

      // Capture tooltip content for 90d
      const tooltipText90d = await dashboardPage.getChartTooltipText();

      // Switch to 180d using preset label
      const responsePromise = page.waitForResponse(/\/api\/rework\/trend\?/);
      await dashboardPage.selectTimeRangePreset('180d');
      await responsePromise;
      await dashboardPage.expectTimeRangeValue(180);

      // Wait for chart to re-render
      await page.waitForTimeout(500);

      // Hover over chart at Oct 13 position (week 4 of 6 in 180d, ~60%)
      await dashboardPage.hoverChartAtPosition(60);
      await dashboardPage.expectTooltipShowsWeek('Week of Oct 13, 2025');

      // Capture tooltip content for 180d
      const tooltipText180d = await dashboardPage.getChartTooltipText();

      // The key assertion: same week should show SAME data regardless of time range
      expect(tooltipText90d).toBe(tooltipText180d);
    });
  });
});
