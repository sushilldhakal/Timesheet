import { NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { connectDB, Employee, DailyShift } from "@/lib/db"

/** GET /api/employee/timesheet - Today's punches for the logged-in employee */
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

    const today = format(new Date(), "dd-MM-yyyy", { locale: enUS })
    const shift = await DailyShift.findOne({ pin: employee.pin, date: today }).lean()

    const punches = {
      clockIn: shift?.clockIn?.time || "",
      breakIn: shift?.breakIn?.time || "",
      breakOut: shift?.breakOut?.time || "",
      clockOut: shift?.clockOut?.time || "",
    }

    return NextResponse.json({ date: today, punches })
  } catch (err) {
    console.error("[api/employee/timesheet GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheet" },
      { status: 500 }
    )
  }
}
