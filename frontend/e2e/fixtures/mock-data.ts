/**
 * Shared mock data for E2E tests
 *
 * Centralized mock data following Playwright best practices:
 * - Single source of truth for test data
 * - Factory functions for customizable mock data
 * - Type-safe data structures
 */

export interface Board {
  id: number;
  name: string;
}

export interface Bug {
  key: string;
  summary: string;
  story_points: number | null;
}

export interface Story {
  key: string;
  summary: string;
  story_points: number | null;
}

export interface ReworkMetrics {
  rework_ratio: number;
  stories_analyzed: number;
  bugs_linked: number;
  story_points_delivered: number;
  rework_points: number;
  items_excluded: number;
  warning: string | null;
  bugs: Bug[];
  stories: Story[];
}

export interface WeekData {
  week_start_date: string;
  rework_ratio: number;
  rework_points: number;
  delivered_points: number;
  bugs_count: number;
  stories_count: number;
}

export interface TrendData {
  weeks: WeekData[];
  total_weeks?: number;
  items_excluded?: number;
  warning?: string | null;
}

/**
 * Default boards list - includes the auto-selected board name
 * The dashboard auto-selects "ImaGenAItion Labs" and displays it as "My Project"
 */
export const DEFAULT_BOARDS: Board[] = [
  { id: 1, name: 'ImaGenAItion Labs' }, // Auto-selected by dashboard
  { id: 2, name: 'Kanban Board' },
  { id: 3, name: 'Team Board' },
];

/**
 * Factory function to create rework metrics
 */
export function createReworkMetrics(overrides: Partial<ReworkMetrics> = {}): ReworkMetrics {
  return {
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
    ...overrides,
  };
}

/**
 * Factory function to create metrics with missing data warning
 */
export function createMetricsWithWarning(excludedCount: number = 5): ReworkMetrics {
  return createReworkMetrics({
    rework_ratio: 15,
    stories_analyzed: 40,
    bugs_linked: 20,
    story_points_delivered: 90,
    rework_points: 13,
    items_excluded: excludedCount,
    warning: `${excludedCount} items excluded due to missing story points`,
    bugs: [
      { key: 'BUG-10', summary: 'Bug without story points', story_points: null },
      { key: 'BUG-11', summary: 'Bug with story points', story_points: 2 },
    ],
    stories: [
      { key: 'STORY-10', summary: 'Story without story points', story_points: null },
      { key: 'STORY-11', summary: 'Story with story points', story_points: 8 },
    ],
  });
}

/**
 * Factory function to create week data
 */
export function createWeekData(weekStartDate: string, overrides: Partial<WeekData> = {}): WeekData {
  return {
    week_start_date: weekStartDate,
    rework_ratio: 12,
    rework_points: 10,
    delivered_points: 83,
    bugs_count: 5,
    stories_count: 13,
    ...overrides,
  };
}

/**
 * Generate trend data for a specified number of weeks
 */
export function createTrendData(weeks: WeekData[], overrides: Partial<TrendData> = {}): TrendData {
  return {
    weeks,
    total_weeks: weeks.length,
    items_excluded: 0,
    warning: null,
    ...overrides,
  };
}

/**
 * Pre-built trend data for 3 months (12 weeks)
 */
export const TREND_DATA_3M: TrendData = createTrendData([
  createWeekData('2025-10-06', { rework_ratio: 10, rework_points: 8, delivered_points: 80 }),
  createWeekData('2025-10-13', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-10-20', { rework_ratio: 15, rework_points: 12, delivered_points: 80 }),
  createWeekData('2025-10-27', { rework_ratio: 11, rework_points: 9, delivered_points: 82 }),
  createWeekData('2025-11-03', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
  createWeekData('2025-11-10', { rework_ratio: 14, rework_points: 12, delivered_points: 86 }),
  createWeekData('2025-11-17', { rework_ratio: 10, rework_points: 8, delivered_points: 80 }),
  createWeekData('2025-11-24', { rework_ratio: 16, rework_points: 13, delivered_points: 81 }),
  createWeekData('2025-12-01', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-12-08', { rework_ratio: 14, rework_points: 11, delivered_points: 79 }),
  createWeekData('2025-12-15', { rework_ratio: 15, rework_points: 12, delivered_points: 80 }),
  createWeekData('2025-12-22', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
]);

/**
 * Pre-built trend data for 1 month (4 weeks)
 */
export const TREND_DATA_1M: TrendData = createTrendData([
  createWeekData('2025-12-01', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-12-08', { rework_ratio: 14, rework_points: 11, delivered_points: 79 }),
  createWeekData('2025-12-15', { rework_ratio: 15, rework_points: 12, delivered_points: 80 }),
  createWeekData('2025-12-22', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
]);

/**
 * Pre-built trend data for 6 months (26 weeks)
 */
export const TREND_DATA_6M: TrendData = createTrendData([
  createWeekData('2025-06-30', { rework_ratio: 8, rework_points: 6, delivered_points: 75 }),
  createWeekData('2025-07-07', { rework_ratio: 10, rework_points: 8, delivered_points: 80 }),
  createWeekData('2025-07-14', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-07-21', { rework_ratio: 11, rework_points: 9, delivered_points: 82 }),
  createWeekData('2025-07-28', { rework_ratio: 9, rework_points: 7, delivered_points: 78 }),
  createWeekData('2025-08-04', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
  createWeekData('2025-08-11', { rework_ratio: 14, rework_points: 12, delivered_points: 86 }),
  createWeekData('2025-08-18', { rework_ratio: 10, rework_points: 8, delivered_points: 80 }),
  createWeekData('2025-08-25', { rework_ratio: 16, rework_points: 13, delivered_points: 81 }),
  createWeekData('2025-09-01', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-09-08', { rework_ratio: 14, rework_points: 11, delivered_points: 79 }),
  createWeekData('2025-09-15', { rework_ratio: 15, rework_points: 12, delivered_points: 80 }),
  createWeekData('2025-09-22', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
  createWeekData('2025-09-29', { rework_ratio: 11, rework_points: 9, delivered_points: 82 }),
  createWeekData('2025-10-06', { rework_ratio: 10, rework_points: 8, delivered_points: 80 }),
  createWeekData('2025-10-13', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-10-20', { rework_ratio: 15, rework_points: 12, delivered_points: 80 }),
  createWeekData('2025-10-27', { rework_ratio: 11, rework_points: 9, delivered_points: 82 }),
  createWeekData('2025-11-03', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
  createWeekData('2025-11-10', { rework_ratio: 14, rework_points: 12, delivered_points: 86 }),
  createWeekData('2025-11-17', { rework_ratio: 10, rework_points: 8, delivered_points: 80 }),
  createWeekData('2025-11-24', { rework_ratio: 16, rework_points: 13, delivered_points: 81 }),
  createWeekData('2025-12-01', { rework_ratio: 12, rework_points: 10, delivered_points: 83 }),
  createWeekData('2025-12-08', { rework_ratio: 14, rework_points: 11, delivered_points: 79 }),
  createWeekData('2025-12-15', { rework_ratio: 15, rework_points: 12, delivered_points: 80 }),
  createWeekData('2025-12-22', { rework_ratio: 13, rework_points: 11, delivered_points: 85 }),
]);
