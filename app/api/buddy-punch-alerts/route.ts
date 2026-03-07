import { NextRequest, NextResponse } from "next/server"
import { connectDB, BuddyPunchAlert } from "@/lib/db"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"

// GET /api/buddy-punch-alerts - Dashboard list
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const employeeId = searchParams.get("employeeId")
    const locationId = searchParams.get("locationId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    // Build query
    const query: any = {}
    if (status) query.status = status
    if (employeeId) query.employeeId = employeeId
    
    console.log('[API] Buddy punch alerts query:', {
      userLocations: ctx.userLocations,
      requestedLocationId: locationId,
      status,
    })
    
    // Filter by location permissions
    if (ctx.userLocations && ctx.userLocations.length > 0) {
      // Convert location names to ObjectIds
      const { Category } = await import("@/lib/db")
      const locationDocs = await Category.find({
        type: "location",
        name: { $in: ctx.userLocations }
      }).select("_id").lean()
      
      const locationObjectIds = locationDocs.map(loc => loc._id)
      console.log('[API] Converted location names to ObjectIds:', {
        names: ctx.userLocations,
        objectIds: locationObjectIds.map(id => id.toString())
      })
      
      if (locationId) {
        // User requested specific location - check if they have access
        if (locationObjectIds.some(id => id.toString() === locationId)) {
          query.locationId = locationId
        } else {
          // User doesn't have access to requested location
          console.log('[API] User does not have access to requested location')
          return NextResponse.json({
            success: true,
            alerts: [],
            pagination: { page, limit, total: 0, pages: 0 },
          })
        }
      } else {
        // No specific location requested - filter to user's allowed locations
        query.locationId = { $in: locationObjectIds }
        console.log('[API] Filtering to user location ObjectIds:', locationObjectIds.length)
      }
    } else if (locationId) {
      query.locationId = locationId
    }

    const skip = (page - 1) * limit

    console.log('[API] Final query:', query)

    const [alerts, total] = await Promise.all([
      BuddyPunchAlert.find(query)
        .populate("employeeId", "name pin")
        .populate("locationId", "name")
        .populate("reviewedBy", "name")
        .sort({ punchTime: -1 })
        .skip(skip)
        .limit(limit),
      BuddyPunchAlert.countDocuments(query),
    ])

    console.log('[API] Found alerts:', alerts.length, 'total:', total)

    return NextResponse.json({
      success: true,
      alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error("Error fetching buddy punch alerts:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch alerts" },
      { status: 500 }
    )
  }
}

// POST /api/buddy-punch-alerts - Create new alert (internal use)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await req.json()
    const {
      employeeId,
      punchType,
      punchTime,
      matchScore,
      capturedPhotoUrl,
      enrolledPhotoUrl,
      locationId,
    } = body

    // Validate required fields
    if (!employeeId || !punchType || !punchTime || 
        typeof matchScore !== "number" || !locationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate matchScore range
    if (matchScore < 0 || matchScore > 1) {
      return NextResponse.json(
        { error: "matchScore must be between 0 and 1" },
        { status: 400 }
      )
    }

    const alert = await BuddyPunchAlert.create({
      employeeId,
      punchType,
      punchTime,
      matchScore,
      capturedPhotoUrl,
      enrolledPhotoUrl,
      locationId,
      status: "pending",
    })

    return NextResponse.json({
      success: true,
      alert,
    })
  } catch (error: any) {
    console.error("Error creating buddy punch alert:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create alert" },
      { status: 500 }
    )
  }
}
