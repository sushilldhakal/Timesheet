import { NextRequest, NextResponse } from "next/server"
import { connectDB, Employee, StaffFaceProfile } from "@/lib/db"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { isValidDescriptor } from "@/lib/services/face-matching"

// POST /api/face-profiles - Enroll or re-enroll a staff member
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await req.json()
    const { employeeId, descriptor, enrollmentQuality, enrolledBy = "admin" } = body

    // Validate inputs
    if (!employeeId || !descriptor || typeof enrollmentQuality !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, descriptor, enrollmentQuality" },
        { status: 400 }
      )
    }

    if (!isValidDescriptor(descriptor)) {
      return NextResponse.json(
        { error: "Invalid descriptor format" },
        { status: 400 }
      )
    }

    if (enrollmentQuality < 0 || enrollmentQuality > 1) {
      return NextResponse.json(
        { error: "enrollmentQuality must be between 0 and 1" },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId)
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check if profile already exists
    const existingProfile = await StaffFaceProfile.findOne({ employeeId })

    if (existingProfile) {
      // Re-enroll: update existing profile
      existingProfile.descriptor = descriptor
      existingProfile.enrollmentQuality = enrollmentQuality
      existingProfile.enrolledBy = enrolledBy
      existingProfile.enrolledAt = new Date()
      existingProfile.isActive = true
      await existingProfile.save()

      return NextResponse.json({
        success: true,
        message: "Face profile updated successfully",
        profile: existingProfile,
      })
    } else {
      // New enrollment
      const newProfile = await StaffFaceProfile.create({
        employeeId,
        descriptor,
        enrollmentQuality,
        enrolledBy,
        enrolledAt: new Date(),
        isActive: true,
      })

      return NextResponse.json({
        success: true,
        message: "Face profile enrolled successfully",
        profile: newProfile,
      })
    }
  } catch (error: any) {
    console.error("Error enrolling face profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to enroll face profile" },
      { status: 500 }
    )
  }
}

// GET /api/face-profiles - Get all face profiles (admin only)
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get("activeOnly") === "true"

    const query = activeOnly ? { isActive: true } : {}
    
    const profiles = await StaffFaceProfile.find(query)
      .populate("employeeId", "name pin")
      .select("-descriptor") // Don't send descriptors in list view
      .sort({ enrolledAt: -1 })

    return NextResponse.json({
      success: true,
      profiles,
    })
  } catch (error: any) {
    console.error("Error fetching face profiles:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch face profiles" },
      { status: 500 }
    )
  }
}
