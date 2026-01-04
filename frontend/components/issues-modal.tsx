'use client';

import { useEffect, useRef } from 'react';
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
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPoints = issues.reduce(
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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

        {/* Summary */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} • {totalPoints} story point{totalPoints !== 1 ? 's' : ''}
        </div>

        {/* Issue list */}
        <div className="flex-1 overflow-y-auto p-4">
          {issues.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No issues found</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Key</th>
                  <th className="pb-2 font-medium">Summary</th>
                  <th className="pb-2 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr
                    key={issue.key}
                    className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <a
                        href={`${jiraSiteUrl}/browse/${issue.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
                      >
                        {issue.key}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{issue.summary}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {issue.story_points ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
