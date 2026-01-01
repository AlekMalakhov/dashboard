'use client';

import ContextWidget from './context-widget';

/**
 * Props for the ContextWidgetsGrid component
 */
export interface ContextWidgetsGridProps {
  storiesAnalyzed: number;
  bugsLinked: number;
  deliveredPoints: number;
  reworkPoints: number;
  isLoading: boolean;
}

/**
 * ContextWidgetsGrid Component
 *
 * A responsive grid layout that displays four context metrics.
 * Features:
 * - Responsive grid: 1 col mobile, 2 col tablet, 4 col desktop
 * - Consistent spacing and alignment
 * - Loading states for all widgets
 * - Semantic structure
 *
 * @param storiesAnalyzed - Number of stories analyzed
 * @param bugsLinked - Number of bugs linked
 * @param deliveredPoints - Total story points delivered
 * @param reworkPoints - Total rework points
 * @param isLoading - Whether the data is currently loading
 */
export default function ContextWidgetsGrid({
  storiesAnalyzed,
  bugsLinked,
  deliveredPoints,
  reworkPoints,
  isLoading,
}: ContextWidgetsGridProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      role="region"
      aria-label="Rework metrics"
    >
      <ContextWidget
        title="Stories Analyzed"
        value={storiesAnalyzed}
        isLoading={isLoading}
      />
      <ContextWidget
        title="Bugs Linked"
        value={bugsLinked}
        isLoading={isLoading}
      />
      <ContextWidget
        title="Story Points Delivered"
        value={deliveredPoints}
        isLoading={isLoading}
      />
      <ContextWidget
        title="Rework Points"
        value={reworkPoints}
        isLoading={isLoading}
      />
    </div>
  );
}
