import { auth } from '@/lib/firebaseConfig';

/**
 * Wait for auth to be ready (user loaded or confirmed not logged in)
 */
function waitForAuth(): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      resolve();
    });
  });
}

/**
 * Get the current user's ID token for API authentication
 * Returns null if user is not authenticated
 */
export async function getUserAuthToken(): Promise<string | null> {
  // Wait for auth state to be ready
  await waitForAuth();
  
  const user = auth.currentUser;
  
  if (!user) {
    console.warn('No user authenticated');
    return null;
  }

  try {
    // Get fresh token (force refresh if older than 5 minutes)
    const token = await user.getIdToken();
    console.log('Auth token retrieved successfully');
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Get authorization headers with Bearer token for API requests
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  await waitForAuth();
  
  const user = auth.currentUser;
  
  if (!user) {
    console.warn('No authenticated user for auth headers');
    return {
      'Content-Type': 'application/json'
    };
  }

  try {
    // Try to get real token first
    const token = await user.getIdToken();
    console.log('Using real Firebase ID token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error('Failed to get ID token, using dev token:', error);
    // Fallback to dev token
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer dev-${user.uid}`
    };
  }
}
