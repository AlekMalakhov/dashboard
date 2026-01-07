'use client';

import { useState } from 'react';

/**
 * Accent color options for the widget
 */
export type AccentColor = 'blue' | 'green' | 'yellow' | 'red' | 'gray';

/**
 * Props for the ContextWidget component
 */
export interface ContextWidgetProps {
  title: string;
  value: number | string;
  isLoading: boolean;
  onClick?: () => void;
  hint?: string;
  accentColor?: AccentColor;
}

/**
 * Get the accent color classes for the widget
 */
function getAccentClasses(color: AccentColor) {
  const colors = {
    blue: {
      border: 'border-l-blue-500',
      hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
      icon: 'text-blue-500',
    },
    green: {
      border: 'border-l-emerald-500',
      hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/10',
      icon: 'text-emerald-500',
    },
    yellow: {
      border: 'border-l-amber-500',
      hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-900/10',
      icon: 'text-amber-500',
    },
    red: {
      border: 'border-l-red-500',
      hoverBg: 'hover:bg-red-50 dark:hover:bg-red-900/10',
      icon: 'text-red-500',
    },
    gray: {
      border: 'border-l-gray-400',
      hoverBg: 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
      icon: 'text-gray-400',
    },
  };
  return colors[color];
}

/**
 * ContextWidget Component
 *
 * A reusable metric card that displays a title and value.
 * Features:
 * - Clean, minimalist design with accent color border
 * - Shimmer loading skeleton state
 * - Responsive sizing
 * - Accessible labels
 * - Optional click handler for drill-down
 * - Optional hint tooltip explaining the metric
 * - Hover scale animation for clickable widgets
 *
 * @param title - The label/title of the metric
 * @param value - The metric value (can be number or string)
 * @param isLoading - Whether the data is currently loading
 * @param onClick - Optional click handler
 * @param hint - Optional tooltip text explaining what this metric means
 * @param accentColor - Color accent for the left border (blue, green, yellow, red, gray)
 */
export default function ContextWidget({
  title,
  value,
  isLoading,
  onClick,
  hint,
  accentColor = 'blue',
}: ContextWidgetProps) {
  const [showHint, setShowHint] = useState(false);
  const accent = getAccentClasses(accentColor);

  if (isLoading) {
    return (
      <div className={`p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${accent.border} rounded-xl shadow-sm`}>
        <div className="space-y-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer" />
          <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const baseClasses = `p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${accent.border} rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/5`;
  const clickableClasses = onClick
    ? `cursor-pointer ${accent.hoverBg} hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150`
    : "";

  return (
    <div
      className={`${baseClasses} ${clickableClasses} relative`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
          {hint && (
            <div className="relative">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-0.5 transition-colors"
                onMouseEnter={() => setShowHint(true)}
                onMouseLeave={() => setShowHint(false)}
                onFocus={() => setShowHint(true)}
                onBlur={() => setShowHint(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHint(!showHint);
                }}
                aria-label={`Info about ${title}`}
              >
                <svg
                  className="w-3.5 h-3.5"
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
                <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2.5 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl animate-fade-in">
                  {hint}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                </div>
              )}
            </div>
          )}
        </div>
        <p
          className="text-3xl font-bold text-gray-900 dark:text-white metric-value"
          role="status"
          aria-live="polite"
          aria-label={`${title}: ${value}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
