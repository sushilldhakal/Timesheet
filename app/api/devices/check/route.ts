import { NextRequest, NextResponse } from "next/server"
import { connectDB, Device } from "@/lib/db"
import { logger } from "@/lib/utils/logger"
import { z } from "zod"

const checkBodySchema = z.object({
  deviceId: z.string().min(1, "Device ID is required"),
})

/**
 * POST /api/devices/check - Silent device authentication
 * Checks if a device UUID is authorized to access the app
 * Used on every PWA load for transparent security
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = checkBodySchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          authorized: false, 
          error: "Invalid request", 
          issues: parsed.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { deviceId } = parsed.data

    await connectDB()
    
    // Check if device exists and is active
    const device = await Device.findOne({ 
      deviceId,
      status: "active" 
    }).lean()

    if (!device) {
      // Device not found or not active
      logger.warn(`[api/devices/check] Unauthorized device attempt: ${deviceId}`)
      return NextResponse.json({
        authorized: false,
        error: "Device not authorized",
        reason: "Device not found or inactive"
      })
    }

    // Update last activity (fire and forget - don't wait)
    Device.findByIdAndUpdate(device._id, {
      lastActivity: new Date()
    }).catch(err => {
      logger.error("[api/devices/check] Failed to update lastActivity:", err)
    })

    // Device is authorized
    logger.log(`[api/devices/check] Device authorized: ${deviceId} (${device.deviceName})`)
    
    return NextResponse.json({
      authorized: true,
      device: {
        id: device._id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        locationName: device.locationName,
        lastActivity: device.lastActivity,
      }
    })

  } catch (err) {
    logger.error("[api/devices/check]", err)
    return NextResponse.json(
      { 
        authorized: false, 
        error: "Device check failed" 
      },
      { status: 500 }
    )
  }
}