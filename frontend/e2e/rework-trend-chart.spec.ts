/**
 * E2E Tests for Rework Ratio Trend Chart
 *
 * Following Playwright best practices:
 * - Use Page Object Model for page interactions
 * - Use fixtures for common setup
 * - Use web-first assertions that auto-wait
 * - Use built-in locators (getByRole, getByText)
 * - Avoid hardcoded values where possible
 */

import {
  test,
  expect,
  mockBoardsApi,
  mockReworkMetricsApi,
  mockTrendApi,
  mockAllApis,
  createReworkMetrics,
  TREND_DATA_3M,
  TREND_DATA_1M,
} from './fixtures';

test.describe('Rework Ratio Trend Chart', () => {
  test.describe('Chart Display', () => {
    test('displays chart container when dashboard loads', async ({ page, dashboardPage }) => {
      await mockAllApis(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify trend chart section is visible
      await expect(dashboardPage.trendChartRegion).toBeVisible();

      // Verify chart heading is visible
      await expect(page.getByRole('heading', { name: /work breakdown/i })).toBeVisible();
    });

    test('updates chart when global time range is changed', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics(), { days: 90 });
      await mockReworkMetricsApi(page, createReworkMetrics(), { days: 60 });
      await mockTrendApi(page, TREND_DATA_3M, { months: 3 });
      await mockTrendApi(page, TREND_DATA_3M, { months: 2 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Wait for trend chart to be visible
      await expect(dashboardPage.trendChartRegion).toBeVisible();

      // Switch to 60d using preset
      await dashboardPage.selectTimeRangePreset('60d');

      // Verify the chart is still visible
      await expect(dashboardPage.trendChartRegion).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('displays loading skeleton during data fetch', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M, { delay: 1000 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();

      // Wait for trend chart section to be visible
      await expect(dashboardPage.trendChartRegion).toBeVisible();

      // Verify loading skeleton is displayed
      await expect(dashboardPage.trendChartRegion.locator('[class*="skeleton"]').first()).toBeVisible();

      // Wait for chart to load (skeleton should disappear)
      await dashboardPage.waitForTrendChartLoaded();
    });
  });

  test.describe('Error Handling', () => {
    test('displays error state with retry button on API failure', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M, { status: 500 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();

      // Wait for trend chart section
      await expect(dashboardPage.trendChartRegion).toBeVisible();

      // Verify error message is displayed
      await expect(dashboardPage.trendChartRegion.getByText(/unable to load trend data/i)).toBeVisible({ timeout: 3000 });

      // Verify retry button is present
      const retryButton = dashboardPage.trendChartRegion.getByRole('button', { name: /retry/i });
      await expect(retryButton).toBeVisible();

      // Set up successful response for retry
      await mockTrendApi(page, TREND_DATA_3M);

      // Click retry button
      await retryButton.click();

      // Verify error message disappears
      await expect(dashboardPage.trendChartRegion.getByText(/unable to load trend data/i)).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Tooltip Interaction', () => {
    test('displays tooltip on chart hover', async ({ page, dashboardPage }) => {
      await mockAllApis(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();
      await dashboardPage.waitForTrendChartLoaded();

      // Hover over the chart
      await dashboardPage.chartContainer.hover();

      // Verify tooltip appears with expected content
      const tooltip = page.locator('.recharts-tooltip-wrapper, [role="tooltip"]');
      await expect(tooltip).toBeVisible({ timeout: 2000 });

      // Verify tooltip contains expected data fields
      await expect(tooltip.getByText(/week of/i)).toBeVisible();
      await expect(tooltip.getByText(/defect rate:/i)).toBeVisible();
    });
  });
});
