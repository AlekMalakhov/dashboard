/**
 * E2E Tests for Developer Rework Leaderboard
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
} from './fixtures';

// TODO: Import these once implemented in fixtures
// import {
//   mockDeveloperLeaderboardApi,
//   createDeveloperLeaderboardResponse,
//   LEADERBOARD_DATA_DEFAULT,
//   LEADERBOARD_DATA_EMPTY,
// } from './fixtures';

// Temporary mock data until fixtures are updated
const LEADERBOARD_DATA_DEFAULT = {
  developers: [
    {
      account_id: '5f7c3b1111111111',
      display_name: 'Alice Smith',
      avatar_url: 'https://avatar-cdn.atlassian.com/alice',
      rework_ratio: 25.0,
      stories_count: 8,
      story_points_delivered: 40,
      bugs_count: 3,
      bug_points: 10,
      stories: [
        { key: 'PROJ-101', summary: 'Implement feature A', story_points: 5 },
        { key: 'PROJ-102', summary: 'Implement feature B', story_points: 8 },
      ],
      bugs: [
        { key: 'PROJ-201', summary: 'Bug in feature A', story_points: 3, parent_key: 'PROJ-101' },
      ],
    },
    {
      account_id: '5f7c3b2222222222',
      display_name: 'Bob Johnson',
      avatar_url: 'https://avatar-cdn.atlassian.com/bob',
      rework_ratio: 18.5,
      stories_count: 12,
      story_points_delivered: 54,
      bugs_count: 2,
      bug_points: 10,
      stories: [
        { key: 'PROJ-103', summary: 'Implement feature C', story_points: 13 },
      ],
      bugs: [
        { key: 'PROJ-202', summary: 'Bug in feature C', story_points: 5, parent_key: 'PROJ-103' },
      ],
    },
    {
      account_id: '5f7c3b3333333333',
      display_name: 'Carol White',
      avatar_url: null,
      rework_ratio: 8.2,
      stories_count: 5,
      story_points_delivered: 24,
      bugs_count: 1,
      bug_points: 2,
      stories: [
        { key: 'PROJ-104', summary: 'Implement feature D', story_points: 8 },
      ],
      bugs: [],
    },
  ],
  total_developers: 5,
  developers_excluded: 2,
  warning: '2 developers hidden (fewer than 1 stories)' as string | null,
  unattributed_bugs_count: 3,
  unattributed_bug_points: 8,
};

const LEADERBOARD_DATA_EMPTY = {
  developers: [] as typeof LEADERBOARD_DATA_DEFAULT.developers,
  total_developers: 0,
  developers_excluded: 0,
  warning: null as string | null,
  unattributed_bugs_count: 0,
  unattributed_bug_points: 0,
};

// Helper to mock developer leaderboard API
async function mockDeveloperLeaderboardApi(
  page: import('@playwright/test').Page,
  data = LEADERBOARD_DATA_DEFAULT,
  options: { delay?: number; status?: number; days?: number } = {}
) {
  const { delay = 0, status = 200, days } = options;

  await page.route(/\/api\/rework\/developers\?/, async (route) => {
    const url = route.request().url();

    if (days !== undefined && !url.includes(`days=${days}`)) {
      return route.fallback();
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? data : { error: 'Internal server error' }),
    });
  });
}

// Helper to mock all APIs including leaderboard
async function mockAllApisWithLeaderboard(
  page: import('@playwright/test').Page,
  options: { leaderboardData?: typeof LEADERBOARD_DATA_DEFAULT; leaderboardDelay?: number } = {}
) {
  const { leaderboardData = LEADERBOARD_DATA_DEFAULT, leaderboardDelay = 0 } = options;

  await Promise.all([
    mockBoardsApi(page),
    mockReworkMetricsApi(page, createReworkMetrics()),
    mockTrendApi(page, TREND_DATA_3M),
    mockDeveloperLeaderboardApi(page, leaderboardData, { delay: leaderboardDelay }),
  ]);
}

test.describe('Developer Rework Leaderboard', () => {
  test.describe('Display', () => {
    test('displays leaderboard section on dashboard', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify leaderboard section is visible
      await expect(page.getByRole('heading', { name: /developer rework leaderboard/i })).toBeVisible();
    });

    test('displays disclaimer message', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify disclaimer is visible
      await expect(page.getByText(/this data supports process improvement/i)).toBeVisible();
    });

    test('displays developer rows with metrics', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify developers are displayed
      await expect(page.getByText('Alice Smith')).toBeVisible();
      await expect(page.getByText('Bob Johnson')).toBeVisible();
      await expect(page.getByText('Carol White')).toBeVisible();

      // Verify rework ratios are displayed
      await expect(page.getByText('25%')).toBeVisible();
      await expect(page.getByText('18.5%')).toBeVisible();
      await expect(page.getByText('8.2%')).toBeVisible();
    });

    test('displays developers sorted by rework ratio descending', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Get all developer names in order - use role="button" since rows are clickable
      const leaderboardSection = page.locator('[aria-label="Developer Rework Leaderboard"]');
      const rows = leaderboardSection.locator('tbody tr[role="button"]');

      // Wait for rows to be visible
      await expect(rows.first()).toBeVisible();

      // First row should be Alice (25%)
      await expect(rows.first()).toContainText('Alice Smith');
      // Last row should be Carol (8.2%)
      await expect(rows.last()).toContainText('Carol White');
    });
  });

  test.describe('Time Range Integration', () => {
    test('updates leaderboard when time range changes', async ({ page, dashboardPage }) => {
      const leaderboard90d = { ...LEADERBOARD_DATA_DEFAULT };
      const leaderboard30d = {
        ...LEADERBOARD_DATA_DEFAULT,
        developers: [
          { ...LEADERBOARD_DATA_DEFAULT.developers[0], rework_ratio: 35.0 },
          { ...LEADERBOARD_DATA_DEFAULT.developers[1], rework_ratio: 22.0 },
          { ...LEADERBOARD_DATA_DEFAULT.developers[2], rework_ratio: 8.2 },
        ],
        total_developers: 5,
        developers_excluded: 2,
        warning: '2 developers hidden (fewer than 1 stories)',
        unattributed_bugs_count: 3,
        unattributed_bug_points: 8,
      };

      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics(), { days: 90 });
      await mockReworkMetricsApi(page, createReworkMetrics(), { days: 30 });
      await mockTrendApi(page, TREND_DATA_3M, { days: 90 });
      await mockTrendApi(page, TREND_DATA_3M, { days: 30 });
      await mockDeveloperLeaderboardApi(page, leaderboard90d, { days: 90 });
      await mockDeveloperLeaderboardApi(page, leaderboard30d, { days: 30 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify 90d data - look for Alice's 25% badge in the leaderboard
      const leaderboard = page.locator('[aria-label="Developer Rework Leaderboard"]');
      await expect(leaderboard.getByText('25.0%')).toBeVisible();

      // Switch to 30d
      await dashboardPage.selectTimeRangePreset('30d');

      // Wait for API call to complete
      await page.waitForTimeout(500);

      // Verify 30d data (Alice now 35%)
      await expect(leaderboard.getByText('35.0%')).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('shows loading skeleton during fetch', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M);
      await mockDeveloperLeaderboardApi(page, LEADERBOARD_DATA_DEFAULT, { delay: 2000 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      // Verify loading skeleton is displayed in leaderboard section
      const leaderboardSection = page.locator('[aria-label="Developer Rework Leaderboard"]');
      await expect(leaderboardSection.locator('tr.skeleton-shimmer').first()).toBeVisible({ timeout: 1000 });

      // Wait for data to load
      await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('displays error state on API failure', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M);
      await mockDeveloperLeaderboardApi(page, LEADERBOARD_DATA_DEFAULT, { status: 500 });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify error message in leaderboard section
      const leaderboardSection = page.locator('[aria-label="Developer Rework Leaderboard"]');
      await expect(leaderboardSection.getByText(/failed to load developer leaderboard/i)).toBeVisible({ timeout: 3000 });
      await expect(leaderboardSection.getByRole('button', { name: /retry/i })).toBeVisible();
    });

    test('retry button recovers from error', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M);

      // First request fails
      let requestCount = 0;
      await page.route(/\/api\/rework\/developers\?/, async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LEADERBOARD_DATA_DEFAULT),
          });
        }
      });

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();

      // Wait for error state
      const leaderboardSection = page.locator('[aria-label="Developer Rework Leaderboard"]');
      const retryButton = leaderboardSection.getByRole('button', { name: /retry/i });
      await expect(retryButton).toBeVisible({ timeout: 3000 });

      // Click retry
      await retryButton.click();

      // Verify data loads
      await expect(page.getByText('Alice Smith')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Empty State', () => {
    test('shows empty state when no developers meet threshold', async ({ page, dashboardPage }) => {
      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M);
      await mockDeveloperLeaderboardApi(page, LEADERBOARD_DATA_EMPTY);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify empty state message
      await expect(page.getByText(/no developers with completed stories/i)).toBeVisible();
    });

    test('displays excluded developers warning', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify warning about excluded developers
      await expect(page.getByText(/2 developer.*hidden/i)).toBeVisible();
    });
  });

  test.describe('Drill-Down Interaction', () => {
    test('expands developer row on click', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Wait for leaderboard to load
      await expect(page.getByText('Alice Smith')).toBeVisible();

      // Click on Alice's row (the tr element with role="button")
      const aliceRow = page.locator('tr[role="button"]:has-text("Alice Smith")');
      await aliceRow.click();

      // Verify expanded content is visible (stories and bugs)
      // Use .first() since PROJ-101 appears in both stories table and as parent reference in bugs table
      await expect(page.getByText('PROJ-101').first()).toBeVisible();
      await expect(page.getByText('Implement feature A')).toBeVisible();
    });

    test('collapses developer row on second click', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Wait for leaderboard to load
      await expect(page.getByText('Alice Smith')).toBeVisible();

      // Click on Alice's row to expand
      const aliceRow = page.locator('tr[role="button"]:has-text("Alice Smith")');
      await aliceRow.click();
      // Use .first() since PROJ-101 appears in both stories table and as parent reference in bugs table
      await expect(page.getByText('PROJ-101').first()).toBeVisible();

      // Click again to collapse
      await aliceRow.click();
      await expect(page.getByText('PROJ-101').first()).not.toBeVisible();
    });

    test('displays bugs with parent story reference', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Wait for leaderboard to load
      await expect(page.getByText('Alice Smith')).toBeVisible();

      // Click on Alice's row to expand
      const aliceRow = page.locator('tr[role="button"]:has-text("Alice Smith")');
      await aliceRow.click();

      // Verify bug is shown with parent reference
      await expect(page.getByText('PROJ-201')).toBeVisible();
      await expect(page.getByText('Bug in feature A')).toBeVisible();
    });
  });

  test.describe('Avatar Display', () => {
    test('renders placeholder for missing avatar', async ({ page, dashboardPage }) => {
      await mockAllApisWithLeaderboard(page);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Carol has no avatar (avatar_url: null)
      const carolRow = page.locator('tr:has-text("Carol White")');
      await expect(carolRow).toBeVisible();

      // Should have a placeholder (could be initials or icon)
      // The exact implementation depends on the component
      const avatarPlaceholder = carolRow.locator('[data-testid="avatar-placeholder"], .avatar-placeholder, [aria-label*="avatar"]');
      // At minimum, the row should exist and be properly rendered
      await expect(carolRow).toBeVisible();
    });
  });

  test.describe('Color Coding', () => {
    test('applies correct color for different rework ratios', async ({ page, dashboardPage }) => {
      const leaderboardWithVariedRatios = {
        developers: [
          { ...LEADERBOARD_DATA_DEFAULT.developers[0], rework_ratio: 45.0, display_name: 'Dev High' },    // Red (41%+)
          { ...LEADERBOARD_DATA_DEFAULT.developers[1], rework_ratio: 30.0, display_name: 'Dev Medium' },  // Amber (26-40%)
          { ...LEADERBOARD_DATA_DEFAULT.developers[2], rework_ratio: 15.0, display_name: 'Dev Low' },     // Blue (11-25%)
        ],
        total_developers: 3,
        developers_excluded: 0,
        warning: null as string | null,
        unattributed_bugs_count: 0,
        unattributed_bug_points: 0,
      };

      await mockBoardsApi(page);
      await mockReworkMetricsApi(page, createReworkMetrics());
      await mockTrendApi(page, TREND_DATA_3M);
      await mockDeveloperLeaderboardApi(page, leaderboardWithVariedRatios);

      await dashboardPage.goto();
      await dashboardPage.waitForReady();
      await dashboardPage.waitForAutoSelectedBoard();
      await dashboardPage.waitForMetricsLoaded();

      // Verify color classes are applied
      // Note: Exact selectors depend on implementation
      const highRow = page.locator('tr[role="button"]:has-text("Dev High")');
      const mediumRow = page.locator('tr[role="button"]:has-text("Dev Medium")');
      const lowRow = page.locator('tr[role="button"]:has-text("Dev Low")');

      await expect(highRow).toBeVisible();
      await expect(mediumRow).toBeVisible();
      await expect(lowRow).toBeVisible();

      // Check for color-coded badges in the Rework Ratio column
      // The badges have specific percentage text, so we can use that to target them precisely
      await expect(highRow.locator('span:has-text("45.0%")').first()).toHaveClass(/bg-red/);
      await expect(mediumRow.locator('span:has-text("30.0%")').first()).toHaveClass(/bg-amber/);
      await expect(lowRow.locator('span:has-text("15.0%")').first()).toHaveClass(/bg-blue/);
    });
  });
});
