import { NextRequest } from 'next/server';

export interface AuthContext {
  userId: string;
  email?: string;
}

/**
 * Verify auth token from Authorization header
 * Simple token-based auth without Firebase
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Simple token verification - decode JWT without Firebase
    // For dev: accept any token starting with 'dev-'
    if (token.startsWith('dev-')) {
      return {
        userId: token,
        email: 'dev@example.com'
      };
    }

    // Decode JWT token manually
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    
    return {
      userId: decoded.user_id || decoded.sub || decoded.uid,
      email: decoded.email
    };
  } catch (error) {
    console.error('[Server Auth] Token verification failed:', error);
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
