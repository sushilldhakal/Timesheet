import { NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
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

    // Get today's shift data - use Date object for proper MongoDB querying
    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0))
    const todayFormatted = format(now, "dd-MM-yyyy", { locale: enUS })
    
    const shift = await DailyShift.findOne({ 
      pin: employee.pin, 
      date: todayStart 
    }).lean()

    const punches = {
      clockIn: shift?.clockIn?.time ? format(new Date(shift.clockIn.time), "h:mm:ss a", { locale: enUS }) : "",
      breakIn: shift?.breakIn?.time ? format(new Date(shift.breakIn.time), "h:mm:ss a", { locale: enUS }) : "",
      breakOut: shift?.breakOut?.time ? format(new Date(shift.breakOut.time), "h:mm:ss a", { locale: enUS }) : "",
      clockOut: shift?.clockOut?.time ? format(new Date(shift.clockOut.time), "h:mm:ss a", { locale: enUS }) : "",
    }

    return NextResponse.json({ date: todayFormatted, punches })
  } catch (err) {
    console.error("[api/employee/timesheet GET]", err)
    return NextResponse.json(
      { error: "Failed to fetch timesheet" },
      { status: 500 }
    )
  }
}
