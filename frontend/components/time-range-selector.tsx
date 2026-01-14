'use client';

import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { type TimeRange } from '@/lib/api';

// Re-export TimeRange for backwards compatibility
export type { TimeRange };

/**
 * Props for the TimeRangeSelector component
 */
export interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

const ranges: Array<{ value: TimeRange; label: string }> = [
  { value: 30, label: '30d' },
  { value: 60, label: '60d' },
  { value: 90, label: '90d' },
  { value: 180, label: '180d' },
];

/**
 * TimeRangeSelector Component
 *
 * A button group component for selecting time ranges (30d, 60d, 12w, 90d).
 * Features:
 * - Animated sliding indicator for active state
 * - Four button options for different time ranges
 * - Visual feedback for active/inactive states
 * - Keyboard navigation support
 * - Accessible with ARIA attributes
 *
 * @param selectedRange - Currently selected time range
 * @param onRangeChange - Callback function when a time range is selected
 */
export default function TimeRangeSelector({
  selectedRange,
  onRangeChange,
}: TimeRangeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Calculate indicator position based on selected button
  const updateIndicator = useCallback(() => {
    const selectedIndex = ranges.findIndex((r) => r.value === selectedRange);
    const selectedButton = buttonRefs.current[selectedIndex];
    const container = containerRef.current;

    if (selectedButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = selectedButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [selectedRange]);

  // Use useLayoutEffect to prevent visual flicker on mount
  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  // Also update on window resize
  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range</label>
      <div
        ref={containerRef}
        className="relative inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1"
        role="group"
        aria-label="Time range selection"
      >
        {/* Sliding indicator background */}
        <div
          className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-200 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {ranges.map(({ value, label }, index) => {
          const isSelected = selectedRange === value;
          return (
            <button
              key={value}
              ref={(el) => { buttonRefs.current[index] = el; }}
              type="button"
              onClick={() => onRangeChange(value)}
              className={`
                relative z-10 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                active:scale-95
                ${
                  isSelected
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
              aria-pressed={isSelected}
              aria-label={label}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
