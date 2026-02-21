import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { connectDB, Device } from "@/lib/db"
import mongoose from "mongoose"
import { logDeviceRevocation, logDeviceDisabled } from "@/lib/auth-logger"

/**
 * GET /api/device/manage
 * List all devices with populated registeredBy and revokedBy fields
 * Requirements: 4.1, 4.2, 12.7
 */
export async function GET() {
  try {
    // Verify admin authentication
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Connect to database
    await connectDB()

    // Fetch all devices with populated user references
    const devices = await Device.find()
      .populate("registeredBy", "name username")
      .populate("revokedBy", "name username")
      .sort({ registeredAt: -1 })
      .lean()

    return NextResponse.json({ devices })
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/device/manage
 * Update device status (disable, enable, revoke)
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 12.1, 12.4, 12.6
 */
export async function PATCH(request: Request) {
  try {
    // Verify admin authentication
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { deviceId, action, reason } = body

    if (!deviceId || !action) {
      return NextResponse.json(
        { error: "deviceId and action are required" },
        { status: 400 }
      )
    }

    // Connect to database
    await connectDB()

    // Find device
    const device = await Device.findOne({ deviceId })
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Perform action based on type
    switch (action) {
      case "disable":
        device.status = "disabled"
        logDeviceDisabled(deviceId, reason)
        break

      case "enable":
        // Prevent enabling revoked devices (Requirement 12.6)
        if (device.status === "revoked") {
          return NextResponse.json(
            { error: "Cannot enable revoked device" },
            { status: 400 }
          )
        }
        device.status = "active"
        break

      case "revoke":
        // Record revocation details (Requirements 4.7, 12.1, 12.4)
        device.status = "revoked"
        device.revokedAt = new Date()
        device.revokedBy = new mongoose.Types.ObjectId(auth.sub)
        device.revocationReason = reason || ""
        logDeviceRevocation(deviceId, auth.sub, reason)
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Save device with updated status
    await device.save()

    // Populate references for response
    await device.populate("registeredBy", "name username")
    await device.populate("revokedBy", "name username")

    return NextResponse.json({ success: true, device })
  } catch (error) {
    console.error("Error updating device:", error)
    return NextResponse.json(
      { error: "Failed to update device" },
      { status: 500 }
    )
  }
}
