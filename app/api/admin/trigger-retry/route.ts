import { NextResponse } from "next/server"
import { getTenantContext } from "@/lib/auth/tenant-context"
import { connectDB } from "@/lib/db"
import { eventReplayService } from "@/lib/events/event-replay-service"
import { registerAllListeners } from "@/lib/events/register-listeners"

export async function POST() {
  const ctx = await getTenantContext()
  if (!ctx || ctx.type !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (ctx as any).role
  if (role !== "admin" && role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await connectDB()
    registerAllListeners()

    const result = await eventReplayService.retryFailedListeners({ limit: 100 })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
