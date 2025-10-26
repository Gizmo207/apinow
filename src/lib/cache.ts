import Redis from 'ioredis';

// Initialize Redis client
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Only initialize on server side
  if (typeof window !== 'undefined') {
    return null;
  }

  if (!redis) {
    try {
      // Check if REDIS_URL is configured
      if (!process.env.REDIS_URL) {
        console.warn('[Cache] REDIS_URL not configured, caching disabled');
        return null;
      }

      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        // Gracefully handle connection errors
        lazyConnect: true,
      });

      redis.on('error', (err) => {
        console.error('[Cache] Redis error:', err.message);
      });

      redis.on('connect', () => {
        console.log('[Cache] ✅ Redis connected');
      });

      // Test connection
      redis.connect().catch((err) => {
        console.error('[Cache] Failed to connect to Redis:', err.message);
        redis = null;
      });
    } catch (error) {
      console.error('[Cache] Failed to initialize Redis:', error);
      redis = null;
    }
  }

  return redis;
}

/**
 * Generate a cache key for an API endpoint
 */
export function generateCacheKey(endpointPath: string, queryParams: URLSearchParams): string {
  const params = Object.fromEntries(queryParams);
  // Remove the API key from cache key (different keys should share cache)
  delete params.key;
  
  const paramsString = Object.keys(params).length > 0 
    ? JSON.stringify(params)
    : '';
  
  return `api:${endpointPath}:${paramsString}`;
}

/**
 * Get cached response
 */
export async function getCached(key: string): Promise<any | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log('[Cache] ✅ HIT:', key);
      return JSON.parse(cached);
    }
    console.log('[Cache] ❌ MISS:', key);
    return null;
  } catch (error) {
    console.error('[Cache] Get error:', error);
    return null;
  }
}

/**
 * Set cached response with TTL
 */
export async function setCached(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    console.log(`[Cache] ✅ SET: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error('[Cache] Set error:', error);
  }
}

/**
 * Invalidate cache for an endpoint
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] 🗑️ Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (error) {
    console.error('[Cache] Invalidate error:', error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.flushdb();
    console.log('[Cache] 🗑️ Cleared all cache');
  } catch (error) {
    console.error('[Cache] Clear error:', error);
  }
}
