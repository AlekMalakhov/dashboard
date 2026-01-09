'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getBoards,
  getReworkMetrics,
  type Board,
  type ReworkMetrics,
  type TimeRange,
} from '@/lib/api';
import BoardSelector from '@/components/board-selector';
import TimeRangeSelector from '@/components/time-range-selector';
import ReworkRatioCard from '@/components/rework-ratio-card';
import ReworkTrendChart from '@/components/rework-trend-chart';
import ContextWidgetsGrid from '@/components/context-widgets-grid';
import MissingDataWarning from '@/components/missing-data-warning';
import IssuesModal from '@/components/issues-modal';
import ThemeToggle from '@/components/theme-toggle';

type ModalType = 'stories' | 'bugs' | 'delivered' | 'rework' | 'excluded' | null;

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(84);
  const [metrics, setMetrics] = useState<ReworkMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [boardsError, setBoardsError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Fetch boards function
  const fetchBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      setBoardsError(null);
      const data = await getBoards();
      setBoards(data.boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      setBoardsError('Failed to load boards. Please check the backend connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch boards on mount
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Handle board selection
  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
  };

  // Handle time range change
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  // Fetch metrics function
  const fetchMetrics = useCallback(async () => {
    if (!selectedBoard) {
      setMetrics(null);
      setMetricsError(null);
      return;
    }

    setIsLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await getReworkMetrics(selectedBoard.id, timeRange);
      setMetrics(data);
    } catch (error) {
      setMetricsError('Failed to load rework metrics');
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [selectedBoard, timeRange]);

  // Fetch metrics when board or time range changes
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Show loading state while fetching boards
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="animate-spin rounded-full h-14 w-14 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400"
              role="status"
              aria-label="Loading"
            />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 animate-pulse">Loading boards...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Rework Dashboard
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
              Track defect rate and quality metrics across your Jira boards
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Error message for boards with retry */}
        {boardsError && (
          <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-400 font-medium">Unable to load boards</p>
                <p className="text-red-600 dark:text-red-500 text-sm mt-1">{boardsError}</p>
              </div>
              <button
                onClick={fetchBoards}
                className="flex-shrink-0 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors font-medium text-sm active:scale-95"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Board selector */}
        {!boardsError && (
          <div className="mb-8">
            <BoardSelector
              boards={boards}
              selectedBoard={selectedBoard}
              onSelect={handleBoardSelect}
              onClear={() => {
                setSelectedBoard(null);
                setActiveModal(null);
              }}
            />
          </div>
        )}

        {/* Welcoming empty state before board selection */}
        {!boardsError && boards.length > 0 && !selectedBoard && (
          <div className="mt-16 flex flex-col items-center text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a Board to Get Started
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Choose a Jira board from the dropdown above to view quality metrics and insights for your team.
            </p>
          </div>
        )}

        {/* Rework Dashboard - Only visible when board is selected */}
        {selectedBoard && (
          <div className="mt-8 space-y-8 animate-fade-in">
            {/* Time Range Selector */}
            <div className="flex justify-end">
              <TimeRangeSelector
                selectedRange={timeRange}
                onRangeChange={handleTimeRangeChange}
              />
            </div>

            {/* Error message with retry */}
            {metricsError && (
              <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-red-700 dark:text-red-400 font-medium">Unable to load metrics</p>
                    <p className="text-red-600 dark:text-red-500 text-sm mt-1">{metricsError}</p>
                  </div>
                  <button
                    onClick={fetchMetrics}
                    className="flex-shrink-0 px-4 py-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900 transition-colors font-medium text-sm active:scale-95"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Warning message for missing data */}
            {metrics && metrics.items_excluded > 0 && !isLoadingMetrics && (
              <MissingDataWarning
                excludedCount={metrics.items_excluded}
                message={metrics.warning ?? undefined}
                onClick={() => setActiveModal('excluded')}
              />
            )}

            {/* Main Rework Ratio Card */}
            <ReworkRatioCard
              ratio={metrics?.rework_ratio ?? 0}
              isLoading={isLoadingMetrics}
            />

            {/* Rework Trend Chart */}
            <ReworkTrendChart boardId={selectedBoard.id} />

            {/* Context Metrics Grid */}
            <ContextWidgetsGrid
              storiesAnalyzed={metrics?.stories_analyzed ?? 0}
              bugsLinked={metrics?.bugs_linked ?? 0}
              deliveredPoints={metrics?.story_points_delivered ?? 0}
              reworkPoints={metrics?.rework_points ?? 0}
              itemsExcluded={metrics?.items_excluded ?? 0}
              isLoading={isLoadingMetrics}
              onStoriesClick={() => setActiveModal('stories')}
              onBugsClick={() => setActiveModal('bugs')}
              onDeliveredPointsClick={() => setActiveModal('delivered')}
              onReworkPointsClick={() => setActiveModal('rework')}
              onExcludedClick={() => setActiveModal('excluded')}
            />
          </div>
        )}

        {/* Show message if no boards available */}
        {!boardsError && boards.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              No Boards Available
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Please check your Jira configuration to ensure boards are accessible.
            </p>
          </div>
        )}
      </div>

      {/* Issues Modal */}
      <IssuesModal
        isOpen={activeModal === 'stories' || activeModal === 'delivered'}
        onClose={() => setActiveModal(null)}
        title={activeModal === 'stories' ? 'Completed Items' : 'Delivered Points Breakdown'}
        issues={metrics?.stories ?? []}
      />
      <IssuesModal
        isOpen={activeModal === 'bugs' || activeModal === 'rework'}
        onClose={() => setActiveModal(null)}
        title={activeModal === 'bugs' ? 'Bugs Fixed' : 'Rework Points Breakdown'}
        issues={metrics?.bugs ?? []}
      />
      <IssuesModal
        isOpen={activeModal === 'excluded'}
        onClose={() => setActiveModal(null)}
        title="Unestimated Items"
        issues={[
          ...(metrics?.bugs ?? []).filter(b => b.story_points === null),
          ...(metrics?.stories ?? []).filter(s => s.story_points === null),
        ]}
      />
    </main>
  );
}
