import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { ShiftSwapManager } from "@/lib/managers/shift-swap-manager"

/**
 * PATCH /api/shift-swaps/[id]/approve
 * Manager approves a shift swap request
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const { managerId, organizationId } = body

    if (!managerId || !organizationId) {
      return NextResponse.json(
        { error: "managerId and organizationId are required" },
        { status: 400 }
      )
    }

    await connectDB()
    const shiftSwapManager = new ShiftSwapManager()
    const swapRequest = await shiftSwapManager.approveSwapRequest(
      id,
      managerId,
      organizationId
    )

    return NextResponse.json({ swapRequest })
  } catch (err: any) {
    console.error("[api/shift-swaps/[id]/approve PATCH]", err)

    if (err.message?.includes("not found")) {
      return NextResponse.json(
        { error: err.message },
        { status: 404 }
      )
    }

    if (err.message?.includes("not in PENDING_MANAGER")) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to approve swap request" },
      { status: 500 }
    )
  }
}
