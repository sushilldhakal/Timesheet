import { NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { connectDB, Employee, DailyShift } from "@/lib/db"

/** GET /api/employee/me - Current authenticated employee + today's punches (single fetch) */
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

    const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : [])
    const roles = arr(employee.role)
    const locations = arr(employee.location)
    const employers = arr(employee.employer)
    const displayRole = locations[0] || employers[0] || roles[0] || ""

    const today = format(new Date(), "dd-MM-yyyy", { locale: enUS })
    const shift = await DailyShift.findOne({ pin: employee.pin, date: today }).lean()

    const punches = {
      clockIn: shift?.clockIn?.time || "",
      breakIn: shift?.breakIn?.time || "",
      breakOut: shift?.breakOut?.time || "",
      clockOut: shift?.clockOut?.time || "",
    }

    return NextResponse.json({
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        role: displayRole,
        employer: employee.employer,
        location: employee.location,
        img: employee.img,
      },
      punches,
    })
  } catch (err) {
    console.error("[api/employee/me]", err)
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    )
  }
}
