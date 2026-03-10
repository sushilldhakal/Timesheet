import { NextRequest, NextResponse } from "next/server"
import { connectDB, Device } from "@/lib/db"
import { logger } from "@/lib/utils/logger"
import { z } from "zod"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  deviceActivateSchema,
  deviceActivateResponseSchema
} from "@/lib/validations/device"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/devices/activate',
  summary: 'Activate device',
  description: 'Activate a device with one-time code. Links a device UUID to a pre-created device record used during initial tablet setup.',
  tags: ['Devices'],
  security: 'none',
  request: {
    body: deviceActivateSchema,
  },
  responses: {
    200: deviceActivateResponseSchema,
    400: deviceActivateResponseSchema,
    500: deviceActivateResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      const { deviceId, activationCode } = body!;

      await connectDB()
      
      // Find device by activation code
      const device = await Device.findOne({ 
        activationCode: activationCode.toUpperCase(),
        status: "active"
      })

      if (!device) {
        logger.warn(`[api/devices/activate] Invalid activation code: ${activationCode}`)
        return {
          status: 400,
          data: {
            success: false,
            error: "Invalid activation code"
          }
        };
      }

      // Check if device is already activated with a DIFFERENT deviceId
      if (device.deviceId && device.deviceId !== deviceId) {
        logger.warn(`[api/devices/activate] Device already activated with different UUID: ${device.deviceId} vs ${deviceId}`)
        return {
          status: 400,
          data: {
            success: false,
            error: "This activation code has already been used by another device"
          }
        };
      }

      // Allow re-activation with same deviceId (e.g., after browser storage clear)
      if (device.deviceId === deviceId) {
        logger.log(`[api/devices/activate] Re-activating device: ${deviceId} (${device.deviceName})`)
        
        // Just update last activity
        await Device.findByIdAndUpdate(device._id, {
          lastActivity: new Date(),
        })
        
        return {
          status: 200,
          data: {
            success: true,
            device: {
              id: device._id.toString(),
              deviceId,
              deviceName: device.deviceName,
              locationName: device.locationName,
            }
          }
        };
      }

      // Activate the device - keep activation code for reference
      await Device.findByIdAndUpdate(device._id, {
        deviceId,
        // Keep activationCode for admin reference and re-activation
        activationCodeExpiry: null, // Clear expiry since it's now activated
        lastActivity: new Date(),
      })

      logger.log(`[api/devices/activate] Device activated: ${deviceId} (${device.deviceName})`)
      
      return {
        status: 200,
        data: {
          success: true,
          device: {
            id: device._id.toString(),
            deviceId,
            deviceName: device.deviceName,
            locationName: device.locationName,
          }
        }
      };

    } catch (err) {
      logger.error("[api/devices/activate]", err)
      return {
        status: 500,
        data: { 
          success: false, 
          error: "Device activation failed" 
        }
      };
    }
  }
});