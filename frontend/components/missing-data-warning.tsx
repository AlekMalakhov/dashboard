'use client';

/**
 * Props for the MissingDataWarning component
 */
export interface MissingDataWarningProps {
  /**
   * Number of items excluded from the analysis
   */
  excludedCount: number;
  /**
   * Optional custom warning message from the API.
   * If not provided, a default message will be displayed.
   */
  message?: string;
}

/**
 * MissingDataWarning Component
 *
 * Displays a warning banner when bugs or stories are excluded from analysis
 * due to missing story points. This component helps users understand that
 * some data may be incomplete or missing from the metrics.
 *
 * Features:
 * - Only renders when excludedCount > 0
 * - Yellow warning banner styling for visual distinction
 * - Accessible with proper ARIA attributes
 * - Warning icon for visual emphasis
 * - Custom or default warning message
 *
 * @param excludedCount - Number of items excluded from the analysis
 * @param message - Optional custom warning message (defaults to standard message)
 *
 * @example
 * ```tsx
 * <MissingDataWarning
 *   excludedCount={5}
 *   message="5 items excluded due to missing story points"
 * />
 * ```
 */
export default function MissingDataWarning({
  excludedCount,
  message,
}: MissingDataWarningProps) {
  // Don't render if no items are excluded
  if (excludedCount <= 0) {
    return null;
  }

  // Use custom message if provided, otherwise use default
  const displayMessage =
    message || `${excludedCount} items excluded due to missing story points`;

  return (
    <div
      role="alert"
      className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-yellow-600 text-xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="text-gray-700">{displayMessage}</p>
    </div>
  );
}
