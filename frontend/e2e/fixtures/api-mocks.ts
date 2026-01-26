/**
 * API Mocking Utilities for E2E Tests
 *
 * Centralized API mocking following Playwright best practices:
 * - Reusable mock functions
 * - Consistent response handling
 * - Support for delays and errors
 */

import { type Page } from '@playwright/test';
import {
  type Board,
  type ReworkMetrics,
  type TrendData,
  DEFAULT_BOARDS,
  createReworkMetrics,
  TREND_DATA_3M,
} from './mock-data';

export interface MockApiOptions {
  delay?: number;
  status?: number;
}

/**
 * Mock the boards API endpoint
 */
export async function mockBoardsApi(
  page: Page,
  boards: Board[] = DEFAULT_BOARDS,
  options: MockApiOptions = {}
): Promise<void> {
  const { delay = 0, status = 200 } = options;

  await page.route('**/api/boards', async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ boards }),
    });
  });
}

/**
 * Mock the rework metrics API endpoint
 * Uses regex matching for flexible query parameter handling
 */
export async function mockReworkMetricsApi(
  page: Page,
  metrics: ReworkMetrics = createReworkMetrics(),
  options: MockApiOptions & { boardId?: number | string; days?: number | string } = {}
): Promise<void> {
  const { delay = 0, status = 200, boardId, days } = options;

  await page.route(/\/api\/rework\?/, async (route) => {
    const url = route.request().url();

    // If specific boardId/days are requested, check if URL matches
    if (boardId !== undefined && !url.includes(`board_id=${boardId}`)) {
      return route.fallback();
    }
    if (days !== undefined && !url.includes(`days=${days}`)) {
      return route.fallback();
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? metrics : { error: 'Internal server error' }),
    });
  });
}

/**
 * Mock the rework trend API endpoint
 * Uses regex matching for flexible query parameter handling
 */
export async function mockTrendApi(
  page: Page,
  trendData: TrendData = TREND_DATA_3M,
  options: MockApiOptions & { boardId?: number | string; days?: number | string } = {}
): Promise<void> {
  const { delay = 0, status = 200, boardId, days } = options;

  await page.route(/\/api\/rework\/trend\?/, async (route) => {
    const url = route.request().url();

    // If specific boardId/days are requested, check if URL matches
    if (boardId !== undefined && !url.includes(`board_id=${boardId}`)) {
      return route.fallback();
    }
    if (days !== undefined && !url.includes(`days=${days}`)) {
      return route.fallback();
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 200 ? trendData : { error: 'Internal server error' }),
    });
  });
}

/**
 * Mock all API endpoints with default data for basic tests
 */
export async function mockAllApis(
  page: Page,
  options: {
    boards?: Board[];
    metrics?: ReworkMetrics;
    trendData?: TrendData;
  } = {}
): Promise<void> {
  const { boards, metrics, trendData } = options;

  await Promise.all([
    mockBoardsApi(page, boards),
    mockReworkMetricsApi(page, metrics),
    mockTrendApi(page, trendData),
  ]);
}

/**
 * Mock session expiry (401 response) for all rework endpoints
 */
export async function mockSessionExpiry(page: Page): Promise<void> {
  await page.route(/\/api\/rework\?/, async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    });
  });
}
