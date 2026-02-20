import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { deleteImagesOlderThanDate } from "@/lib/cloudinary"

/** POST /api/admin/cleanup/cloudinary - Delete Cloudinary images older than date (admin only). Body: { beforeDate: "YYYY-MM-DD" } */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminOrSuperAdmin(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const beforeDate = typeof body.beforeDate === "string" ? body.beforeDate.trim() : ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate)) {
      return NextResponse.json(
        { error: "Invalid beforeDate. Use YYYY-MM-DD format." },
        { status: 400 }
      )
    }

    const { deleted, errors } = await deleteImagesOlderThanDate(beforeDate, "timesheet")

    return NextResponse.json({ deleted, errors })
  } catch (err) {
    console.error("[api/admin/cleanup/cloudinary]", err)
    return NextResponse.json(
      { error: "Failed to delete images" },
      { status: 500 }
    )
  }
}
