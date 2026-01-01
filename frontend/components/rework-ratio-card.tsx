'use client';

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
 *
 * @param ratio - The rework ratio percentage (e.g., 12 for 12%)
 * @param isLoading - Whether the data is currently loading
 */
export default function ReworkRatioCard({
  ratio,
  isLoading,
}: ReworkRatioCardProps) {
  if (isLoading) {
    return (
      <div className="p-8 bg-blue-600 text-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="h-24 w-48 bg-blue-500 rounded-lg animate-pulse" />
          <div className="h-6 w-64 bg-blue-500 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-blue-600 text-white rounded-lg shadow-lg">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div
          className="text-6xl font-bold"
          role="status"
          aria-live="polite"
          aria-label={`Rework ratio: ${ratio} percent`}
        >
          {ratio}%
        </div>
        <p className="text-xl text-blue-100">
          {ratio}% of effort went to bug fixes
        </p>
      </div>
    </div>
  );
}
