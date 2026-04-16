/**
 * Simple in-memory cache for database queries
 * Useful for caching frequently accessed data like timesheet queries
 *
 * For production with multiple servers, migrate to Redis
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 300000; // 5 minutes in milliseconds

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache with optional TTL
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTTL;
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Get or set cache
   */
  async getOrSet<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) return cached;

    const result = await fn();
    this.set(key, result, ttlMs);
    return result;
  }

  /**
   * Delete cache by key prefix
   */
  delByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats (for monitoring)
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.max(0, entry.expiresAt - Date.now()),
      })),
    };
  }
}

// Export singleton instance
export const queryCache = new QueryCache();
