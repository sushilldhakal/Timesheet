import { NextResponse } from "next/server"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { connectDB, Employee } from "@/lib/db"

/** GET /api/employee/me - Current authenticated employee */
export async function GET() {
  const auth = await getEmployeeFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const employee = await Employee.findById(auth.sub).lean()
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        role: employee.role,
        employer: employee.employer,
        location: employee.location,
        img: employee.img,
      },
    })
  } catch (err) {
    console.error("[api/employee/me]", err)
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    )
  }
}
