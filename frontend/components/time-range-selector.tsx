'use client';

/**
 * Valid time range options
 */
export type TimeRange = 30 | 60 | 84 | 90;

/**
 * Props for the TimeRangeSelector component
 */
export interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

/**
 * TimeRangeSelector Component
 *
 * A button group component for selecting time ranges (30d, 60d, 12w, 90d).
 * Features:
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
  const ranges: Array<{ value: TimeRange; label: string }> = [
    { value: 30, label: '30d' },
    { value: 60, label: '60d' },
    { value: 90, label: '90d' },
    { value: 84, label: '12w' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range</label>
      <div
        className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1"
        role="group"
        aria-label="Time range selection"
      >
        {ranges.map(({ value, label }) => {
          const isSelected = selectedRange === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onRangeChange(value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800
                ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
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
