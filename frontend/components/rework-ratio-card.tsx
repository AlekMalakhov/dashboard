'use client';

import { useState } from 'react';

/**
 * Props for the ReworkRatioCard component
 */
export interface ReworkRatioCardProps {
  ratio: number;
  isLoading: boolean;
}

/**
 * Get the color scheme based on the rework ratio
 * - 0-10%: Green (Excellent)
 * - 11-25%: Blue (Good)
 * - 26-40%: Amber/Yellow (Moderate)
 * - 41%+: Red (Needs Attention)
 */
function getRatioTheme(ratio: number) {
  if (ratio <= 10) {
    return {
      gradient: 'from-emerald-500 to-emerald-700 dark:from-emerald-600 dark:to-emerald-800',
      lightBg: 'bg-emerald-400/50 dark:bg-emerald-500/30',
      textMuted: 'text-emerald-100',
      label: 'Excellent',
      tooltip: '0-10%: Very low defect rate',
      markerColor: 'bg-emerald-400 border-emerald-600',
    };
  }
  if (ratio <= 25) {
    return {
      gradient: 'from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800',
      lightBg: 'bg-blue-400/50 dark:bg-blue-500/30',
      textMuted: 'text-blue-100',
      label: 'Good',
      tooltip: '11-25%: Healthy defect rate',
      markerColor: 'bg-blue-400 border-blue-600',
    };
  }
  if (ratio <= 40) {
    return {
      gradient: 'from-amber-500 to-amber-700 dark:from-amber-600 dark:to-amber-800',
      lightBg: 'bg-amber-400/50 dark:bg-amber-500/30',
      textMuted: 'text-amber-100',
      label: 'Moderate',
      tooltip: '26-40%: Room for improvement',
      markerColor: 'bg-amber-400 border-amber-600',
    };
  }
  return {
    gradient: 'from-red-500 to-red-700 dark:from-red-600 dark:to-red-800',
    lightBg: 'bg-red-400/50 dark:bg-red-500/30',
    textMuted: 'text-red-100',
    label: 'Needs Attention',
    tooltip: '40%+: High defect rate, review quality practices',
    markerColor: 'bg-red-400 border-red-600',
  };
}

/**
 * ReworkRatioCard Component
 *
 * Displays the main rework ratio metric as a large percentage with context text.
 * Features:
 * - Color-coded based on ratio thresholds (green/blue/amber/red)
 * - Visual progress bar showing ratio position
 * - Status label (Excellent/Good/Moderate/Needs Attention)
 * - Large, prominent percentage display
 * - Contextual description text
 * - Shimmer loading skeleton state
 * - Responsive design
 * - Info tooltip explaining the metric
 *
 * @param ratio - The rework ratio percentage (e.g., 12 for 12%)
 * @param isLoading - Whether the data is currently loading
 */
export default function ReworkRatioCard({
  ratio,
  isLoading,
}: ReworkRatioCardProps) {
  const [showHint, setShowHint] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800 text-white rounded-xl shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-20 w-32 bg-gray-300/50 dark:bg-gray-500/30 rounded-lg skeleton-shimmer" />
          <div className="h-5 w-24 bg-gray-300/50 dark:bg-gray-500/30 rounded skeleton-shimmer" />
          <div className="h-6 w-56 bg-gray-300/50 dark:bg-gray-500/30 rounded skeleton-shimmer" />
          <div className="w-full max-w-xs mt-2">
            <div className="h-3 bg-gray-300/30 dark:bg-gray-500/20 rounded-full skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const theme = getRatioTheme(ratio);
  const clampedRatio = Math.min(Math.max(ratio, 0), 100);

  return (
    <div className={`p-8 bg-gradient-to-br ${theme.gradient} text-white rounded-xl shadow-lg relative overflow-hidden animate-fade-in`}>
      {/* Subtle pattern overlay for depth */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
      </div>

      <div className="relative flex flex-col items-center justify-center space-y-3">
        {/* Main ratio display */}
        <div className="flex items-center gap-3">
          <div
            className="text-6xl font-bold metric-value drop-shadow-sm"
            role="status"
            aria-live="polite"
            aria-label={`Defect rate: ${ratio} percent`}
          >
            {ratio}%
          </div>
          <div className="relative">
            <button
              type="button"
              className={`${theme.textMuted} hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded-full p-1 transition-colors`}
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
              onFocus={() => setShowHint(true)}
              onBlur={() => setShowHint(false)}
              onClick={() => setShowHint(!showHint)}
              aria-label="Info about Defect Rate"
            >
              <svg
                className="w-6 h-6"
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
              <div className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl animate-fade-in">
                <p className="font-semibold mb-1">Defect Rate Formula:</p>
                <p className="text-gray-300">(Bug Points ÷ Total Points) × 100%</p>
                <p className="text-gray-300 mt-2">Lower is better. Shows what percentage of total effort was spent on bug fixes.</p>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
              </div>
            )}
          </div>
        </div>

        {/* Status label */}
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${theme.lightBg} backdrop-blur-sm cursor-help`}
          title={theme.tooltip}
        >
          {theme.label}
        </span>

        {/* Description text */}
        <p className={`text-lg ${theme.textMuted}`}>
          {ratio}% of effort went to bug fixes
        </p>

        {/* Visual progress bar */}
        <div className="w-full max-w-xs mt-4">
          <div className="relative">
            {/* Scale bar background with gradient */}
            <div className="h-3 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 rounded-full opacity-80" />

            {/* Marker dot */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 ${theme.markerColor} rounded-full border-2 border-white shadow-lg transition-all duration-500`}
              style={{ left: `calc(${clampedRatio}% - 8px)` }}
            />
          </div>

          {/* Scale labels */}
          <div className={`flex justify-between text-xs ${theme.textMuted} mt-2`}>
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
