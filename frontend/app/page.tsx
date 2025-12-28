'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { triggerJiraOAuth } from '@/lib/nango';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnectToJira = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Trigger OAuth popup via Nango
      const connectionId = await triggerJiraOAuth();

      // Step 2: Send connection ID to backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/callback`, {
        method: 'POST',
        credentials: 'include', // Include cookies for session management
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connection_id: connectionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Authentication failed' }));
        throw new Error(errorData.detail || 'Failed to authenticate with backend');
      }

      // Step 3: Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err) {
      console.error('Error connecting to Jira:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to Jira');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleConnectToJira}
          disabled={isLoading}
          className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
          aria-label="Connect to Jira"
        >
          {isLoading ? 'Connecting...' : 'Connect to Jira'}
        </button>
        {error && (
          <div
            role="alert"
            className="px-4 py-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded-lg"
          >
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
