'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSession,
  getBoards,
  logout,
  SessionExpiredError,
  type Board,
} from '@/lib/api';
import BoardSelector from '@/components/board-selector';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [isFetchingBoards, setIsFetchingBoards] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const session = await getSession();

        if (!session.authenticated) {
          // User is not authenticated, redirect to landing page
          router.push('/');
        } else {
          // User is authenticated, show dashboard
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Handle session expiry silently - just redirect
        if (error instanceof SessionExpiredError) {
          router.push('/');
          return;
        }

        console.error('Error checking authentication:', error);
        // On error, redirect to landing page for safety
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch boards after authentication is confirmed
  useEffect(() => {
    const fetchBoards = async () => {
      if (!isAuthenticated) return;

      try {
        setIsFetchingBoards(true);
        const data = await getBoards();
        setBoards(data.boards);
      } catch (error) {
        // Handle session expiry silently - just redirect
        if (error instanceof SessionExpiredError) {
          router.push('/');
          return;
        }

        console.error('Error fetching boards:', error);
        // Keep boards as empty array on error
      } finally {
        setIsFetchingBoards(false);
      }
    };

    fetchBoards();
  }, [isAuthenticated, router]);

  // Handle board selection
  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to landing page after successful logout
      router.push('/');
    } catch (error) {
      // Handle session expiry silently - just redirect
      if (error instanceof SessionExpiredError) {
        router.push('/');
        return;
      }

      console.error('Error during logout:', error);
      // Still redirect to landing page even on error for safety
      router.push('/');
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            role="status"
            aria-label="Loading"
          />
          <p className="text-lg text-gray-600">Checking authentication...</p>
        </div>
      </main>
    );
  }

  // Only show dashboard if authenticated
  // (the redirect happens in useEffect, but this prevents flash of content)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header with title and logout button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>

        {/* Show loading state while fetching boards */}
        {isFetchingBoards ? (
          <div className="flex items-center gap-3 mb-8">
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
              role="status"
              aria-label="Loading boards"
            />
            <p className="text-gray-600">Loading boards...</p>
          </div>
        ) : (
          <div className="mb-8">
            <BoardSelector
              boards={boards}
              selectedBoard={selectedBoard}
              onSelect={handleBoardSelect}
            />
          </div>
        )}

        {/* Display selected board */}
        {selectedBoard && (
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Selected Board
            </h2>
            <p className="text-lg text-gray-700">
              <span className="font-medium">Board ID:</span> {selectedBoard.id}
            </p>
            <p className="text-lg text-gray-700">
              <span className="font-medium">Board Name:</span>{' '}
              {selectedBoard.name}
            </p>
          </div>
        )}

        {/* Show message if no boards available */}
        {!isFetchingBoards && boards.length === 0 && (
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
