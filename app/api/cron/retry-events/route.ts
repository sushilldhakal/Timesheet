import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { eventReplayService } from '@/lib/events/event-replay-service'
import { registerAllListeners } from '@/lib/events/register-listeners'

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret')
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  registerAllListeners() // ensure listeners are registered in this worker

  const result = await eventReplayService.retryFailedListeners({ limit: 100 })

  return NextResponse.json({
    success: true,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
