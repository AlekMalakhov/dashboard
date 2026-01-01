'use client';

import { useEffect, useState } from 'react';
import {
  getBoards,
  getReworkMetrics,
  type Board,
  type ReworkMetrics,
} from '@/lib/api';
import BoardSelector from '@/components/board-selector';
import TimeRangeSelector from '@/components/time-range-selector';
import ReworkRatioCard from '@/components/rework-ratio-card';
import ContextWidgetsGrid from '@/components/context-widgets-grid';
import MissingDataWarning from '@/components/missing-data-warning';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);
  const [metrics, setMetrics] = useState<ReworkMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [boardsError, setBoardsError] = useState<string | null>(null);

  // Fetch boards on mount
  useEffect(() => {
    const fetchBoards = async () => {
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
    };

    fetchBoards();
  }, []);

  // Handle board selection
  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
  };

  // Handle time range change
  const handleTimeRangeChange = (range: 30 | 60 | 90) => {
    setTimeRange(range);
  };

  // Fetch metrics when board or time range changes
  useEffect(() => {
    if (!selectedBoard) {
      setMetrics(null);
      setMetricsError(null);
      return;
    }

    const fetchMetrics = async () => {
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
    };

    fetchMetrics();
  }, [selectedBoard, timeRange]);

  // Show loading state while fetching boards
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            role="status"
            aria-label="Loading"
          />
          <p className="text-lg text-gray-600">Loading boards...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Rework Dashboard
          </h1>
        </div>

        {/* Error message for boards */}
        {boardsError && (
          <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{boardsError}</p>
          </div>
        )}

        {/* Board selector */}
        {!boardsError && (
          <div className="mb-8">
            <BoardSelector
              boards={boards}
              selectedBoard={selectedBoard}
              onSelect={handleBoardSelect}
            />
          </div>
        )}

        {/* Rework Dashboard - Only visible when board is selected */}
        {selectedBoard && (
          <div className="mt-8 space-y-6">
            {/* Time Range Selector */}
            <div className="flex justify-end">
              <TimeRangeSelector
                selectedRange={timeRange}
                onRangeChange={handleTimeRangeChange}
              />
            </div>

            {/* Error message */}
            {metricsError && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{metricsError}</p>
              </div>
            )}

            {/* Warning message for missing data */}
            {metrics && metrics.items_excluded > 0 && !isLoadingMetrics && (
              <MissingDataWarning
                excludedCount={metrics.items_excluded}
                message={metrics.warning ?? undefined}
              />
            )}

            {/* Main Rework Ratio Card */}
            <ReworkRatioCard
              ratio={metrics?.rework_ratio ?? 0}
              isLoading={isLoadingMetrics}
            />

            {/* Context Metrics Grid */}
            <ContextWidgetsGrid
              storiesAnalyzed={metrics?.stories_analyzed ?? 0}
              bugsLinked={metrics?.bugs_linked ?? 0}
              deliveredPoints={metrics?.story_points_delivered ?? 0}
              reworkPoints={metrics?.rework_points ?? 0}
              isLoading={isLoadingMetrics}
            />
          </div>
        )}

        {/* Show message if no boards available */}
        {!boardsError && boards.length === 0 && (
          <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-gray-700">
              No boards available. Please check your Jira configuration.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
