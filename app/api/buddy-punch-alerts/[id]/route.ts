import { NextRequest, NextResponse } from "next/server"
import { connectDB, BuddyPunchAlert } from "@/lib/db"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/buddy-punch-alerts/:id - Update status (dismiss/confirm)
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    await connectDB()

    const body = await req.json()
    const { status, notes } = body

    const validStatuses = ["pending", "confirmed_buddy", "dismissed", "false_alarm"]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: " + validStatuses.join(", ") },
        { status: 400 }
      )
    }

    const alert = await BuddyPunchAlert.findByIdAndUpdate(
      id,
      {
        status,
        notes,
        reviewedBy: ctx.auth.sub,
        reviewedAt: new Date(),
      },
      { new: true }
    ).populate("employeeId", "name pin")
     .populate("locationId", "name")
     .populate("reviewedBy", "name")

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Alert updated successfully",
      alert,
    })
  } catch (error: any) {
    console.error("Error updating buddy punch alert:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update alert" },
      { status: 500 }
    )
  }
}

// GET /api/buddy-punch-alerts/:id - Get single alert
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    await connectDB()

    const alert = await BuddyPunchAlert.findById(id)
      .populate("employeeId", "name pin")
      .populate("locationId", "name")
      .populate("reviewedBy", "name")

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      alert,
    })
  } catch (error: any) {
    console.error("Error fetching buddy punch alert:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch alert" },
      { status: 500 }
    )
  }
}

// DELETE /api/buddy-punch-alerts/:id - Delete alert
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    await connectDB()

    const alert = await BuddyPunchAlert.findByIdAndDelete(id)

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Alert deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting buddy punch alert:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete alert" },
      { status: 500 }
    )
  }
}
