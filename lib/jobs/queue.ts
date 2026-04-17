import { Queue } from 'bullmq'
import Redis from 'ioredis'

let redis: Redis | null = null
let payRunQueue: Queue | null = null

function getRedis(): Redis {
  if (!redis) {
    // Only connect to Redis if REDIS_URL is explicitly set
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL not configured. Redis is optional but must be explicitly enabled.')
    }
    
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      // Don't throw on connection failure — let callers handle it gracefully
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null, // disable auto-retry — fail fast
    })

    redis.on('error', (err) => {
      // Suppress ECONNREFUSED and AggregateError noise in dev when Redis isn't running
      const isRedisError = (err as any).code === 'ECONNREFUSED' || 
                          err instanceof AggregateError
      if (!isRedisError) {
        console.error('[Redis] connection error:', err.message)
      }
    })
  }
  return redis
}

function getPayRunQueue(): Queue {
  if (!payRunQueue) {
    payRunQueue = new Queue('pay-run-calculations', {
      connection: getRedis(),
    })

    payRunQueue.on('error', (err) => {
      // Suppress ECONNREFUSED and AggregateError noise in dev when Redis isn't running
      const isRedisError = (err as any).code === 'ECONNREFUSED' || 
                          err instanceof AggregateError
      if (!isRedisError) {
        console.error('[PayRunQueue] error:', err.message)
      }
    })
  }
  return payRunQueue
}

export interface PayRunJobData {
  payRunId: string
  tenantId: string
  startDate: string
  endDate: string
  userId: string
}

export async function queuePayRunCalculation(data: PayRunJobData) {
  try {
    return await getPayRunQueue().add('calculate', data, {
      jobId: `payrun-${data.payRunId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    })
  } catch (err: any) {
    if (err?.code === 'ECONNREFUSED') {
      throw new Error('Redis is not available. Pay run calculation queue is offline.')
    }
    throw err
  }
}

export async function getPayRunJobStatus(payRunId: string) {
  try {
    const job = await getPayRunQueue().getJob(`payrun-${payRunId}`)
    if (!job) return { status: 'not_found' }
    const state = await job.getState()
    return { status: state, progress: job.progress, result: job.returnvalue }
  } catch (err: any) {
    if (err?.code === 'ECONNREFUSED') {
      return { status: 'unavailable' }
    }
    throw err
  }
}
