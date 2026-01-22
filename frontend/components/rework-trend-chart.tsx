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
} from 'recharts';
import { getReworkTrend, type TrendTimeRange, type WeeklyDataPoint } from '@/lib/api';

/**
 * InfoTooltip Component
 * Displays an info icon with hover tooltip explaining the chart
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
        aria-label="Info about Work Breakdown"
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
          <p className="font-semibold mb-2">How to read this chart</p>
          <p className="text-gray-300 mb-3">
            Each line shows Story Points completed per week:
          </p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-300"><strong>Delivered</strong> — new features, stories, tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-300"><strong>Rework</strong> — bug fixes</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs">
            Ideally, blue should dominate. More red = more time fixing bugs.
          </p>
          <div className="absolute left-4 bottom-full w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
}

/**
 * Convert arbitrary days to nearest valid months for the trend API
 * Maps: 7-45 days -> 1 month, 46-75 days -> 2 months, 76-135 days -> 3 months, 136-180 days -> 6 months
 */
function daysToMonths(days: number): TrendTimeRange {
  if (days <= 45) return 1;
  if (days <= 75) return 2;
  if (days <= 135) return 3;
  return 6;
}

/**
 * Props for the ReworkTrendChart component
 */
export interface ReworkTrendChartProps {
  boardId: number;
  timeRange: number;
  className?: string;
}

/**
 * Type for chart data with formatted week label
 */
interface ChartDataPoint extends WeeklyDataPoint {
  weekLabel: string;
  total_points: number;
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
  const defectRate = data.delivered_points > 0
    ? Math.round((data.rework_points / data.delivered_points) * 1000) / 10
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 transition-colors min-w-[220px]">
      {/* Week label */}
      <p className="font-semibold text-gray-900 dark:text-white mb-3">
        {formatFullWeekLabel(data.week_start_date)}
      </p>

      {/* Defect Rate */}
      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-600 dark:text-gray-400">Defect Rate:</span>
          <span className={`font-bold text-lg ${
            defectRate <= 25 ? 'text-emerald-600 dark:text-emerald-400' :
            defectRate <= 50 ? 'text-blue-600 dark:text-blue-400' :
            defectRate <= 75 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {defectRate}%
          </span>
        </div>
      </div>

      {/* Points breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Delivered:</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.delivered_points} pts
            <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">
              ({data.stories_count} {data.stories_count === 1 ? 'item' : 'items'})
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Rework:</span>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {data.rework_points} pts
            <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">
              ({data.bugs_count} {data.bugs_count === 1 ? 'bug' : 'bugs'})
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Total:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {data.total_points} pts
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Determine overall trend based on recent vs older defect rates
 */
function getTrendDirection(data: ChartDataPoint[]): { direction: 'improving' | 'stable' | 'degrading'; change: number } {
  if (data.length < 4) return { direction: 'stable', change: 0 };

  // Calculate average defect rate for recent 4 weeks vs older 4 weeks
  const calcAvgRate = (slice: ChartDataPoint[]) => {
    const totalDelivered = slice.reduce((acc, p) => acc + p.delivered_points, 0);
    const totalRework = slice.reduce((acc, p) => acc + p.rework_points, 0);
    return totalDelivered > 0 ? (totalRework / totalDelivered) * 100 : 0;
  };

  const recentRate = calcAvgRate(data.slice(-4));
  const olderRate = calcAvgRate(data.slice(0, Math.min(4, data.length - 4)));

  const change = Math.round((recentRate - olderRate) * 10) / 10;

  if (change < -10) return { direction: 'improving', change };
  if (change > 10) return { direction: 'degrading', change };
  return { direction: 'stable', change };
}

/**
 * ReworkTrendChart Component
 *
 * Displays a dual line chart showing work breakdown over time.
 * Blue line = Delivered (features), Red line = Rework (bug fixes)
 */
export default function ReworkTrendChart({
  boardId,
  timeRange,
  className = '',
}: ReworkTrendChartProps) {
  const months = daysToMonths(timeRange);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch trend data when boardId, months, or retryCount changes
  useEffect(() => {
    let isMounted = true;

    async function fetchTrendData() {
      setLoading(true);
      setError(null);

      try {
        const response = await getReworkTrend(boardId, months);

        if (!isMounted) return;

        // Format data for chart with week labels and total points
        const formatted: ChartDataPoint[] = response.weeks.map((item) => ({
          ...item,
          weekLabel: formatWeekLabel(item.week_start_date),
          total_points: item.delivered_points + item.rework_points,
        }));

        setChartData(formatted);
      } catch (err) {
        if (!isMounted) return;

        setError('Failed to load trend data');
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
  }, [boardId, months, retryCount]);

  // Retry function to refetch data
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  return (
    <div
      className={`p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors ${className}`}
      role="region"
      aria-label="Work Breakdown Trend"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Work Breakdown
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
                label: 'Less bugs',
                tooltip: 'Defect rate is decreasing compared to earlier weeks',
              },
              stable: {
                bg: 'bg-gray-100 dark:bg-gray-700',
                text: 'text-gray-700 dark:text-gray-300',
                icon: '→',
                label: 'Stable',
                tooltip: 'Defect rate is consistent with earlier weeks',
              },
              degrading: {
                bg: 'bg-red-100 dark:bg-red-900/30',
                text: 'text-red-700 dark:text-red-400',
                icon: '↑',
                label: 'More bugs',
                tooltip: 'Defect rate is increasing compared to earlier weeks',
              },
            };
            const config = trendConfig[trend.direction];
            return (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text} flex items-center gap-1 cursor-help`}
                title={config.tooltip}
              >
                <span className="font-bold">{config.icon}</span>
                {config.label}
              </span>
            );
          })()}
        </div>

      </div>

      {/* Loading State */}
      {loading && (
        <div className="animate-pulse skeleton-shimmer">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-[350px] bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
                vertical={false}
              />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: 'currentColor', fontSize: 12 }}
                className="text-gray-600 dark:text-gray-400"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                label={{
                  value: 'Story Points',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#9ca3af', fontSize: 12 }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value: string) => (
                  <span className="text-gray-700 dark:text-gray-300">{value}</span>
                )}
              />
              {/* Delivered - Blue line */}
              <Line
                type="monotone"
                dataKey="delivered_points"
                name="Delivered"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
              {/* Rework - Red line */}
              <Line
                type="monotone"
                dataKey="rework_points"
                name="Rework"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && chartData.length === 0 && (
        <div className="w-full h-[350px] flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="font-semibold">No data available</p>
            <p className="text-sm mt-2">Try selecting a different time range</p>
          </div>
        </div>
      )}
    </div>
  );
}
