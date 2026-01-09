'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
  Legend,
  ReferenceLine,
} from 'recharts';
import { getReworkTrend, type TrendTimeRange, type WeeklyDataPoint } from '@/lib/api';

/**
 * Calculate 4-week moving average for the data
 */
function calculateMovingAverage(data: ChartDataPoint[], window: number = 4): ChartDataPoint[] {
  return data.map((point, index) => {
    if (index < window - 1) {
      // Not enough data points yet - use average of available points
      const available = data.slice(0, index + 1);
      const sum = available.reduce((acc, p) => acc + p.rework_ratio, 0);
      return { ...point, movingAverage: Math.round(sum / available.length * 10) / 10 };
    }

    // Calculate moving average of last `window` points
    const windowData = data.slice(index - window + 1, index + 1);
    const sum = windowData.reduce((acc, p) => acc + p.rework_ratio, 0);
    return { ...point, movingAverage: Math.round(sum / window * 10) / 10 };
  });
}

/**
 * Determine trend direction based on moving average
 */
function getTrendDirection(data: ChartDataPoint[]): { direction: 'improving' | 'stable' | 'degrading'; change: number } {
  if (data.length < 4) return { direction: 'stable', change: 0 };

  const recentAvg = data.slice(-4).reduce((acc, p) => acc + (p.movingAverage || 0), 0) / 4;
  const olderAvg = data.slice(0, 4).reduce((acc, p) => acc + (p.movingAverage || 0), 0) / 4;

  const change = Math.round((recentAvg - olderAvg) * 10) / 10;

  if (change < -5) return { direction: 'improving', change };
  if (change > 5) return { direction: 'degrading', change };
  return { direction: 'stable', change };
}

/**
 * InfoTooltip Component
 * Displays an info icon with hover tooltip explaining the rework ratio trend
 */
