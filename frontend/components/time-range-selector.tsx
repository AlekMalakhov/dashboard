'use client';

/**
 * Props for the TimeRangeSelector component
 */
export interface TimeRangeSelectorProps {
  selectedRange: 30 | 60 | 90;
  onRangeChange: (range: 30 | 60 | 90) => void;
}

/**
 * TimeRangeSelector Component
 *
 * A button group component for selecting time ranges (30d, 60d, 90d).
 * Features:
 * - Three button options for different time ranges
 * - Visual feedback for active/inactive states
 * - Keyboard navigation support
 * - Accessible with ARIA attributes
 *
 * @param selectedRange - Currently selected time range (30, 60, or 90 days)
 * @param onRangeChange - Callback function when a time range is selected
 */
export default function TimeRangeSelector({
  selectedRange,
  onRangeChange,
}: TimeRangeSelectorProps) {
  const ranges: Array<30 | 60 | 90> = [30, 60, 90];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Time Range</label>
      <div
        className="inline-flex rounded-lg border border-gray-300 bg-white p-1"
        role="group"
        aria-label="Time range selection"
      >
        {ranges.map((range) => {
          const isSelected = selectedRange === range;
          return (
            <button
              key={range}
              type="button"
              onClick={() => onRangeChange(range)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${range} days`}
            >
              {range}d
            </button>
          );
        })}
      </div>
    </div>
  );
}
