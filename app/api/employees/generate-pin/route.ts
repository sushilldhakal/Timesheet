import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, Employee } from "@/lib/db"

/** GET /api/employees/generate-pin - Returns a unique random 4-digit PIN for clock-in */
export async function GET() {
  const auth = await getAuthFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const existing = await Employee.find({}, { pin: 1 }).lean()
    const usedPins = new Set((existing || []).map((e) => String(e.pin ?? "")))

    let pin: string
    let attempts = 0
    const maxAttempts = 100
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000))
      attempts++
      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "Could not generate unique PIN. Try again." },
          { status: 500 }
        )
      }
    } while (usedPins.has(pin))

    return NextResponse.json({ pin })
  } catch (err) {
    console.error("[api/employees/generate-pin]", err)
    return NextResponse.json(
      { error: "Failed to generate PIN" },
      { status: 500 }
    )
  }
}
