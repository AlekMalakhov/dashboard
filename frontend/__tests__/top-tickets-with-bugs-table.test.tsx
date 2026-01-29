import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import TopTicketsWithBugsTable from '@/components/top-tickets-with-bugs-table';
import * as api from '@/lib/api';
import type { TopTicketsWithBugsResponse } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  getTopTicketsWithBugs: jest.fn(),
}));

const mockGetTopTicketsWithBugs = api.getTopTicketsWithBugs as jest.MockedFunction<
  typeof api.getTopTicketsWithBugs
>;

describe('TopTicketsWithBugsTable', () => {
  const mockData: TopTicketsWithBugsResponse = {
    tickets: [
      {
        key: 'PROJ-100',
        summary: 'Implement login flow',
        issue_type: 'Story',
        bug_count: 3,
        bugs: [
          { key: 'PROJ-201', summary: 'Login button unresponsive', link_type: 'is caused by' },
          { key: 'PROJ-202', summary: 'Password field not masked', link_type: 'is caused by' },
          { key: 'PROJ-203', summary: 'Session timeout too short', link_type: 'is caused by' },
        ],
      },
      {
        key: 'PROJ-101',
        summary: 'Build dashboard page',
        issue_type: 'Story',
        bug_count: 2,
        bugs: [
          { key: 'PROJ-301', summary: 'Chart not rendering', link_type: 'is caused by' },
          { key: 'PROJ-302', summary: 'Data refresh broken', link_type: 'is caused by' },
        ],
      },
    ],
    total_tickets_with_bugs: 2,
    time_range_days: 90,
    link_types_used: ['is caused by'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 1: Renders loading state initially
   */
  it('renders loading state initially', () => {
    mockGetTopTicketsWithBugs.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<TopTicketsWithBugsTable boardId={1} timeRange={90} />);

    // Check for loading skeleton rows
    const skeletonRows = screen.getAllByRole('row').slice(1); // Skip header row
    expect(skeletonRows.length).toBeGreaterThan(0);

    // Verify skeleton has animation class
    const firstSkeletonRow = skeletonRows[0];
    expect(firstSkeletonRow).toHaveClass('animate-pulse');
    expect(firstSkeletonRow).toHaveClass('skeleton-shimmer');
  });

  /**
   * Test 2: Renders data correctly after API returns
   */
  it('renders data correctly after API returns', async () => {
    mockGetTopTicketsWithBugs.mockResolvedValue(mockData);

    render(<TopTicketsWithBugsTable boardId={1} timeRange={90} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('PROJ-100')).toBeInTheDocument();
    });

    // Verify ticket keys and summaries
    expect(screen.getByText('PROJ-100')).toBeInTheDocument();
    expect(screen.getByText('Implement login flow')).toBeInTheDocument();
    expect(screen.getByText('PROJ-101')).toBeInTheDocument();
    expect(screen.getByText('Build dashboard page')).toBeInTheDocument();

    // Verify bug counts
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Verify the API was called with correct parameters
    expect(mockGetTopTicketsWithBugs).toHaveBeenCalledWith(1, 90, 10);
  });

  /**
   * Test 3: Expand/collapse row on click
   */
  it('expands and collapses a row on click', async () => {
    mockGetTopTicketsWithBugs.mockResolvedValue(mockData);

    render(<TopTicketsWithBugsTable boardId={1} timeRange={90} />);

    await waitFor(() => {
      expect(screen.getByText('PROJ-100')).toBeInTheDocument();
    });

    // Bug details should not be visible initially
    expect(screen.queryByText('Login button unresponsive')).not.toBeInTheDocument();

    // Click the first ticket row to expand
    const ticketRow = screen.getByText('Implement login flow').closest('tr');
    expect(ticketRow).toBeInTheDocument();

    await userEvent.click(ticketRow!);

    // Bug details should now be visible
    await waitFor(() => {
      expect(screen.getByText('Login button unresponsive')).toBeInTheDocument();
    });
    expect(screen.getByText('Password field not masked')).toBeInTheDocument();
    expect(screen.getByText('Session timeout too short')).toBeInTheDocument();

    // Click again to collapse
    await userEvent.click(ticketRow!);

    await waitFor(() => {
      expect(screen.queryByText('Login button unresponsive')).not.toBeInTheDocument();
    });
  });

  /**
   * Test 4: Only one row expanded at a time
   */
  it('only one row is expanded at a time', async () => {
    mockGetTopTicketsWithBugs.mockResolvedValue(mockData);

    render(<TopTicketsWithBugsTable boardId={1} timeRange={90} />);

    await waitFor(() => {
      expect(screen.getByText('PROJ-100')).toBeInTheDocument();
    });

    // Expand first row
    const firstRow = screen.getByText('Implement login flow').closest('tr');
    await userEvent.click(firstRow!);

    await waitFor(() => {
      expect(screen.getByText('Login button unresponsive')).toBeInTheDocument();
    });

    // Expand second row
    const secondRow = screen.getByText('Build dashboard page').closest('tr');
    await userEvent.click(secondRow!);

    // Second row bugs should be visible
    await waitFor(() => {
      expect(screen.getByText('Chart not rendering')).toBeInTheDocument();
    });

    // First row bugs should be collapsed
    expect(screen.queryByText('Login button unresponsive')).not.toBeInTheDocument();
  });

  /**
   * Test 5: Limit selector triggers refetch
   */
  it('changing limit triggers a new API call', async () => {
    mockGetTopTicketsWithBugs.mockResolvedValue(mockData);

    render(<TopTicketsWithBugsTable boardId={1} timeRange={90} />);

    await waitFor(() => {
      expect(screen.getByText('PROJ-100')).toBeInTheDocument();
    });

    // Initial call with default limit of 10
    expect(mockGetTopTicketsWithBugs).toHaveBeenCalledWith(1, 90, 10);

    // Click the "20" limit button
    const button20 = screen.getByRole('button', { name: '20' });
    await userEvent.click(button20);

    // Should trigger a new API call with limit=20
    await waitFor(() => {
      expect(mockGetTopTicketsWithBugs).toHaveBeenCalledWith(1, 90, 20);
    });
  });
});
