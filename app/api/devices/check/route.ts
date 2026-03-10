import { NextRequest, NextResponse } from "next/server"
import { connectDB, Device } from "@/lib/db"
import { logger } from "@/lib/utils/logger"
import { z } from "zod"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  deviceCheckSchema,
  deviceCheckResponseSchema
} from "@/lib/validations/device"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/devices/check',
  summary: 'Check device authorization',
  description: 'Silent device authentication. Checks if a device UUID is authorized to access the app. Used on every PWA load for transparent security.',
  tags: ['Devices'],
  security: 'none',
  request: {
    body: deviceCheckSchema,
  },
  responses: {
    200: deviceCheckResponseSchema,
    400: deviceCheckResponseSchema,
    500: deviceCheckResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const { deviceId } = body!;

      await connectDB()
      
      // Check if device exists and is active
      const device = await Device.findOne({ 
        deviceId,
        status: "active" 
      }).lean()

      if (!device) {
        // Device not found or not active
        logger.warn(`[api/devices/check] Unauthorized device attempt: ${deviceId}`)
        return {
          status: 200,
          data: {
            authorized: false,
            error: "Device not authorized",
            reason: "Device not found or inactive"
          }
        };
      }

      // Update last activity (fire and forget - don't wait)
      Device.findByIdAndUpdate(device._id, {
        lastActivity: new Date()
      }).catch(err => {
        logger.error("[api/devices/check] Failed to update lastActivity:", err)
      })

      // Device is authorized
      logger.log(`[api/devices/check] Device authorized: ${deviceId} (${device.deviceName})`)
      
      return {
        status: 200,
        data: {
          authorized: true,
          device: {
            id: (device as any)._id.toString(),
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            locationName: device.locationName,
            lastActivity: device.lastActivity?.toISOString(),
          }
        }
      };

    } catch (err) {
      logger.error("[api/devices/check]", err)
      return {
        status: 500,
        data: { 
          authorized: false, 
          error: "Device check failed" 
        }
      };
    }
  }
});