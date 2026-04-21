import { NextRequest, NextResponse } from "next/server"
import { uploadFile } from "@/lib/storage"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"

/** POST /api/upload/image - Upload image to R2. Returns { url } */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isAdminOrSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const result = await uploadFile(buffer, {
      orgId: session.tenantId!,
      uploadedBy: session.sub,
      folder: "employees",
      filename: file.name,
      mimeType: file.type,
    })

    return NextResponse.json({ url: result.url })
  } catch (err) {
    console.error("[api/upload/image]", err)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}