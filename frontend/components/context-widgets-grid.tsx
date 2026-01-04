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
 * A responsive grid layout that displays context metrics.
 * Features:
 * - Responsive grid: 1 col mobile, 2 col tablet, 5 col desktop
 * - Consistent spacing and alignment
 * - Loading states for all widgets
 * - Semantic structure
 * - Clickable cards for drill-down
 * - Hints explaining each metric
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
        title="Stories Analyzed"
        value={storiesAnalyzed}
        isLoading={isLoading}
        onClick={onStoriesClick}
        hint="Total number of Stories, Tasks, Sub-tasks, and Epics completed (Done/Closed status) in the selected time period."
      />
      <ContextWidget
        title="Bugs Linked"
        value={bugsLinked}
        isLoading={isLoading}
        onClick={onBugsClick}
        hint="Total number of Bugs completed (Done/Closed status) in the selected time period."
      />
      <ContextWidget
        title="SP Delivered"
        value={deliveredPoints}
        isLoading={isLoading}
        onClick={onDeliveredPointsClick}
        hint="Sum of Story Points from all completed Stories, Tasks, Sub-tasks, and Epics. Only items with assigned story points are included."
      />
      <ContextWidget
        title="Rework Points"
        value={reworkPoints}
        isLoading={isLoading}
        onClick={onReworkPointsClick}
        hint="Sum of Story Points from completed Bugs. Represents effort spent fixing issues. Rework Ratio = (Rework Points / SP Delivered) × 100%."
      />
      <ContextWidget
        title="Excluded"
        value={itemsExcluded}
        isLoading={isLoading}
        onClick={onExcludedClick}
        hint="Number of items excluded from the Story Points calculation because they don't have Story Points assigned. Click to see the list."
      />
    </div>
  );
}
