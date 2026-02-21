import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, Device } from "@/lib/db"
import { createDeviceToken, getDeviceCookieOptions } from "@/lib/device-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { logDeviceRegistrationFailure } from "@/lib/auth-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, adminPin, locationName, locationAddress } = body

    // Validate location name is provided
    if (!locationName || typeof locationName !== "string" || !locationName.trim()) {
      logDeviceRegistrationFailure("Missing or invalid location name")
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Authenticate admin using email+password OR adminPin
    let adminUser = null

    if (email && password) {
      // Email + password authentication (treating email as username)
      const normalizedInput = email.trim().toLowerCase()
      const bcrypt = await import("bcrypt")
      
      // Try to find user by username (the email input is actually the username)
      adminUser = await User.findOne({ username: normalizedInput })
        .select("+password")
        .lean()

      if (process.env.NODE_ENV === "development") {
        console.log("[device/register] Looking for user:", normalizedInput)
        console.log("[device/register] User found:", !!adminUser)
      }

      if (!adminUser || !adminUser.password) {
        logDeviceRegistrationFailure("Invalid credentials - user not found", { username: normalizedInput })
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        )
      }

      const passwordMatch = await bcrypt.compare(password, adminUser.password)

      if (process.env.NODE_ENV === "development") {
        console.log("[device/register] Password match:", passwordMatch)
        console.log("[device/register] User role:", adminUser.role)
      }

      if (!passwordMatch) {
        logDeviceRegistrationFailure("Invalid password", { username: normalizedInput })
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        )
      }

      // Verify user is admin or super_admin
      if (!isAdminOrSuperAdmin(adminUser.role)) {
        logDeviceRegistrationFailure("Insufficient permissions", { username: normalizedInput, role: adminUser.role })
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        )
      }
    } else if (adminPin) {
      // Admin PIN authentication
      // TODO: Implement admin PIN authentication when admin PIN field is added to User schema
      // For now, check if any admin user has a matching PIN-like identifier
      logDeviceRegistrationFailure("Admin PIN authentication not yet implemented")
      return NextResponse.json(
        { error: "Admin PIN authentication not yet implemented" },
        { status: 501 }
      )
    } else {
      logDeviceRegistrationFailure("Missing authentication credentials")
      return NextResponse.json(
        { error: "Email and password, or admin PIN required" },
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
