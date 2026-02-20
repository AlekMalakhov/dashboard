import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DeveloperLeaderboardTable from '@/components/developer-leaderboard-table';
import * as api from '@/lib/api';
import type { DeveloperLeaderboardResponse } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  getDeveloperLeaderboard: jest.fn(),
}));

const mockGetDeveloperLeaderboard = api.getDeveloperLeaderboard as jest.MockedFunction<
  typeof api.getDeveloperLeaderboard
>;

describe('DeveloperLeaderboardTable', () => {
  // Mock data for testing
  const mockDevelopers: DeveloperLeaderboardResponse = {
    developers: [
      {
        account_id: 'dev1',
        display_name: 'John Doe',
        avatar_url: 'https://example.com/avatar1.jpg',
        rework_ratio: 8.5,
        stories_count: 10,
        story_points_delivered: 50,
        bugs_count: 2,
        bug_points: 4.25,
        stories: [
          {
            key: 'PROJ-101',
            summary: 'Implement user authentication',
            story_points: 8,
          },
          {
            key: 'PROJ-102',
            summary: 'Add password reset feature',
            story_points: 5,
          },
        ],
        bugs: [
          {
            key: 'PROJ-201',
            summary: 'Fix login validation',
            story_points: 2,
            parent_key: 'PROJ-101',
          },
        ],
      },
      {
        account_id: 'dev2',
        display_name: 'Jane Smith',
        avatar_url: null,
        rework_ratio: 18.0,
        stories_count: 8,
        story_points_delivered: 40,
        bugs_count: 3,
        bug_points: 7.2,
        stories: [
          {
            key: 'PROJ-103',
            summary: 'Design dashboard layout',
            story_points: 13,
          },
        ],
        bugs: [
          {
            key: 'PROJ-202',
            summary: 'Fix dashboard layout issue',
            story_points: 3,
            parent_key: 'PROJ-103',
          },
        ],
      },
      {
        account_id: 'dev3',
        display_name: 'Bob Johnson',
        avatar_url: 'https://example.com/avatar3.jpg',
        rework_ratio: 32.5,
        stories_count: 6,
        story_points_delivered: 30,
        bugs_count: 5,
        bug_points: 9.75,
        stories: [],
        bugs: [],
      },
      {
        account_id: 'dev4',
        display_name: 'Alice Williams',
        avatar_url: 'https://example.com/avatar4.jpg',
        rework_ratio: 45.8,
        stories_count: 5,
        story_points_delivered: 25,
        bugs_count: 6,
        bug_points: 11.45,
        stories: [],
        bugs: [],
      },
    ],
    total_developers: 4,
    developers_excluded: 0,
    warning: null,
    unattributed_bugs_count: 0,
    unattributed_bug_points: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Renders loading state initially
   * Verifies that the component shows a loading skeleton before data loads
   */
  it('renders loading state initially', () => {
    // Mock API to return a promise that doesn't resolve immediately
    mockGetDeveloperLeaderboard.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<DeveloperLeaderboardTable boardId={1} timeRange={90} />);

    // Check for loading skeleton elements
    const skeletonRows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(skeletonRows.length).toBeGreaterThan(0);

    // Verify skeleton has animation class
    const firstSkeletonRow = skeletonRows[0];
    expect(firstSkeletonRow).toHaveClass('animate-pulse');
    expect(firstSkeletonRow).toHaveClass('skeleton-shimmer');
  });

  /**
   * Test 2: Renders developer rows after data loads
   * Verifies that the component displays developer data correctly after API success
   */
  it('renders developer rows after data loads', async () => {
    mockGetDeveloperLeaderboard.mockResolvedValue(mockDevelopers);

    render(<DeveloperLeaderboardTable boardId={1} timeRange={90} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Verify all developers are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('Alice Williams')).toBeInTheDocument();

    // Verify metrics are displayed
    expect(screen.getByText('8.5%')).toBeInTheDocument(); // John's rework ratio
    expect(screen.getByText('18.0%')).toBeInTheDocument(); // Jane's rework ratio
    expect(screen.getByText('32.5%')).toBeInTheDocument(); // Bob's rework ratio
    expect(screen.getByText('45.8%')).toBeInTheDocument(); // Alice's rework ratio

    // Verify story counts
    expect(screen.getByText('10')).toBeInTheDocument(); // John's stories
    expect(screen.getByText('50')).toBeInTheDocument(); // John's story points

    // Verify the API was called with correct parameters
    expect(mockGetDeveloperLeaderboard).toHaveBeenCalledWith(1, 90);
  });

  /**
   * Test 3: Expandable rows toggle on click
   * Verifies that clicking a row expands/collapses the detail view
   */
  it('expandable rows toggle on click', async () => {
    mockGetDeveloperLeaderboard.mockResolvedValue(mockDevelopers);

    render(<DeveloperLeaderboardTable boardId={1} timeRange={90} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Initially, expanded details should not be visible (story summary is unique)
    expect(screen.queryByText('Implement user authentication')).not.toBeInTheDocument();
    expect(screen.queryByText('Add password reset feature')).not.toBeInTheDocument();

    // Find the row with John Doe and click it
    const johnRow = screen.getByText('John Doe').closest('tr');
    expect(johnRow).toBeInTheDocument();

    if (johnRow) {
      // Verify initial state
      expect(johnRow).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      await userEvent.click(johnRow);

      // After clicking, expanded details should be visible
      await waitFor(() => {
        expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
      });
      expect(screen.getByText('Add password reset feature')).toBeInTheDocument();
      expect(screen.getByText('Fix login validation')).toBeInTheDocument();

      // Verify the row is marked as expanded
      expect(johnRow).toHaveAttribute('aria-expanded', 'true');

      // Click again to collapse
      await userEvent.click(johnRow);

      // After second click, details should be hidden again
      await waitFor(() => {
        expect(screen.queryByText('Implement user authentication')).not.toBeInTheDocument();
      });
      expect(screen.queryByText('Add password reset feature')).not.toBeInTheDocument();

      // Verify the row is marked as collapsed
      expect(johnRow).toHaveAttribute('aria-expanded', 'false');
    }
  });

  /**
   * Test 4: Color coding applied correctly
   * Verifies that rework ratio badges have correct colors based on percentage
   * - 0-10%: Green (bg-emerald-*)
   * - 11-25%: Blue (bg-blue-*)
   * - 26-40%: Amber (bg-amber-*)
   * - 41%+: Red (bg-red-*)
   */
  it('color coding applied correctly', async () => {
    mockGetDeveloperLeaderboard.mockResolvedValue(mockDevelopers);

    render(<DeveloperLeaderboardTable boardId={1} timeRange={90} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find the badges by their text content
    const johnBadge = screen.getByText('8.5%');
    const janeBadge = screen.getByText('18.0%');
    const bobBadge = screen.getByText('32.5%');
    const aliceBadge = screen.getByText('45.8%');

    // John Doe: 8.5% - Should be green (emerald)
    expect(johnBadge).toHaveClass('bg-emerald-100');
    expect(johnBadge).toHaveClass('text-emerald-800');

    // Jane Smith: 18.0% - Should be blue
    expect(janeBadge).toHaveClass('bg-blue-100');
    expect(janeBadge).toHaveClass('text-blue-800');

    // Bob Johnson: 32.5% - Should be amber
    expect(bobBadge).toHaveClass('bg-amber-100');
    expect(bobBadge).toHaveClass('text-amber-800');

    // Alice Williams: 45.8% - Should be red
    expect(aliceBadge).toHaveClass('bg-red-100');
    expect(aliceBadge).toHaveClass('text-red-800');
  });

});
