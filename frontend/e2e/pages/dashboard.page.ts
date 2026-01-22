/**
 * Page Object Model for Rework Dashboard
 *
 * Following Playwright best practices:
 * - Use built-in locators (getByRole, getByText, getByLabel)
 * - Encapsulate page interactions
 * - Provide meaningful method names
 * - Avoid implementation details in locators
 */

import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // Main page elements
  readonly heading: Locator;
  readonly boardSelector: Locator;
  readonly timeRangeSlider: Locator;
  readonly timeRangeValue: Locator;

  // Rework ratio card
  readonly reworkRatioCard: Locator;
  readonly contextText: Locator;

  // Context widgets (using actual UI labels)
  readonly storiesWidget: Locator;      // "Completed" in UI
  readonly bugsWidget: Locator;         // "Bugs Fixed" in UI
  readonly spDeliveredWidget: Locator;  // "Delivered" in UI
  readonly reworkPointsWidget: Locator; // "Rework" in UI

  // Trend chart
  readonly trendChartRegion: Locator;
  readonly chartContainer: Locator;

  // Modal
  readonly modal: Locator;
  readonly searchInput: Locator;

  // Error and loading states
  readonly errorMessage: Locator;
  readonly warningBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main page elements using accessible locators
    this.heading = page.getByRole('heading', { name: 'Rework Dashboard' });
    this.boardSelector = page.locator('#board-search');
    this.timeRangeSlider = page.locator('#time-range-slider');
    this.timeRangeValue = page.getByText(/\d+ days/);

    // Rework ratio card - use aria-label patterns
    this.reworkRatioCard = page.locator('[aria-label*="defect rate"]').first();
    this.contextText = page.getByText(/of effort went to bug fixes/);

    // Context widgets using role-based locators (using actual UI labels)
    this.storiesWidget = page.getByRole('status', { name: /completed:/i });
    this.bugsWidget = page.getByRole('status', { name: /bugs fixed:/i });
    this.spDeliveredWidget = page.getByRole('status', { name: /delivered:/i });
    this.reworkPointsWidget = page.getByRole('status', { name: /^rework:/i });

    // Trend chart
    this.trendChartRegion = page.getByRole('region', { name: /work breakdown trend/i });
    this.chartContainer = this.trendChartRegion.locator('.recharts-wrapper');

    // Modal
    this.modal = page.getByRole('dialog');
    this.searchInput = page.getByPlaceholder('Search by key or summary...');

    // Error and loading states
    this.errorMessage = page.getByText('Unable to load metrics');
    this.warningBanner = page.getByRole('button', { name: /items excluded due to missing story points/i });
  }

  /**
   * Navigate to dashboard page
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
  }

  /**
   * Wait for dashboard to be ready (heading visible)
   */
  async waitForReady(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  /**
   * Wait for metrics to load (defect rate visible)
   */
  async waitForMetricsLoaded(expectedRatio?: number): Promise<void> {
    if (expectedRatio !== undefined) {
      await expect(
        this.page.getByRole('status', { name: new RegExp(`defect rate: ${expectedRatio} percent`, 'i') })
      ).toBeVisible();
    } else {
      await expect(this.page.getByRole('status', { name: /defect rate: \d+ percent/i })).toBeVisible();
    }
  }

  /**
   * Select a time range by setting slider value
   */
  async selectTimeRange(days: number): Promise<void> {
    await this.timeRangeSlider.fill(String(days));
    // Trigger change event by pressing Tab or Enter
    await this.timeRangeSlider.press('Tab');
  }

  /**
   * Click preset label to set time range
   */
  async selectTimeRangePreset(label: '30d' | '60d' | '90d' | '180d'): Promise<void> {
    const days = parseInt(label.replace('d', ''), 10);
    await this.page.getByRole('button', { name: `Set to ${days} days` }).click();
  }

  /**
   * Verify time range value is displayed
   */
  async expectTimeRangeValue(days: number): Promise<void> {
    await expect(this.page.getByText(`${days} days`)).toBeVisible();
  }

  /**
   * Select a board from dropdown (when board selector is enabled)
   */
  async selectBoard(boardName: string): Promise<void> {
    await this.boardSelector.click();
    await this.page.getByRole('option', { name: boardName }).click();
  }

  /**
   * Wait for auto-selected board to load
   */
  async waitForAutoSelectedBoard(): Promise<void> {
    await expect(this.page.getByText('My Project')).toBeVisible();
  }

  /**
   * Get defect rate value from the card
   */
  async getDefectRate(): Promise<number> {
    const match = await this.reworkRatioCard.getAttribute('aria-label');
    const rateMatch = match?.match(/defect rate: (\d+) percent/i);
    return rateMatch ? parseInt(rateMatch[1], 10) : 0;
  }

  /**
   * Open issues modal by clicking on a widget
   */
  async openStoriesModal(): Promise<void> {
    await this.storiesWidget.click();
  }

  async openBugsModal(): Promise<void> {
    await this.bugsWidget.click();
  }

  /**
   * Close the modal
   */
  async closeModal(): Promise<void> {
    await this.page.getByRole('button', { name: 'Close', exact: true }).click();
  }

  /**
   * Filter issues in modal
   */
  async filterIssues(searchText: string): Promise<void> {
    await this.searchInput.fill(searchText);
  }

  /**
   * Wait for trend chart to load
   */
  async waitForTrendChartLoaded(): Promise<void> {
    await expect(this.trendChartRegion).toBeVisible();
    // Wait for skeleton to disappear
    await expect(this.trendChartRegion.locator('[class*="skeleton"]')).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Hover over chart at a specific position (percentage from left)
   */
  async hoverChartAtPosition(percentFromLeft: number): Promise<void> {
    await this.page.evaluate((percent) => {
      const chart = document.querySelector('.recharts-wrapper');
      if (chart) {
        const rect = chart.getBoundingClientRect();
        const event = new MouseEvent('mousemove', {
          clientX: rect.left + rect.width * (percent / 100),
          clientY: rect.top + rect.height * 0.5,
          bubbles: true,
        });
        chart.dispatchEvent(event);
      }
    }, percentFromLeft);
  }

  /**
   * Get tooltip text from chart
   */
  async getChartTooltipText(): Promise<string> {
    const tooltip = this.page.locator('[class*="recharts-tooltip"], [role="tooltip"]').first();
    const text = await tooltip.textContent();
    return text ?? '';
  }

  /**
   * Verify tooltip contains week label
   */
  async expectTooltipShowsWeek(weekLabel: string): Promise<void> {
    await expect(this.page.getByText(weekLabel)).toBeVisible();
  }

  /**
   * Check if loading skeleton is visible
   */
  async isLoadingSkeletonVisible(): Promise<boolean> {
    return await this.page.locator('[class*="skeleton"]').first().isVisible();
  }

  /**
   * Verify warning banner with excluded items
   */
  async expectWarningBanner(excludedCount: number): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: new RegExp(`${excludedCount} items excluded`, 'i') })
    ).toBeVisible();
  }

  /**
   * Verify no warning banner is displayed
   */
  async expectNoWarningBanner(): Promise<void> {
    await expect(this.page.getByText(/items excluded due to missing story points/i)).not.toBeVisible();
  }

  /**
   * Verify error message is displayed
   */
  async expectErrorMessage(): Promise<void> {
    await expect(this.errorMessage).toBeVisible({ timeout: 3000 });
  }

  /**
   * Click retry button in trend chart
   */
  async clickRetryButton(): Promise<void> {
    await this.trendChartRegion.getByRole('button', { name: /retry/i }).click();
  }

  /**
   * Verify no boards available message
   */
  async expectNoBoardsMessage(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /no boards available/i })).toBeVisible();
  }
}
