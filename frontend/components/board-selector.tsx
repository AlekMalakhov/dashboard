'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Board } from '@/lib/api';

/**
 * Props for the BoardSelector component
 */
export interface BoardSelectorProps {
  boards: Board[];
  selectedBoard: Board | null;
  onSelect: (board: Board) => void;
  onClear?: () => void;
  disabled?: boolean;
}

/**
 * BoardSelector Component
 *
 * A searchable dropdown component for selecting Jira boards.
 * Features:
 * - Search/filter boards by name (case-insensitive)
 * - Full keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Clear selection button
 * - Dropdown open animation
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
  onClear,
  disabled = false,
}: BoardSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter boards based on search term
  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Handle board selection
  const handleBoardSelect = useCallback((board: Board) => {
    onSelect(board);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [onSelect]);

  // Handle clear selection
  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    if (selectedBoard) {
      onClear?.();
      // Keep dropdown open so user can immediately pick another board.
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
    inputRef.current?.focus();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredBoards.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredBoards[highlightedIndex]) {
          handleBoardSelect(filteredBoards[highlightedIndex]);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="w-full max-w-md" ref={dropdownRef}>
      <label
        htmlFor="board-search"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
            setHighlightedIndex(-1);
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
          className={`w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
            selectedBoard && !searchTerm ? 'font-medium' : ''
          } ${disabled ? 'cursor-not-allowed opacity-75' : ''}`}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="board-dropdown"
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0 ? `board-option-${highlightedIndex}` : undefined
          }
          disabled={boards.length === 0 || disabled}
        />

        {/* Clear button (shown when there's a selection or search term, hidden when disabled) */}
        {!disabled && (selectedBoard || searchTerm) && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="absolute inset-y-0 right-10 flex items-center pr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear selection"
          >
            <svg
              className="w-4 h-4"
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

        {/* Dropdown Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
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
      {isOpen && !disabled && (
        <div
          id="board-dropdown"
          className="absolute z-10 w-full max-w-md mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto animate-fade-in ring-1 ring-black/5 dark:ring-white/10"
          role="listbox"
          aria-label="Board options"
        >
          {filteredBoards.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              {boards.length === 0
                ? 'No boards available'
                : 'No matching boards'}
            </div>
          ) : (
            <ul ref={listRef} className="py-1">
              {filteredBoards.map((board, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = selectedBoard?.id === board.id;

                return (
                  <li key={board.id}>
                    <button
                      type="button"
                      id={`board-option-${index}`}
                      onClick={() => handleBoardSelect(board)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-4 py-2.5 focus:outline-none transition-colors flex items-center justify-between ${
                        isHighlighted
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : ''
                      } ${
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-medium'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span>{board.name}</span>
                      {isSelected && (
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Keyboard hint */}
      {isOpen && !disabled && filteredBoards.length > 0 && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          Use <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">↓</kbd> to navigate, <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">Enter</kbd> to select
        </p>
      )}
    </div>
  );
}
