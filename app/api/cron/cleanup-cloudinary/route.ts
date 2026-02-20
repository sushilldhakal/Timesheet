import { NextRequest, NextResponse } from "next/server"
import { deleteTimesheetImagesOlderThanDays } from "@/lib/cloudinary"

const OLDER_THAN_DAYS = 40

/**
 * GET/POST /api/cron/cleanup-cloudinary
 * Deletes Cloudinary images in the timesheet folder older than 40 days.
 * Call daily at midnight (e.g. Vercel Cron or external cron with CRON_SECRET).
 */
export async function GET(request: NextRequest) {
  return runCleanup(request)
}

export async function POST(request: NextRequest) {
  return runCleanup(request)
}

async function runCleanup(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? request.nextUrl.searchParams.get("secret")

  const expected = process.env.CRON_SECRET
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { deleted, errors } = await deleteTimesheetImagesOlderThanDays(OLDER_THAN_DAYS)
    return NextResponse.json({
      ok: true,
      deleted,
      errors,
      message: `Deleted ${deleted} image(s) older than ${OLDER_THAN_DAYS} days; ${errors} error(s).`,
    })
  } catch (err) {
    console.error("[cron/cleanup-cloudinary]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cleanup failed" },
      { status: 500 }
    )
  }
}