function InfoTooltip() {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors"
        onMouseEnter={() => setShowHint(true)}
        onMouseLeave={() => setShowHint(false)}
        onFocus={() => setShowHint(true)}
        onBlur={() => setShowHint(false)}
        onClick={() => setShowHint(!showHint)}
        aria-label="Info about Defect Rate"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {showHint && (
        <div className="absolute z-20 left-0 top-full mt-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl animate-fade-in">
          <p className="font-semibold mb-2">What is Defect Rate?</p>
          <p className="text-gray-300 mb-2">
            <span className="font-mono bg-gray-800 px-1 rounded">(Rework ÷ Delivered) × 100%</span>
          </p>
          <p className="text-gray-300 mb-3">
            Measures the percentage of team effort spent on fixing bugs compared to delivering new work. Lower is better.
          </p>
          <p className="font-semibold mb-1">Why can it exceed 100%?</p>
          <p className="text-gray-300">
            When more bug fixes are completed than features in a given week. This usually indicates a maintenance-focused sprint, not necessarily a quality issue.
          </p>
          <div className="absolute left-4 bottom-full w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
}

/**
 * Props for the ReworkTrendChart component
 */
export interface ReworkTrendChartProps {
  boardId: number;
  className?: string;
}

/**
 * Type for chart data with formatted week label and moving average
 */
interface ChartDataPoint extends WeeklyDataPoint {
  weekLabel: string;
  movingAverage?: number;
}

/**
 * Format date string to readable week label (e.g., "Jan 6")
 */
function formatWeekLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format date string to full week label for tooltip (e.g., "Week of Jan 6, 2026")
 */
function formatFullWeekLabel(dateString: string): string {
  const date = new Date(dateString);
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/**
 * Custom tooltip component for the chart
 * Displays detailed information about a week when hovering over a data point
 */
function CustomTooltip(props: TooltipProps<number, string>) {
  const { active, payload } = props as {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
  };

  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transition-colors min-w-[200px]">
      {/* Week label */}
      <p className="font-semibold text-gray-900 dark:text-white mb-3">
        {formatFullWeekLabel(data.week_start_date)}
      </p>

      {/* Trend (Moving Average) - Primary metric */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">4-Week Average:</span>
          <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">
            {(data.movingAverage ?? data.rework_ratio).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Moving average smooths weekly fluctuations
        </p>
      </div>

      {/* Weekly Defect Rate - Secondary */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Weekly Rate:</span>
          <span className="font-semibold text-blue-400 dark:text-blue-300">
            {data.rework_ratio.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Points breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Rework:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.rework_points} pts
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              ({data.bugs_count} {data.bugs_count === 1 ? 'bug' : 'bugs'})
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Delivered:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.delivered_points} pts
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              ({data.stories_count} {data.stories_count === 1 ? 'item' : 'items'})
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * ReworkTrendChart Component
 *
 * Displays a line chart showing the rework ratio trend over time.
 * Features:
 * - Time range selector (1 month, 3 months, 6 months)
 * - Interactive line chart with tooltips
 * - Responsive container that adapts to parent width
 * - Dark/light theme support
 * - Fetches data from backend API
 * - Loading and error states
 *
 * @param boardId - The ID of the selected Jira board
 * @param className - Optional additional CSS classes
 */
export default function ReworkTrendChart({
  boardId,
  className = '',
}: ReworkTrendChartProps) {
  const [selectedRange, setSelectedRange] = useState<TrendTimeRange>(3);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch trend data when boardId, selectedRange, or retryCount changes
  useEffect(() => {
    let isMounted = true;

    async function fetchTrendData() {
      setLoading(true);
      setError(null);

      try {
        const response = await getReworkTrend(boardId, selectedRange);

        if (!isMounted) return;

        // Format data for chart with week labels
        const formatted: ChartDataPoint[] = response.weeks.map((item) => ({
          ...item,
          weekLabel: formatWeekLabel(item.week_start_date),
        }));

        // Calculate 4-week moving average for trend line
        const withMovingAverage = calculateMovingAverage(formatted);

        setChartData(withMovingAverage);
      } catch (err) {
        if (!isMounted) return;

        setError('Failed to load rework trend data');
        console.error('Error fetching rework trend:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTrendData();

    return () => {
      isMounted = false;
    };
  }, [boardId, selectedRange, retryCount]);

  // Retry function to refetch data
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div
      className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors ${className}`}
      role="region"
      aria-label="Defect Rate Trend"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Defect Rate Trend
          </h2>
          <InfoTooltip />
          {/* Trend Direction Indicator */}
          {!loading && !error && chartData.length >= 4 && (() => {
            const trend = getTrendDirection(chartData);
            const trendConfig = {
              improving: {
                bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                text: 'text-emerald-700 dark:text-emerald-400',
                icon: '↓',
                label: 'Improving',
              },
              stable: {
                bg: 'bg-gray-100 dark:bg-gray-700',
                text: 'text-gray-700 dark:text-gray-300',
                icon: '→',
                label: 'Stable',
              },
              degrading: {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                icon: '↑',
                label: 'Needs Attention',
              },
            };
            const config = trendConfig[trend.direction];
            return (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text} flex items-center gap-1`}
                title={`Change: ${trend.change > 0 ? '+' : ''}${trend.change}%`}
              >
                <span className="font-bold">{config.icon}</span>
                {config.label}
              </span>
            );
          })()}
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {([1, 3, 6] as TrendTimeRange[]).map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => setSelectedRange(months)}
              aria-pressed={selectedRange === months}
              disabled={loading}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  selectedRange === months
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {months === 1 ? '1m' : months === 3 ? '3m' : '6m'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="animate-pulse skeleton-shimmer">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-[400px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <svg
              className="h-12 w-12 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="space-y-2">
              <p className="text-red-700 dark:text-red-400 font-semibold">
                Unable to load trend data. Please try again.
              </p>
              <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      {!loading && !error && chartData.length > 0 && (
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: 'currentColor' }}
                className="text-gray-600 dark:text-gray-400"
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'currentColor' }}
                className="text-gray-600 dark:text-gray-400"
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value: string) => (
                  <span className="text-gray-700 dark:text-gray-300">{value}</span>
                )}
              />
              {/* Weekly data - lighter, dashed line */}
              <Line
                type="monotone"
                dataKey="rework_ratio"
                name="Weekly Rate"
                stroke="#93c5fd"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#93c5fd', r: 3 }}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
              {/* 4-week moving average - prominent solid line */}
              <Line
                type="monotone"
                dataKey="movingAverage"
                name="4-Week Average"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6, fill: '#059669' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && chartData.length === 0 && (
        <div className="w-full h-[400px] flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="font-semibold">No trend data available</p>
            <p className="text-sm mt-2">Try selecting a different time range</p>
          </div>
        </div>
      )}
    </div>
  );
}
