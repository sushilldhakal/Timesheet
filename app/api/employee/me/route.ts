import { NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { connectDB, Employee, Timesheet } from "@/lib/db"

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
