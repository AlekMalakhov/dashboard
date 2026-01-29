'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getTopTicketsWithBugs,
  type TopTicketsWithBugsResponse,
} from '@/lib/api';

/**
 * Props for the TopTicketsWithBugsTable component
 */
export interface TopTicketsWithBugsTableProps {
  boardId: number;
  timeRange: number;
}

/**
 * TopTicketsWithBugsTable Component
 *
 * Displays a table of tickets that have the most linked bugs.
 * Features:
 * - Clean table design with ticket key, summary, and bug count
 * - Zebra striping on rows
 * - Hover effects
 * - Dark mode support
 * - Loading, error, and empty states
 */
export default function TopTicketsWithBugsTable({
  boardId,
  timeRange,
}: TopTicketsWithBugsTableProps) {
  const [data, setData] = useState<TopTicketsWithBugsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const limitOptions = [10, 20, 50] as const;

  // Fetch top tickets with bugs data
  const fetchData = useCallback(async () => {
    if (!boardId) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await getTopTicketsWithBugs(boardId, timeRange, limit);
      setData(result);
    } catch (err) {
      setError('Failed to load top tickets with bugs');
      console.error('Error fetching top tickets with bugs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [boardId, timeRange, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get Jira site URL from environment or use default
  const jiraSiteUrl =
    process.env.NEXT_PUBLIC_JIRA_SITE_URL ||
    'https://provectus-dev.atlassian.net';

  return (
    <div
      className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors"
      role="region"
      aria-label="Top Tickets with Linked Bugs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Top Tickets with Linked Bugs
        </h2>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden" role="group" aria-label="List size">
          {limitOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLimit(option)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                limit === option
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Bugs
                  </th>
                </tr>
              </thead>
              {/* Skeleton Rows */}
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse skeleton-shimmer">
                    <td className="px-4 py-4">
                      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
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
      {!isLoading && !error && data && data.tickets.length === 0 && (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No tickets with bugs found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No tickets with linked bugs in this time period
          </p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && data && data.tickets.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table Header */}
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Bugs
                </th>
              </tr>
            </thead>

            {/* Table Header - extra column for chevron */}
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.tickets.map((ticket, index) => {
                const isExpanded = expandedKey === ticket.key;
                return (
                  <React.Fragment key={ticket.key}>
                    <tr
                      onClick={() => setExpandedKey(isExpanded ? null : ticket.key)}
                      className={`
                        cursor-pointer
                        ${index % 2 === 0 ? '' : 'bg-gray-50 dark:bg-gray-800/50'}
                        ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/10' : ''}
                        hover:bg-blue-50 dark:hover:bg-blue-900/10
                        transition-colors
                      `}
                    >
                      {/* Ticket Key */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <a
                            href={`${jiraSiteUrl}/browse/${ticket.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center gap-1"
                          >
                            {ticket.key}
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
                        </div>
                      </td>

                      {/* Summary */}
                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                        {ticket.summary}
                      </td>

                      {/* Bug Count */}
                      <td className="px-4 py-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          {ticket.bug_count}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Bug Details */}
                    {isExpanded && ticket.bugs.length > 0 && (
                      <tr>
                        <td colSpan={3} className="px-0 py-0">
                          <div className="ml-10 mr-4 my-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-600">
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bug Key</th>
                                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Summary</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {ticket.bugs.map((bug) => (
                                  <tr key={bug.key} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-2">
                                      <a
                                        href={`${jiraSiteUrl}/browse/${bug.key}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:underline text-sm font-medium"
                                      >
                                        {bug.key}
                                      </a>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                      {bug.summary}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
