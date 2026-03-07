import { NextRequest, NextResponse } from "next/server"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"

/** GET /api/employees/check-pin?pin=1234 - Check if a PIN is available */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations()
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const pin = searchParams.get("pin")

  if (!pin || pin.length < 4) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 400 })
  }

  try {
    await connectDB()
    const existing = await Employee.findOne({ pin: pin.trim() })
    
    return NextResponse.json({ 
      available: !existing,
      pin: pin.trim()
    })
  } catch (err) {
    console.error("[api/employees/check-pin]", err)
    return NextResponse.json(
      { error: "Failed to check PIN" },
      { status: 500 }
    )
  }
}
