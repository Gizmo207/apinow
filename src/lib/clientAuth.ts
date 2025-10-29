/**
 * Get the current user's auth token from localStorage
 * Returns null if user is not authenticated
 */
export async function getUserAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const storedUser = localStorage.getItem('auth_user');
  
  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);
    // Return a simple dev token based on user ID
    return `dev-${user.uid}`;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

/**
 * Get authorization headers with Bearer token for API requests
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getUserAuthToken();
  
  if (!token) {
    return {
      'Content-Type': 'application/json'
    };
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
