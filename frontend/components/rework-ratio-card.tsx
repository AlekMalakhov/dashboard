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
 * ReworkRatioCard Component
 *
 * Displays the main rework ratio metric as a large percentage with context text.
 * Features:
 * - Large, prominent percentage display
 * - Contextual description text
 * - Loading skeleton state
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
      <div className="p-8 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-24 w-48 bg-blue-500 dark:bg-blue-600 rounded-lg animate-pulse" />
          <div className="h-6 w-64 bg-blue-500 dark:bg-blue-600 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-lg relative">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="text-6xl font-bold"
            role="status"
            aria-live="polite"
            aria-label={`Rework ratio: ${ratio} percent`}
          >
            {ratio}%
          </div>
          <div className="relative">
            <button
              type="button"
              className="text-blue-200 hover:text-white focus:outline-none"
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
              onFocus={() => setShowHint(true)}
              onBlur={() => setShowHint(false)}
              onClick={() => setShowHint(!showHint)}
              aria-label="Info about Rework Ratio"
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
              <div className="absolute z-10 left-1/2 -translate-x-1/2 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg">
                <p className="font-semibold mb-1">Rework Ratio Formula:</p>
                <p className="text-gray-300">(Rework Points / Story Points Delivered) × 100%</p>
                <p className="text-gray-300 mt-2">Lower is better. Indicates what percentage of completed work was spent on fixing bugs rather than delivering new features.</p>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900" />
              </div>
            )}
          </div>
        </div>
        <p className="text-xl text-blue-100">
          {ratio}% of effort went to bug fixes
        </p>
      </div>
    </div>
  );
}
