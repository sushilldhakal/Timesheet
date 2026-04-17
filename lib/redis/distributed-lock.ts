import { getRedis } from './redis-client'

const LOCK_PREFIX = 'lock:'
const DEFAULT_TTL_MS = 30_000 // 30 seconds — safe for slow DB + mobile networks

// Lua script: only delete key if we still own the value (atomic compare-and-delete)
const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`

/**
 * Acquire a distributed lock.
 * Returns a release function — always call it in a finally block.
 * Throws if the lock is already held.
 */
export async function acquireLock(
  key: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<() => Promise<void>> {
  const redis = getRedis()
  const lockKey = `${LOCK_PREFIX}${key}`
  const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const result = await redis.set(lockKey, lockValue, 'PX', ttlMs, 'NX')

  if (result !== 'OK') {
    throw new Error(`Resource locked: ${key}. Another request is in progress — please retry.`)
  }

  return async () => {
    await redis.eval(RELEASE_SCRIPT, 1, lockKey, lockValue).catch(() => {
      // Ignore release errors — TTL cleans up automatically
    })
  }
}

/**
 * Execute fn while holding a distributed lock.
 * Automatically releases the lock after fn completes (success or error).
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const release = await acquireLock(key, ttlMs)
  try {
    return await fn()
  } finally {
    await release()
  }
}
