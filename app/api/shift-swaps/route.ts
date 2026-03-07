import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { ShiftSwapManager } from "@/lib/managers/shift-swap-manager"

/**
 * GET /api/shift-swaps?status=...&employeeId=...
 * List shift swap requests
 */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as any
  const employeeId = searchParams.get("employeeId") || undefined

  try {
    await connectDB()
    const shiftSwapManager = new ShiftSwapManager()
    const swapRequests = await shiftSwapManager.getSwapRequests(status, employeeId)

    return NextResponse.json({ swapRequests })
  } catch (err) {
    console.error("[api/shift-swaps GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch swap requests" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/shift-swaps
 * Create a new shift swap request
 */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { requestorId, recipientId, shiftAssignmentId, reason } = body

    if (!requestorId || !recipientId || !shiftAssignmentId) {
      return NextResponse.json(
        { error: "requestorId, recipientId, and shiftAssignmentId are required" },
        { status: 400 }
      )
    }

    await connectDB()
    const shiftSwapManager = new ShiftSwapManager()
    const swapRequest = await shiftSwapManager.createSwapRequest(
      requestorId,
      recipientId,
      shiftAssignmentId,
      reason
    )

    return NextResponse.json({ swapRequest }, { status: 201 })
  } catch (err) {
    console.error("[api/shift-swaps POST]", err)
    return NextResponse.json(
      { error: "Failed to create swap request" },
      { status: 500 }
    )
  }
}
