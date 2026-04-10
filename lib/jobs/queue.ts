import { Queue } from 'bullmq'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export const payRunQueue = new Queue('pay-run-calculations', { connection: redis })

export interface PayRunJobData {
  payRunId: string
  tenantId: string
  startDate: string
  endDate: string
  userId: string
}

export async function queuePayRunCalculation(data: PayRunJobData) {
  return payRunQueue.add('calculate', data, {
    jobId: `payrun-${data.payRunId}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  })
}

export async function getPayRunJobStatus(payRunId: string) {
  const job = await payRunQueue.getJob(`payrun-${payRunId}`)
  if (!job) return { status: 'not_found' }
  const state = await job.getState()
  return { status: state, progress: job.progress, result: job.returnvalue }
}