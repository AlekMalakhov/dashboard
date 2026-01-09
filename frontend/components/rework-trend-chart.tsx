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
} from 'recharts';
import { getReworkTrend, type TrendTimeRange, type WeeklyDataPoint } from '@/lib/api';

/**
 * Props for the ReworkTrendChart component
 */
export interface ReworkTrendChartProps {
  boardId: number;
  className?: string;
}

/**
 * Type for chart data with formatted week label
 */
interface ChartDataPoint extends WeeklyDataPoint {
  weekLabel: string;
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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transition-colors">
      {/* Week label */}
      <p className="font-semibold text-gray-900 dark:text-white mb-3">
        {formatFullWeekLabel(data.week_start_date)}
      </p>

      {/* Metrics */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Rework Ratio:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {data.rework_ratio.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Rework Points:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.rework_points}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Delivered Points:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.delivered_points}
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

        setChartData(formatted);
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
      aria-label="Rework Ratio Trend"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Rework Ratio Trend
        </h2>

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
              <Line
                type="monotone"
                dataKey="rework_ratio"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6, fill: '#2563eb' }}
                className="recharts-line"
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
