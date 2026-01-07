'use client';

import { useEffect, useRef, useState } from 'react';
import type { IssueDetail } from '@/lib/api';

/**
 * Props for the IssuesModal component
 */
export interface IssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  issues: IssueDetail[];
  jiraSiteUrl?: string;
}

/**
 * IssuesModal Component
 *
 * A modal dialog that displays a list of Jira issues.
 * Features:
 * - Accessible modal with focus trap
 * - Animated backdrop with blur
 * - Slide-up modal animation
 * - Search/filter functionality
 * - Improved table with zebra striping and hover
 * - Sticky table header
 * - Click outside to close
 * - Escape key to close
 * - Scrollable issue list
 * - Links to Jira issues
 *
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback to close the modal
 * @param title - Modal title
 * @param issues - List of issues to display
 * @param jiraSiteUrl - Base URL for Jira links
 */
export default function IssuesModal({
  isOpen,
  onClose,
  title,
  issues,
  jiraSiteUrl = 'https://provectus-dev.atlassian.net',
}: IssuesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset search when modal closes
  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  // Filter issues based on search term
  const filteredIssues = issues.filter(
    (issue) =>
      issue.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPoints = filteredIssues.reduce(
    (sum, issue) => sum + (issue.story_points ?? 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop with blur animation */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal content with slide-up animation */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-slide-up ring-1 ring-black/5 dark:ring-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by key or summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <svg
                  className="w-3 h-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
          <span>
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
            {searchTerm && ` matching "${searchTerm}"`}
          </span>
          <span className="font-medium">
            {totalPoints} story point{totalPoints !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto">
          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                {searchTerm ? 'No issues match your search' : 'No issues found'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Key</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider">Summary</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredIssues.map((issue, index) => (
                  <tr
                    key={issue.key}
                    className={`
                      ${index % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-700/20' : ''}
                      hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                    `}
                  >
                    <td className="px-5 py-3">
                      <a
                        href={`${jiraSiteUrl}/browse/${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium inline-flex items-center gap-1"
                      >
                        {issue.key}
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
                    <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-sm">{issue.summary}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`
                        inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-sm font-medium
                        ${issue.story_points !== null
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'text-gray-400 dark:text-gray-500'
                        }
                      `}>
                        {issue.story_points ?? '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 rounded-lg transition-colors font-medium active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
