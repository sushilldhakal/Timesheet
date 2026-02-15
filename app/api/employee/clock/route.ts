import { NextRequest, NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie } from "@/lib/employee-auth"
import { connectDB, Employee, Timesheet } from "@/lib/db"
import { z } from "zod"

const clockBodySchema = z.object({
  type: z.enum(["in", "out", "break", "endBreak"]),
  imageUrl: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
})

/** POST /api/employee/clock - Clock in/out/break. Requires employee session. */
export async function POST(request: NextRequest) {
  const auth = await getEmployeeFromCookie()
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = clockBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { type, imageUrl: clientImageUrl, date: clientDate, time: clientTime, lat, lng } = parsed.data

    await connectDB()
    const employee = await Employee.findById(auth.sub).lean()
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const imageUrl = (clientImageUrl && clientImageUrl.trim()) || ""
    const latStr = (lat && String(lat).trim()) || ""
    const lngStr = (lng && String(lng).trim()) || ""
    const where = latStr && lngStr ? `${latStr},${lngStr}` : ""
    const flag = !imageUrl || !latStr || !lngStr

    const now = new Date()
    const dateStr =
      clientDate && clientDate.trim()
        ? clientDate.trim()
        : format(now, "dd-MM-yyyy", { locale: enUS })
    const timeStr =
      clientTime && clientTime.trim()
        ? clientTime.trim()
        : format(now, "EEEE, MMMM d, yyyy h:mm:ss a", { locale: enUS })

    await Timesheet.create({
      pin: employee.pin,
      type,
      date: dateStr,
      time: timeStr,
      image: imageUrl,
      lat: latStr,
      lng: lngStr,
      where,
      flag,
    })

    return NextResponse.json({
      success: true,
      type,
      date: dateStr,
      time: timeStr,
      lat: latStr,
      lng: lngStr,
      where,
      flag,
    })
  } catch (err) {
    console.error("[api/employee/clock]", err)
    return NextResponse.json(
      { error: "Clock in/out failed" },
      { status: 500 }
    )
  }
}
