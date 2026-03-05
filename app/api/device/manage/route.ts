import { NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth-helpers"
import { connectDB, Device } from "@/lib/db"
import mongoose from "mongoose"
import { logDeviceRevocation, logDeviceDisabled } from "@/lib/auth-logger"
import { z } from "zod"

// Generate a random activation code
function generateActivationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const createDeviceSchema = z.object({
  deviceName: z.string().min(1, "Device name is required"),
  locationName: z.string().min(1, "Location name is required"),
  locationAddress: z.string().optional(),
})

/**
 * POST /api/device/manage
 * Create a new device record with activation code
 * Admin creates device, gets activation code for tablet setup
 */
export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const parsed = createDeviceSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          error: "Invalid request", 
          issues: parsed.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { deviceName, locationName, locationAddress } = parsed.data

    await connectDB()

    // Generate unique activation code
    let activationCode: string = ""
    let codeExists = true
    
    // Ensure activation code is unique
    while (codeExists) {
      activationCode = generateActivationCode()
      const existing = await Device.findOne({ activationCode })
      codeExists = !!existing
    }

    // Create device record (without deviceId - will be set during activation)
    const device = new Device({
      deviceName,
      locationName,
      locationAddress: locationAddress || "",
      status: "active",
      registeredBy: new mongoose.Types.ObjectId(auth.sub),
      registeredAt: new Date(),
      lastActivity: new Date(),
      totalPunches: 0,
      activationCode: activationCode,
      activationCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    await device.save()

    // Populate registeredBy for response
    await device.populate("registeredBy", "name username")

    return NextResponse.json({
      success: true,
      device,
      activationCode: activationCode,
      activationUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/pin?activate=${activationCode}`,
    })

  } catch (error) {
    console.error("Error creating device:", error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    // Check for specific MongoDB errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 11000) {
        return NextResponse.json(
          { error: "Device with this activation code already exists" },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    )
  }
}

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

    // Find device - try by deviceId field first, then by MongoDB _id
    let device = await Device.findOne({ deviceId })
    
    // If not found by deviceId field, try by MongoDB _id (for unactivated devices)
    if (!device) {
      try {
        device = await Device.findById(deviceId)
      } catch (err) {
        // Invalid ObjectId format
        return NextResponse.json({ error: "Device not found" }, { status: 404 })
      }
    }
    
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    // Perform action based on type
    switch (action) {
      case "disable":
        device.status = "disabled"
        logDeviceDisabled(device.deviceId || device._id.toString(), reason)
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
        logDeviceRevocation(device.deviceId || device._id.toString(), auth.sub, reason)
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
