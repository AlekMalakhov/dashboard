'use client';

import { useState, useRef, useEffect } from 'react';
import type { Board } from '@/lib/api';

/**
 * Props for the BoardSelector component
 */
export interface BoardSelectorProps {
  boards: Board[];
  selectedBoard: Board | null;
  onSelect: (board: Board) => void;
}

/**
 * BoardSelector Component
 *
 * A searchable dropdown component for selecting Jira boards.
 * Features:
 * - Search/filter boards by name (case-insensitive)
 * - Keyboard navigation support
 * - Accessible with ARIA attributes
 * - Responsive design
 *
 * @param boards - Array of available boards
 * @param selectedBoard - Currently selected board (if any)
 * @param onSelect - Callback function when a board is selected
 */
export default function BoardSelector({
  boards,
  selectedBoard,
  onSelect,
}: BoardSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter boards based on search term
  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle board selection
  const handleBoardSelect = (board: Board) => {
    onSelect(board);
    setSearchTerm('');
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className="w-full max-w-md" ref={dropdownRef}>
      <label
        htmlFor="board-search"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Select a Board
      </label>

      {/* Search Input */}
      <div className="relative">
        <input
          id="board-search"
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedBoard
              ? selectedBoard.name
              : boards.length === 0
              ? 'No boards available'
              : 'Search boards...'
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="board-dropdown"
          aria-autocomplete="list"
          disabled={boards.length === 0}
        />

        {/* Dropdown Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div
          id="board-dropdown"
          className="absolute z-10 w-full max-w-md mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
          aria-label="Board options"
        >
          {filteredBoards.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              {boards.length === 0
                ? 'No boards available'
                : 'No matching boards'}
            </div>
          ) : (
            <ul className="py-1">
              {filteredBoards.map((board) => (
                <li key={board.id}>
                  <button
                    type="button"
                    onClick={() => handleBoardSelect(board)}
                    className={`w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                      selectedBoard?.id === board.id
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'text-gray-900'
                    }`}
                    role="option"
                    aria-selected={selectedBoard?.id === board.id}
                  >
                    {board.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
