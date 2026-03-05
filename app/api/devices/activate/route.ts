import { NextRequest, NextResponse } from "next/server"
import { connectDB, Device } from "@/lib/db"
import { logger } from "@/lib/utils/logger"
import { z } from "zod"

const activateBodySchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
  activationCode: z.string().min(1, "Activation code is required"),
})

/**
 * POST /api/devices/activate - Activate a device with one-time code
 * Links a device UUID to a pre-created device record
 * Used during initial tablet setup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = activateBodySchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request", 
          issues: parsed.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { deviceId, activationCode } = parsed.data

    await connectDB()
    
    // Find device by activation code
    const device = await Device.findOne({ 
      activationCode: activationCode.toUpperCase(),
      activationCodeExpiry: { $gt: new Date() }, // Not expired
      status: "active"
    })

    if (!device) {
      logger.warn(`[api/devices/activate] Invalid or expired activation code: ${activationCode}`)
      return NextResponse.json({
        success: false,
        error: "Invalid or expired activation code"
      }, { status: 400 })
    }

    // Check if device is already activated (has a deviceId)
    if (device.deviceId && device.deviceId !== deviceId) {
      logger.warn(`[api/devices/activate] Device already activated with different UUID: ${device.deviceId} vs ${deviceId}`)
      return NextResponse.json({
        success: false,
        error: "This activation code has already been used"
      }, { status: 400 })
    }

    // Activate the device
    await Device.findByIdAndUpdate(device._id, {
      deviceId,
      activationCode: null, // Clear the code (one-time use)
      activationCodeExpiry: null,
      lastActivity: new Date(),
    })

    logger.log(`[api/devices/activate] Device activated: ${deviceId} (${device.deviceName})`)
    
    return NextResponse.json({
      success: true,
      device: {
        id: device._id,
        deviceId,
        deviceName: device.deviceName,
        locationName: device.locationName,
      }
    })

  } catch (err) {
    logger.error("[api/devices/activate]", err)
    return NextResponse.json(
      { 
        success: false, 
        error: "Device activation failed" 
      },
      { status: 500 }
    )
  }
}