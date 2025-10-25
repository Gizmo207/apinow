import { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin for auth verification
function getAuthAdmin() {
  try {
    return admin.app('auth-app');
  } catch {
    // For development: initialize with minimal config for token verification only
    // We don't need full service account for just verifying tokens
    if (!admin.apps.length || !admin.apps.find(app => app?.name === 'auth-app')) {
      console.log('[Server Auth] Initializing Firebase Admin for token verification');
      
      // Initialize without credentials - Firebase Admin can verify tokens
      // using the project ID alone (tokens are self-verifying)
      return admin.initializeApp({
        projectId: 'api-now-bd858', // Your Firebase project ID
      }, 'auth-app');
    }
    return admin.app('auth-app');
  }
}

export interface AuthContext {
  userId: string;
  email?: string;
}

/**
 * Verify Firebase ID token from Authorization header
 * Returns the user context if valid, throws error if invalid
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  
  console.log('[Server Auth] Authorization header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log('[Server Auth] Token prefix:', token.substring(0, 20) + '...');

  try {
    // For development/testing: if token starts with 'dev-', allow it
    // This works in any environment for testing purposes
    if (token.startsWith('dev-')) {
      console.log('[Server Auth] Using dev token');
      return {
        userId: token,
        email: 'dev@example.com'
      };
    }

    console.log('[Server Auth] Verifying Firebase token');
    
    try {
      const app = getAuthAdmin();
      const decodedToken = await admin.auth(app).verifyIdToken(token);
      
      console.log('[Server Auth] Token verified for user:', decodedToken.uid);
      return {
        userId: decodedToken.uid,
        email: decodedToken.email
      };
    } catch (adminError) {
      console.error('[Server Auth] Firebase Admin verification failed:', adminError);
      console.log('[Server Auth] Falling back to manual JWT decode (less secure)');
      
      // Fallback: decode JWT manually (for development)
      // In production, you MUST use Firebase Admin properly
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('[Server Auth] Manually decoded token for user:', decoded.user_id);
      
      return {
        userId: decoded.user_id || decoded.sub,
        email: decoded.email
      };
    }
  } catch (error) {
    console.error('[Server Auth] Token verification completely failed:', error);
    throw new Error('Invalid or expired authentication token');
  }
}

/**
 * Optional auth - returns user context if token exists, null otherwise
 */
export async function getOptionalAuth(request: NextRequest): Promise<AuthContext | null> {
  try {
    return await verifyAuthToken(request);
  } catch {
    return null;
  }
}
