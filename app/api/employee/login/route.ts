import { NextRequest, NextResponse } from "next/server"
import { connectDB, Employee } from "@/lib/db"

export const dynamic = "force-dynamic"
import { createEmployeeToken, setEmployeeCookie } from "@/lib/employee-auth"
import { pinLoginSchema } from "@/lib/validation/timesheet"

/** POST /api/employee/login - Verify PIN, create employee session */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = pinLoginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid PIN format" },
        { status: 400 }
      )
    }

    const { pin } = parsed.data
    const pinStr = pin.trim()

    await connectDB()
    const employee = await Employee.findOne({ pin: pinStr }).lean()
    if (!employee) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      )
    }

    const token = await createEmployeeToken({
      sub: String(employee._id),
      pin: pinStr,
    })
    await setEmployeeCookie(token)

    const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : [])
    const roles = arr(employee.role)
    const locations = arr(employee.location)
    const employers = arr(employee.employer)
    const displayRole = locations[0] || employers[0] || roles[0] || ""

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        role: displayRole,
      },
    })
  } catch (err) {
    console.error("[api/employee/login]", err)
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}
