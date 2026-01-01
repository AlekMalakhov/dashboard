'use client';

/**
 * Props for the ContextWidget component
 */
export interface ContextWidgetProps {
  title: string;
  value: number | string;
  isLoading: boolean;
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
 *
 * @param title - The label/title of the metric
 * @param value - The metric value (can be number or string)
 * @param isLoading - Whether the data is currently loading
 */
export default function ContextWidget({
  title,
  value,
  isLoading,
}: ContextWidgetProps) {
  if (isLoading) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p
          className="text-3xl font-bold text-gray-900"
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
