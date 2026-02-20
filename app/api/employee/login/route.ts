import { NextRequest, NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { connectDB, Employee, Timesheet, Category } from "@/lib/db"
import { createEmployeeToken, setEmployeeCookie } from "@/lib/employee-auth"
import { pinLoginSchema } from "@/lib/validation/timesheet"
import { isWithinGeofence } from "@/lib/utils/geofence"

export const dynamic = "force-dynamic"

/**
 * Check if today is the employee's birthday
 * Supports formats: YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY
 */
function checkIfBirthday(dob?: string): boolean {
  if (!dob || typeof dob !== "string" || !dob.trim()) return false
  
  const today = new Date()
  const todayMonth = today.getMonth() + 1 // 1-12
  const todayDay = today.getDate() // 1-31
  
  const dobStr = dob.trim()
  
  // Try different date formats
  let month: number | null = null
  let day: number | null = null
  
  // Format: YYYY-MM-DD (e.g., "1998-12-12")
  const isoMatch = dobStr.match(/^\d{4}-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    month = parseInt(isoMatch[1], 10)
    day = parseInt(isoMatch[2], 10)
  }
  
  // Format: DD-MM-YYYY (e.g., "12-12-1998")
  const ddmmyyyyMatch = dobStr.match(/^(\d{1,2})-(\d{1,2})-\d{4}$/)
  if (ddmmyyyyMatch) {
    day = parseInt(ddmmyyyyMatch[1], 10)
    month = parseInt(ddmmyyyyMatch[2], 10)
  }
  
  // Format: MM/DD/YYYY (e.g., "12/12/1998")
  const mmddyyyyMatch = dobStr.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/)
  if (mmddyyyyMatch) {
    month = parseInt(mmddyyyyMatch[1], 10)
    day = parseInt(mmddyyyyMatch[2], 10)
  }
  
  if (month === null || day === null) return false
  
  return month === todayMonth && day === todayDay
}

/** POST /api/employee/login - Verify PIN, create employee session. Returns employee + today's punches for clock page (no extra fetch needed). */
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
    const userLat = body.lat as number | undefined
    const userLng = body.lng as number | undefined

    await connectDB()
    const employee = await Employee.findOne({ pin: pinStr }).lean()
    if (!employee) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      )
    }

    // Helper to normalize arrays
    const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : [])
    const locations = arr(employee.location)
    const roles = arr(employee.role)
    const employers = arr(employee.employer)
    
    let geofenceWarning = false
    let detectedLocation: string | null = null
    
    // Check geofence if employee has location and user provided coordinates
    if (locations.length > 0 && userLat !== undefined && userLng !== undefined) {
      // Find ALL location categories assigned to this employee
      const locationCategories = await Category.find({
        type: "location",
        name: { $in: locations },
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
      }).lean()

      if (locationCategories.length > 0) {
        // Check if user is within ANY of their assigned locations (not all)
        const withinAnyGeofence = locationCategories.some((locationCategory) => {
          const radius = locationCategory.radius ?? 100
          const isWithin = isWithinGeofence(
            userLat,
            userLng,
            locationCategory.lat!,
            locationCategory.lng!,
            radius
          )
          
          // Track which location they're at
          if (isWithin && !detectedLocation) {
            detectedLocation = locationCategory.name
          }
          
          return isWithin
        })

        if (!withinAnyGeofence) {
          // Not at ANY of their assigned locations
          // Check if any location has hard mode
          const hasHardMode = locationCategories.some((loc) => (loc.geofenceMode ?? "hard") === "hard")
          
          if (hasHardMode) {
            return NextResponse.json(
              { 
                error: "You are outside the allowed location range. Please move closer to clock in or contact IT support.",
                geofenceViolation: true,
                allowedLocations: locationCategories.map(l => l.name), // For debugging
              },
              { status: 403 }
            )
          }
          
          // All locations are soft mode - allow but warn
          geofenceWarning = true
        }
      }
    }

    const token = await createEmployeeToken({
      sub: String(employee._id),
      pin: pinStr,
    })
    await setEmployeeCookie(token)

    const displayRole = roles[0] || locations[0] || employers[0] || ""

    // Check if today is employee's birthday
    const isBirthday = checkIfBirthday(employee.dob)

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
      },
      punches,
      geofenceWarning, // Include warning flag for soft mode violations
      isBirthday, // Include birthday flag (no DOB exposed)
      detectedLocation, // Include which location they're at
    })
  } catch (err) {
    console.error("[api/employee/login]", err)
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}
