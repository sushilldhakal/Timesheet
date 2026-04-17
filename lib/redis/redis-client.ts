import { Redis } from 'ioredis'

const GLOBAL_KEY = '__timesheet_redis__'
declare global {
  // eslint-disable-next-line no-var
  var __timesheet_redis__: Redis | undefined
}

/**
 * Returns a singleton Redis client.
 * Throws if REDIS_URL is not set — callers should handle this gracefully
 * when Redis is optional (e.g. dev without Redis).
 */
export function getRedis(): Redis {
  if (globalThis.__timesheet_redis__) return globalThis.__timesheet_redis__

  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL not set. Add to .env: REDIS_URL=redis://localhost:6379')
  }

  const redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  })

  redis.on('error', (err) => {
    if ((err as any).code !== 'ECONNREFUSED') {
      console.error('[Redis]', err.message)
    }
  })

  globalThis.__timesheet_redis__ = redis
  return redis
}

/**
 * Returns a Redis client or null if REDIS_URL is not configured.
 * Use this in optional Redis paths (e.g. idempotency cache) where
 * the feature should degrade gracefully without Redis.
 */
export function getRedisOptional(): Redis | null {
  try {
    return getRedis()
  } catch {
    return null
  }
}
