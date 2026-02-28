import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth-api"
import { connectDB } from "@/lib/db"
import { ShiftSwapManager } from "@/lib/managers/shift-swap-manager"

/**
 * PATCH /api/shift-swaps/[id]/accept
 * Recipient accepts a shift swap request
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
    const { recipientId } = body

    if (!recipientId) {
      return NextResponse.json(
        { error: "recipientId is required" },
        { status: 400 }
      )
    }

    await connectDB()
    const shiftSwapManager = new ShiftSwapManager()
    const swapRequest = await shiftSwapManager.acceptSwapRequest(
      id,
      recipientId
    )

    return NextResponse.json({ swapRequest })
  } catch (err: any) {
    console.error("[api/shift-swaps/[id]/accept PATCH]", err)

    if (err.message?.includes("not found")) {
      return NextResponse.json(
        { error: err.message },
        { status: 404 }
      )
    }

    if (err.message?.includes("not in PENDING_RECIPIENT")) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to accept swap request" },
      { status: 500 }
    )
  }
}
