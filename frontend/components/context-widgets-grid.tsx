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
  itemsExcluded: number;
  isLoading: boolean;
  onStoriesClick?: () => void;
  onBugsClick?: () => void;
  onDeliveredPointsClick?: () => void;
  onReworkPointsClick?: () => void;
  onExcludedClick?: () => void;
}

/**
 * ContextWidgetsGrid Component
 *
 * A responsive grid layout that displays context metrics with semantic colors.
 * Features:
 * - Responsive grid: 1 col mobile, 2 col tablet, 5 col desktop
 * - Semantic accent colors for each metric type
 * - Consistent spacing and alignment
 * - Loading states with shimmer effect
 * - Semantic structure
 * - Clickable cards for drill-down
 * - Hints explaining each metric
 *
 * Color semantics:
 * - Stories: Blue (primary work items)
 * - Bugs: Red (issues to fix)
 * - SP Delivered: Green (positive outcome)
 * - Rework Points: Yellow/Amber (effort spent on fixes)
 * - Excluded: Gray (neutral/excluded items)
 *
 * @param storiesAnalyzed - Number of stories analyzed
 * @param bugsLinked - Number of bugs linked
 * @param deliveredPoints - Total story points delivered
 * @param reworkPoints - Total rework points
 * @param itemsExcluded - Number of items excluded (no story points)
 * @param isLoading - Whether the data is currently loading
 */
export default function ContextWidgetsGrid({
  storiesAnalyzed,
  bugsLinked,
  deliveredPoints,
  reworkPoints,
  itemsExcluded,
  isLoading,
  onStoriesClick,
  onBugsClick,
  onDeliveredPointsClick,
  onReworkPointsClick,
  onExcludedClick,
}: ContextWidgetsGridProps) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      role="region"
      aria-label="Rework metrics"
    >
      <ContextWidget
        title="Completed"
        value={storiesAnalyzed}
        isLoading={isLoading}
        onClick={onStoriesClick}
        hint="Total Stories and Tasks completed in the selected time period. Click to see the full list."
        accentColor="blue"
      />
      <ContextWidget
        title="Bugs Fixed"
        value={bugsLinked}
        isLoading={isLoading}
        onClick={onBugsClick}
        hint="Total Bugs resolved in the selected time period. Click to see the full list."
        accentColor="red"
      />
      <ContextWidget
        title="Delivered"
        value={deliveredPoints}
        isLoading={isLoading}
        onClick={onDeliveredPointsClick}
        hint="Story Points from completed Stories and Tasks. This represents the team's productive output."
        accentColor="green"
      />
      <ContextWidget
        title="Rework"
        value={reworkPoints}
        isLoading={isLoading}
        onClick={onReworkPointsClick}
        hint="Story Points spent on bug fixes. Defect Rate = (Rework ÷ Delivered) × 100%."
        accentColor="yellow"
      />
      <ContextWidget
        title="Unestimated"
        value={itemsExcluded}
        isLoading={isLoading}
        onClick={onExcludedClick}
        hint="Items without Story Points. These are excluded from calculations. Click to see which items need estimates."
        accentColor="gray"
      />
    </div>
  );
}
