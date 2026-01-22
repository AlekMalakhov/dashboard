'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  type TimeRange,
  TIME_RANGE_MIN,
  TIME_RANGE_MAX,
  TIME_RANGE_PRESETS,
} from '@/lib/api';

// Re-export TimeRange for backwards compatibility
export type { TimeRange };

/**
 * Props for the TimeRangeSelector component
 */
export interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

/**
 * Calculate the percentage position for a value within the slider range
 */
function valueToPercent(value: number): number {
  return ((value - TIME_RANGE_MIN) / (TIME_RANGE_MAX - TIME_RANGE_MIN)) * 100;
}

/**
 * TimeRangeSelector Component
 *
 * A continuous slider component for selecting time ranges (7-180 days).
 * Features:
 * - Draggable slider with dynamic value display
 * - Tick marks at preset values (30d, 60d, 90d, 180d)
 * - Fires onRangeChange only on mouse/touch release (debounced)
 * - Dark mode support
 * - Accessible with ARIA attributes
 * - Keyboard navigation (arrow keys)
 *
 * @param selectedRange - Currently selected time range (7-180)
 * @param onRangeChange - Callback function when a time range is selected
 */
export default function TimeRangeSelector({
  selectedRange,
  onRangeChange,
}: TimeRangeSelectorProps) {
  // Track local dragging value - null when not dragging (use prop value)
  const [draggingValue, setDraggingValue] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Display value: use dragging value if dragging, otherwise use prop
  const displayValue = draggingValue ?? selectedRange;

  // Handle slider input (fires during drag)
  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setDraggingValue(value);
  }, []);

  // Handle slider change (fires on release)
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      setDraggingValue(null);
      onRangeChange(value);
    },
    [onRangeChange]
  );

  // Commit the current dragging value
  const commitValue = useCallback(() => {
    if (draggingValue !== null) {
      const value = draggingValue;
      setDraggingValue(null);
      onRangeChange(value);
    }
  }, [draggingValue, onRangeChange]);

  // Add global pointer up listener for drag release outside slider
  useEffect(() => {
    if (draggingValue === null) return;

    const handlePointerUp = () => {
      commitValue();
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [draggingValue, commitValue]);

  // Calculate thumb position percentage for label positioning
  const thumbPercent = valueToPercent(displayValue);

  // Handle preset click
  const handlePresetClick = useCallback(
    (preset: number) => {
      setDraggingValue(null);
      onRangeChange(preset);
    },
    [onRangeChange]
  );

  return (
    <div className="flex flex-col gap-2 min-w-[280px]">
      <div className="flex items-center justify-between">
        <label
          htmlFor="time-range-slider"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Time Range
        </label>
        {/* Current value display */}
        <span
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums"
          aria-live="polite"
        >
          {displayValue} days
        </span>
      </div>

      {/* Slider container */}
      <div className="relative pt-2 pb-6">
        {/* Custom track background */}
        <div className="absolute top-[18px] left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />

        {/* Active track fill */}
        <div
          className="absolute top-[18px] left-0 h-2 bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
          style={{ width: `${thumbPercent}%` }}
        />

        {/* Tick marks at preset values */}
        <div className="absolute top-[18px] left-0 right-0 h-2">
          {TIME_RANGE_PRESETS.map((preset) => {
            const percent = valueToPercent(preset);
            return (
              <div
                key={preset}
                className="absolute w-0.5 h-4 -top-1 bg-gray-400 dark:bg-gray-500"
                style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
              />
            );
          })}
        </div>

        {/* Native range input */}
        <input
          ref={sliderRef}
          id="time-range-slider"
          type="range"
          min={TIME_RANGE_MIN}
          max={TIME_RANGE_MAX}
          step={1}
          value={displayValue}
          onInput={handleInput}
          onChange={handleChange}
          className="relative w-full h-2 bg-transparent appearance-none cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-blue-500
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-95
            dark:[&::-webkit-slider-thumb]:bg-gray-800
            dark:[&::-webkit-slider-thumb]:border-blue-400
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-blue-500
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            dark:[&::-moz-range-thumb]:bg-gray-800
            dark:[&::-moz-range-thumb]:border-blue-400
            focus:outline-none
            focus-visible:[&::-webkit-slider-thumb]:ring-2
            focus-visible:[&::-webkit-slider-thumb]:ring-blue-500
            focus-visible:[&::-webkit-slider-thumb]:ring-offset-2
            dark:focus-visible:[&::-webkit-slider-thumb]:ring-offset-gray-900"
          aria-label={`Time range: ${displayValue} days`}
          aria-valuemin={TIME_RANGE_MIN}
          aria-valuemax={TIME_RANGE_MAX}
          aria-valuenow={displayValue}
          aria-valuetext={`${displayValue} days`}
        />

        {/* Preset labels below the slider */}
        <div className="absolute top-8 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span style={{ position: 'absolute', left: '0%', transform: 'translateX(-50%)' }}>
            {TIME_RANGE_MIN}d
          </span>
          {TIME_RANGE_PRESETS.map((preset) => {
            const percent = valueToPercent(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="absolute hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                tabIndex={-1}
                aria-label={`Set to ${preset} days`}
              >
                {preset}d
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
