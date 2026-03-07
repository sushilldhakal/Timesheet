import { NextRequest, NextResponse } from "next/server"
import { connectDB, StaffFaceProfile } from "@/lib/db"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"

type RouteContext = { params: Promise<{ employeeId: string }> }

// GET /api/face-profiles/:employeeId - Fetch descriptor for matching
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { employeeId } = await context.params

    await connectDB()

    const profile = await StaffFaceProfile.findOne({
      employeeId,
      isActive: true,
    }).select("-descriptor")

    if (!profile) {
      return NextResponse.json(
        { error: "Face profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error: any) {
    console.error("Error fetching face profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch face profile" },
      { status: 500 }
    )
  }
}

// DELETE /api/face-profiles/:employeeId - GDPR right to erasure
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { employeeId } = await context.params

    await connectDB()

    const profile = await StaffFaceProfile.findOneAndDelete({
      employeeId,
    })

    if (!profile) {
      return NextResponse.json(
        { error: "Face profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Face profile deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting face profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete face profile" },
      { status: 500 }
    )
  }
}

// PATCH /api/face-profiles/:employeeId - Toggle active status
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { employeeId } = await context.params

    await connectDB()

    const body = await req.json()
    const { isActive } = body

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      )
    }

    const profile = await StaffFaceProfile.findOneAndUpdate(
      { employeeId },
      { isActive },
      { new: true }
    )

    if (!profile) {
      return NextResponse.json(
        { error: "Face profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Face profile ${isActive ? "activated" : "deactivated"} successfully`,
      profile,
    })
  } catch (error: any) {
    console.error("Error updating face profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update face profile" },
      { status: 500 }
    )
  }
}
