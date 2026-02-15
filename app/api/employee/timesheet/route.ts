import { NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { connectDB, Employee, Timesheet } from "@/lib/db"

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
    const raw = await Timesheet.find({ pin: employee.pin, date: today })
      .sort({ time: 1 })
      .lean()

    const punches = {
      clockIn: "",
      breakIn: "",
      breakOut: "",
      clockOut: "",
    }

    for (const r of raw) {
      const t = String(r.time ?? "").trim()
      const type = String(r.type ?? "").toLowerCase().replace(/\s/g, "")
      if (type === "in") punches.clockIn = t
      else if (type === "break") punches.breakIn = t
      else if (type === "endbreak") punches.breakOut = t
      else if (type === "out") punches.clockOut = t
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
