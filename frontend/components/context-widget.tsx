'use client';

import { useState } from 'react';

/**
 * Props for the ContextWidget component
 */
export interface ContextWidgetProps {
  title: string;
  value: number | string;
  isLoading: boolean;
  onClick?: () => void;
  hint?: string;
}

/**
 * ContextWidget Component
 *
 * A reusable metric card that displays a title and value.
 * Features:
 * - Clean, minimalist design
 * - Loading skeleton state
 * - Responsive sizing
 * - Accessible labels
 * - Optional click handler for drill-down
 * - Optional hint tooltip explaining the metric
 *
 * @param title - The label/title of the metric
 * @param value - The metric value (can be number or string)
 * @param isLoading - Whether the data is currently loading
 * @param onClick - Optional click handler
 * @param hint - Optional tooltip text explaining what this metric means
 */
export default function ContextWidget({
  title,
  value,
  isLoading,
  onClick,
  hint,
}: ContextWidgetProps) {
  const [showHint, setShowHint] = useState(false);
  if (isLoading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const baseClasses = "p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm";
  const clickableClasses = onClick
    ? "cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200"
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
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          {hint && (
            <div className="relative">
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
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
                  className="w-4 h-4"
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
                <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg">
                  {hint}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                </div>
              )}
            </div>
          )}
        </div>
        <p
          className="text-3xl font-bold text-gray-900 dark:text-white"
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
