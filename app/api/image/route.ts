import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { getEmployeeFromCookie } from "@/lib/employee-auth"

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
export async function GET(request: NextRequest) {
  const dashboardAuth = await getAuthFromCookie()
  const employeeAuth = await getEmployeeFromCookie()

  if (!dashboardAuth && !employeeAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = request.nextUrl.searchParams.get("url")
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
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
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg"
    const blob = await res.blob()

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (err) {
    console.error("[api/image]", err)
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 })
  }
}
