'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getDeveloperLeaderboard,
  type DeveloperLeaderboardResponse,
} from '@/lib/api';

/**
 * Props for the DeveloperLeaderboardTable component
 */
export interface DeveloperLeaderboardTableProps {
  boardId: number;
  timeRange: number;
}

/**
 * Get color classes for rework ratio badge based on percentage
 */
function getReworkRatioBadgeClasses(ratio: number): string {
  if (ratio <= 10) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
  } else if (ratio <= 25) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  } else if (ratio <= 40) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  } else {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}

/**
 * Get initials from display name for avatar placeholder
 */
function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

/**
 * InfoTooltip Component
 * Displays an info icon with hover tooltip explaining the leaderboard
 */
function InfoTooltip() {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors"
        onMouseEnter={() => setShowHint(true)}
        onMouseLeave={() => setShowHint(false)}
        onFocus={() => setShowHint(true)}
        onBlur={() => setShowHint(false)}
        onClick={() => setShowHint(!showHint)}
        aria-label="Info about Developer Rework Leaderboard"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {showHint && (
        <div className="absolute z-20 left-0 top-full mt-2 w-80 p-4 bg-gray-900 text-white text-sm rounded-lg shadow-xl animate-fade-in">
          <p className="font-semibold mb-2">About this leaderboard</p>
          <p className="text-gray-300 mb-3">
            This table shows each developer&apos;s rework ratio, calculated as the proportion of bug story points to delivered story points.
          </p>
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded"></div>
              <span className="text-gray-300"><strong>0-10%</strong> — Excellent quality</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-300"><strong>11-25%</strong> — Good quality</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span className="text-gray-300"><strong>26-40%</strong> — Needs attention</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-300"><strong>41%+</strong> — Requires intervention</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs">
            Only developers with 3+ stories in the selected period are shown.
          </p>
          <div className="absolute left-4 bottom-full w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
}

/**
 * DeveloperLeaderboardTable Component
 *
 * Displays a leaderboard of developers with their rework metrics.
 * Features:
 * - Clean table design with avatar, name, and key metrics
 * - Color-coded rework ratio badges
 * - Zebra striping on rows
 * - Hover effects
 * - Dark mode support
 * - Contextual disclaimer text
 * - Loading, error, and empty states
 */
export default function DeveloperLeaderboardTable({
  boardId,
  timeRange,
}: DeveloperLeaderboardTableProps) {
  const [data, setData] = useState<DeveloperLeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch developer leaderboard data
  const fetchData = useCallback(async () => {
    if (!boardId) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await getDeveloperLeaderboard(boardId, timeRange);
      setData(result);
    } catch (err) {
      setError('Failed to load developer leaderboard');
      console.error('Error fetching developer leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [boardId, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle row expansion
  const toggleRow = (accountId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Handle keyboard navigation for expandable rows
  const handleRowKeyDown = (
    e: React.KeyboardEvent,
    accountId: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleRow(accountId);
    }
  };

  // Get Jira site URL from environment or use default
  const jiraSiteUrl =
    process.env.NEXT_PUBLIC_JIRA_SITE_URL ||
    'https://provectus-dev.atlassian.net';

  return (
    <div
      className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
      role="region"
      aria-label="Developer Rework Leaderboard"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Developer Rework Leaderboard
          </h2>
          <InfoTooltip />
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 italic">
        This data supports process improvement and coaching conversations.
      </p>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Developer
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Rework Ratio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Stories
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Story Points
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Bugs
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Bug Points
                  </th>
                </tr>
              </thead>
              {/* Skeleton Rows */}
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse skeleton-shimmer">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full ml-auto"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <svg
              className="h-12 w-12 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="space-y-2">
              <p className="text-red-700 dark:text-red-400 font-semibold">
                {error}
              </p>
              <p className="text-sm text-red-600 dark:text-red-500">
                Please try again or contact support if the problem persists.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.developers.length === 0 && (
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No developers found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No developers with 3+ stories in this period
          </p>
        </div>
      )}

      {/* Warning Banner */}
      {!isLoading && !error && data && data.developers_excluded > 0 && data.warning && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            {data.warning}
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && data && data.developers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 w-10" aria-label="Expand/Collapse"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Developer
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Rework Ratio
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Stories
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Story Points
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Bugs
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Bug Points
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.developers.map((developer, index) => {
                const isExpanded = expandedRows.has(developer.account_id);
                const expandedContentId = `developer-details-${developer.account_id}`;

                return (
                  <React.Fragment key={developer.account_id}>
                    {/* Main Developer Row - Clickable */}
                    <tr
                      className={`
                        ${index % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/50'}
                        hover:bg-blue-50 dark:hover:bg-blue-900/10
                        transition-colors cursor-pointer
                      `}
                      onClick={() => toggleRow(developer.account_id)}
                      onKeyDown={(e) => handleRowKeyDown(e, developer.account_id)}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                      aria-controls={expandedContentId}
                    >
                      {/* Chevron Icon */}
                      <td className="px-4 py-4 text-gray-400 dark:text-gray-500">
                        <svg
                          className={`w-5 h-5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </td>

                      {/* Developer Name with Avatar */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {developer.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={developer.avatar_url}
                                alt={`${developer.display_name} avatar`}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
                                {getInitials(developer.display_name)}
                              </div>
                            )}
                          </div>
                          {/* Name */}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {developer.display_name}
                          </span>
                        </div>
                      </td>

                      {/* Rework Ratio */}
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getReworkRatioBadgeClasses(
                            developer.rework_ratio
                          )}`}
                        >
                          {developer.rework_ratio.toFixed(1)}%
                        </span>
                      </td>

                      {/* Stories Count */}
                      <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                        {developer.stories_count}
                      </td>

                      {/* Story Points */}
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                        {developer.story_points_delivered}
                      </td>

                      {/* Bugs Count */}
                      <td className="px-4 py-4 text-right text-gray-700 dark:text-gray-300">
                        {developer.bugs_count}
                      </td>

                      {/* Bug Points */}
                      <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                        {developer.bug_points.toFixed(1)}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr id={expandedContentId}>
                        <td colSpan={7} className="px-0 py-0">
                          <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-b border-gray-200 dark:border-gray-700 animate-fade-in">
                            <div className="px-8 py-6 space-y-6">
                              {/* Stories Section */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4 text-blue-600 dark:text-blue-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  Stories ({developer.stories.length})
                                </h4>
                                {developer.stories.length > 0 ? (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-gray-100 dark:bg-gray-900/50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Key
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Summary
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Points
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {developer.stories.map((story) => (
                                          <tr
                                            key={story.key}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                          >
                                            <td className="px-4 py-2">
                                              <a
                                                href={`${jiraSiteUrl}/browse/${story.key}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {story.key}
                                                <svg
                                                  className="w-3 h-3 opacity-50"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                              </a>
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm">
                                              {story.summary}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <span
                                                className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-medium ${
                                                  story.story_points !== null
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    : 'text-gray-400 dark:text-gray-500'
                                                }`}
                                              >
                                                {story.story_points ?? '-'}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    No stories found
                                  </p>
                                )}
                              </div>

                              {/* Bugs Section */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4 text-red-600 dark:text-red-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  Bugs ({developer.bugs.length})
                                </h4>
                                {developer.bugs.length > 0 ? (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-gray-100 dark:bg-gray-900/50">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Key
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Summary
                                          </th>
                                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Points
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Parent Story
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {developer.bugs.map((bug) => (
                                          <tr
                                            key={bug.key}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                          >
                                            <td className="px-4 py-2">
                                              <a
                                                href={`${jiraSiteUrl}/browse/${bug.key}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center gap-1"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {bug.key}
                                                <svg
                                                  className="w-3 h-3 opacity-50"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  viewBox="0 0 24 24"
                                                >
                                                  <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                  />
                                                </svg>
                                              </a>
                                            </td>
                                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm">
                                              {bug.summary}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                              <span
                                                className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-medium ${
                                                  bug.story_points !== null
                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    : 'text-gray-400 dark:text-gray-500'
                                                }`}
                                              >
                                                {bug.story_points ?? '-'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2">
                                              {bug.parent_key ? (
                                                <a
                                                  href={`${jiraSiteUrl}/browse/${bug.parent_key}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center gap-1"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  {bug.parent_key}
                                                  <svg
                                                    className="w-3 h-3 opacity-50"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={2}
                                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                    />
                                                  </svg>
                                                </a>
                                              ) : (
                                                <span className="text-gray-400 dark:text-gray-500 text-sm italic">
                                                  -
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    No bugs found
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
