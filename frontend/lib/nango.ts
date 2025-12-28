import Nango from '@nangohq/frontend';

/**
 * Initializes the Nango client with the public key from environment variables
 */
const nangoClient = new Nango({
  publicKey: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY || '',
});

/**
 * Triggers the Jira OAuth flow using Nango
 * Opens a popup window for the user to authenticate with Atlassian
 *
 * @returns Promise<string> The connection ID after successful authentication
 * @throws Error if authentication fails or user cancels
 */
export async function triggerJiraOAuth(): Promise<string> {
  try {
    // Trigger OAuth flow for Jira integration
    // The integration ID should match what's configured in Nango dashboard
    const result = await nangoClient.auth('jira', {
      // Optional: specify user scopes if needed
      // params: { scope: 'read:jira-work write:jira-work' }
    });

    if (!result.connectionId) {
      throw new Error('No connection ID received from Nango');
    }

    return result.connectionId;
  } catch (error) {
    console.error('OAuth authentication failed:', error);
    throw error;
  }
}

/**
 * Gets the Nango client instance
 * Useful for other Nango operations if needed
 */
export function getNangoClient() {
  return nangoClient;
}
