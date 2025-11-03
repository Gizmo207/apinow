import { NextRequest } from 'next/server';

/**
 * Extract current user id from the incoming request.
 * Temporary implementation:
 * - Prefer header `x-user-id` (set by your frontend/auth middleware)
 * - Fallback to `x-user` for compatibility
 * If none is present, returns undefined and routes may respond 401/403.
 */
export function getCurrentUserId(req: NextRequest | Request): string | undefined {
  try {
    const headers = (req as any).headers as Headers;
    if (!headers) return undefined;
    const uid = headers.get('x-user-id') || headers.get('x-user') || undefined;
    return uid ? String(uid) : undefined;
  } catch {
    return undefined;
  }
}
