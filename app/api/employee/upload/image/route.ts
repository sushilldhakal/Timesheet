import { NextRequest, NextResponse } from "next/server"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { uploadToCloudinary } from "@/lib/cloudinary"

/** POST /api/employee/upload/image - Upload image to Cloudinary. Returns { url }. Requires employee session. */
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
    const result = await uploadToCloudinary(buffer, {
      folder: "timesheet",
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error("[api/employee/upload/image]", err)
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    )
  }
}
