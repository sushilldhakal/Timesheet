import { Queue } from 'bullmq'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Avoid connection attempts at import time (e.g. during OpenAPI generation).
  lazyConnect: true,
})

let payRunQueue: Queue | null = null

function getPayRunQueue() {
  if (!payRunQueue) {
    // `Queue` can trigger Redis usage during construction in some environments.
    // Lazily instantiate so "importing" this module (e.g. OpenAPI generation)
    // doesn't require Redis.
    payRunQueue = new Queue('pay-run-calculations', { connection: redis })
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
  return getPayRunQueue().add('calculate', data, {
    jobId: `payrun-${data.payRunId}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}

export async function getPayRunJobStatus(payRunId: string) {
  const job = await getPayRunQueue().getJob(`payrun-${payRunId}`)
  if (!job) return { status: 'not_found' }
  const state = await job.getState()
  return { status: state, progress: job.progress, result: job.returnvalue }
}