import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { imageProxyService } from "@/lib/services/image/image-proxy-service"

/** GET /api/image?url=... – Auth-protected image proxy. Requires dashboard or employee session. */
export async function GET(req: NextRequest) {
  // Custom auth check since we support both admin and employee auth
  const dashboardAuth = await getAuthFromCookie()
  const employeeAuth = await getEmployeeFromCookie()

  if (!dashboardAuth && !employeeAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get("url")
    const result = await imageProxyService.proxyImage(url)

    if ("json" in result) {
      return NextResponse.json(result.json, { status: result.status })
    }

    return new NextResponse(result.blob, {
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[api/image] Error fetching image:", err)
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}