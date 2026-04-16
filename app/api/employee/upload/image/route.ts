import { NextRequest, NextResponse } from "next/server"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { employeeUploadImageService } from "@/lib/services/employee/employee-upload-image-service"

/** 
 * POST /api/employee/upload/image - Upload image to configured storage. 
 * Returns { url }. Requires employee session.
 * 
 * Note: This route handles multipart/form-data and cannot use createApiRoute
 * due to the file upload requirements. It maintains the original implementation
 * but will be documented in the OpenAPI spec manually.
 */
export async function POST(request: NextRequest) {
  const auth = await getEmployeeFromCookie()
  try {
    const formData = await request.formData()
    const result = await employeeUploadImageService.upload(auth, formData)
    return NextResponse.json(result.data, { status: result.status })
  } catch (err) {
    console.error("[api/employee/upload/image]", err)
    const message = err instanceof Error ? err.message : "Failed to upload image"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
