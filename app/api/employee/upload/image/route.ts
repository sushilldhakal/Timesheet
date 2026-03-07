import { NextRequest, NextResponse } from "next/server"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { uploadFile } from "@/lib/storage"

/** POST /api/employee/upload/image - Upload image to configured storage. Returns { url }. Requires employee session. */
export async function POST(request: NextRequest) {
  const auth = await getEmployeeFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to configured storage provider (Cloudinary or R2)
    const result = await uploadFile(buffer, {
      folder: "timesheet",
      filename: `${Date.now()}-${auth.pin}`,
    })

    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error("[api/employee/upload/image]", err)
    const message = err instanceof Error ? err.message : "Failed to upload image"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
