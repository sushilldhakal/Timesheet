import { NextResponse } from "next/server"
import { needsAdminSetup } from "@/lib/db/setup"

export async function GET() {
  try {
    const setupRequired = await needsAdminSetup()
    return NextResponse.json({ needsSetup: setupRequired })
  } catch (err) {
    console.error("[setup/status]", err)
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    )
  }
}
