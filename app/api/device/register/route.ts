import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, Device } from "@/lib/db"
import { createDeviceToken, getDeviceCookieOptions } from "@/lib/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { logDeviceRegistrationFailure } from "@/lib/auth-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, locationName, locationAddress } = body

    // Validate location name is provided
    if (!locationName || typeof locationName !== "string" || !locationName.trim()) {
      logDeviceRegistrationFailure("Missing or invalid location name")
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Authenticate admin using email+password
    let adminUser = null

    if (email && password) {
      // Email + password authentication
      const normalizedInput = email.trim().toLowerCase()
      const bcrypt = await import("bcrypt")
      
      // Try to find user by email or username
      adminUser = await User.findOne({ 
        $or: [
          { email: normalizedInput },
          { username: normalizedInput }
        ]
      })
        .select("+password")
        .lean()

      if (process.env.NODE_ENV === "development") {
        console.log("[device/register] Looking for user:", normalizedInput)
        console.log("[device/register] User found:", !!adminUser)
        if (adminUser) {
          console.log("[device/register] User details:", {
            id: adminUser._id,
            email: adminUser.email,
            username: adminUser.username,
            role: adminUser.role
          })
        }
      }

      if (!adminUser || !adminUser.password) {
        logDeviceRegistrationFailure("Invalid credentials - user not found", { email: normalizedInput })
        return NextResponse.json(
          { error: "Invalid email or password. Please check your credentials." },
          { status: 401 }
        )
      }

      const passwordMatch = await bcrypt.compare(password, adminUser.password)

      if (process.env.NODE_ENV === "development") {
        console.log("[device/register] Password match:", passwordMatch)
        console.log("[device/register] User role:", adminUser.role)
      }

      if (!passwordMatch) {
        logDeviceRegistrationFailure("Invalid password", { email: normalizedInput })
        return NextResponse.json(
          { error: "Invalid email or password. Please check your credentials." },
          { status: 401 }
        )
      }

      // Verify user is admin or super_admin
      if (!isAdminOrSuperAdmin(adminUser.role)) {
        if (process.env.NODE_ENV === "development") {
          console.log("[device/register] User role check failed:", {
            userRole: adminUser.role,
            isAdmin: adminUser.role === "admin",
            isSuperAdmin: adminUser.role === "super_admin",
            isAdminOrSuperAdmin: isAdminOrSuperAdmin(adminUser.role)
          })
        }
        logDeviceRegistrationFailure("Insufficient permissions", { email: normalizedInput, role: adminUser.role })
        return NextResponse.json(
          { error: "Access denied. Only administrators can register devices. Please use an admin account." },
          { status: 403 }
        )
      }
    } else {
      logDeviceRegistrationFailure("Missing authentication credentials")
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      )
    }

    // Generate unique device ID using crypto.randomUUID()
    const deviceId = crypto.randomUUID()

    // Create Device record in database
    const device = await Device.create({
      deviceId,
      locationName: locationName.trim(),
      locationAddress: locationAddress?.trim() || "",
      status: "active",
      registeredBy: adminUser._id,
      registeredAt: new Date(),
      lastActivity: new Date(),
    })

    // Generate device token
    const token = await createDeviceToken({
      sub: deviceId,
      location: locationName.trim(),
    })

    // Set httpOnly cookie and return success response
    const response = NextResponse.json({
      success: true,
      deviceId: device.deviceId,
    })

    response.cookies.set("device_token", token, getDeviceCookieOptions())

    return response
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[device/register]", err)
    }
    logDeviceRegistrationFailure("Registration exception", { error: err instanceof Error ? err.message : "Unknown error" })
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    )
  }
}
