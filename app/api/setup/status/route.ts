import { NextResponse } from "next/server"
import { needsAdminSetup } from "@/lib/db/setup"

export async function GET() {
  try {
    const setupRequired = await needsAdminSetup()
    return NextResponse.json({ 
      success: true,
      data: {
        isSetupComplete: !setupRequired,
        hasAdmin: !setupRequired,
        databaseConnected: true,
        requiredSteps: setupRequired ? ['Create admin user'] : [],
        completedSteps: setupRequired ? [] : ['Create admin user'],
        needsSetup: setupRequired
      }
    })
  } catch (err) {
    console.error("[setup/status]", err)
    return NextResponse.json(
      { success: false, error: "Failed to check setup status" },
      { status: 500 }
    )
  }
}
