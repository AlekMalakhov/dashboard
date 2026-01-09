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
  /**
   * Optional click handler to show excluded items
   */
  onClick?: () => void;
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
 * - Optional click handler for drill-down
 *
 * @param excludedCount - Number of items excluded from the analysis
 * @param message - Optional custom warning message (defaults to standard message)
 * @param onClick - Optional click handler
 *
 * @example
 * ```tsx
 * <MissingDataWarning
 *   excludedCount={5}
 *   message="5 items excluded due to missing story points"
 *   onClick={() => setShowExcludedModal(true)}
 * />
 * ```
 */
export default function MissingDataWarning({
  excludedCount,
  message,
  onClick,
}: MissingDataWarningProps) {
  // Don't render if no items are excluded
  if (excludedCount <= 0) {
    return null;
  }

  // Use custom message if provided, otherwise use default
  const displayMessage =
    message || `${excludedCount} items excluded (no story points)`;

  const clickableClasses = onClick
    ? "cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/40 hover:border-yellow-300 dark:hover:border-yellow-700 transition-all duration-200"
    : "";

  return (
    <div
      role={onClick ? "button" : "alert"}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3 ${clickableClasses}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-yellow-600 dark:text-yellow-500 text-xl" aria-hidden="true">
        ⚠️
      </span>
      <p className="text-gray-700 dark:text-gray-300">{displayMessage}</p>
    </div>
  );
}
