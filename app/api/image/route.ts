import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"

/** Allowed domains for image proxy – only Cloudinary. Prevents open redirect. */
const ALLOWED_HOSTS = ["res.cloudinary.com"]

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      ALLOWED_HOSTS.some((h) => parsed.hostname === h)
    )
  } catch {
    return false
  }
}

/** GET /api/image?url=... – Auth-protected image proxy. Requires dashboard or employee session. */
export async function GET(req: NextRequest) {
  // Custom auth check since we support both admin and employee auth
  const dashboardAuth = await getAuthFromCookie()
  const employeeAuth = await getEmployeeFromCookie()

  if (!dashboardAuth && !employeeAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const url = searchParams.get("url")
  
  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  const decoded = decodeURIComponent(url)
  
  if (!isAllowedUrl(decoded)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
  }

  try {
    const res = await fetch(decoded, {
      headers: { Accept: "image/*" },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      console.log(`[api/image] Image not found: ${decoded} (${res.status})`)
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg"
    
    // Validate content type
    if (!contentType.startsWith("image/")) {
      console.log(`[api/image] Invalid content type: ${contentType} for ${decoded}`)
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 })
    }

    const blob = await res.blob()

    // Return raw NextResponse for binary data
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[api/image] Error fetching image:", decoded, err)
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}