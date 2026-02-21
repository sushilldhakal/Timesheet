import { NextRequest, NextResponse } from "next/server"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { getEmployeeFromCookie, invalidateEmployeeSession } from "@/lib/employee-auth"
import { connectDB, Employee, Timesheet, Category, Device } from "@/lib/db"
import { isWithinGeofence } from "@/lib/utils/geofence"
import { logger } from "@/lib/utils/logger"
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

    // Get device context from headers (set by middleware)
    const deviceId = request.headers.get("x-device-id") || ""
    let deviceLocation = ""
    
    // Fetch device location from database if deviceId is available
    if (deviceId) {
      const device = await Device.findOne({ deviceId }).lean()
      if (device) {
        deviceLocation = device.locationName
      }
    }

    const imageUrl = (clientImageUrl && clientImageUrl.trim()) || ""
    const latStr = (lat && String(lat).trim()) || ""
    const lngStr = (lng && String(lng).trim()) || ""
    const where = latStr && lngStr ? `${latStr},${lngStr}` : ""
    let flag = !imageUrl || !latStr || !lngStr
    let detectedLocationName = ""

    // Geofence check for all punch types — detect location and enforce on clock-in only
    const rawLocationNames = (employee.location ?? []) as string[]
    const locationNames = rawLocationNames.map((n) => String(n).trim()).filter(Boolean)
    
    if (locationNames.length > 0 && latStr && lngStr) {
      const userLat = parseFloat(latStr)
      const userLng = parseFloat(lngStr)
      
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const nameRegex = locationNames.length > 0
          ? new RegExp(`^(${locationNames.map(esc).join("|")})$`, "i")
          : /^$/
        const locations = await Category.find({
          type: "location",
          name: { $regex: nameRegex },
          lat: { $exists: true, $ne: null, $gte: -90, $lte: 90 },
          lng: { $exists: true, $ne: null, $gte: -180, $lte: 180 },
        }).lean()

        // Check if user is within ANY assigned location and track which one
        let withinFence = false
        for (const loc of locations) {
          if (
            loc.lat != null &&
            loc.lng != null &&
            isWithinGeofence(
              userLat,
              userLng,
              loc.lat,
              loc.lng,
              loc.radius ?? 100
            )
          ) {
            withinFence = true
            detectedLocationName = loc.name
            break
          }
        }

        if (!withinFence && locations.length > 0) {
          // Only enforce geofence on clock-in
          if (type === "in") {
            const hasHardBlock = locations.some((loc) => loc.geofenceMode !== "soft")
            if (hasHardBlock) {
              return NextResponse.json(
                { error: "You are not at an approved location." },
                { status: 403 }
              )
            }
          }
          
          // Find nearest location for display purposes
          let minDistance = Infinity
          for (const loc of locations) {
            if (loc.lat != null && loc.lng != null) {
              const R = 6371e3 // Earth radius in meters
              const φ1 = (userLat * Math.PI) / 180
              const φ2 = (loc.lat * Math.PI) / 180
              const Δφ = ((loc.lat - userLat) * Math.PI) / 180
              const Δλ = ((loc.lng - userLng) * Math.PI) / 180
              const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
              const distance = R * c
              if (distance < minDistance) {
                minDistance = distance
                detectedLocationName = loc.name
              }
            }
          }
          flag = true
        }
      }
    } else if (type === "in" && locationNames.length > 0) {
      // Clock-in requires location if employee has assigned locations
      return NextResponse.json(
        { error: "Location is required for clock-in at an assigned location." },
        { status: 400 }
      )
    }

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
      working: detectedLocationName, // Store the detected location name
      deviceId, // Associate with device
      deviceLocation, // Store device location
    })

    // Invalidate employee session after successful clock operation
    await invalidateEmployeeSession()

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
    logger.error("[api/employee/clock]", err)
    return NextResponse.json(
      { error: "Clock in/out failed" },
      { status: 500 }
    )
  }
}
