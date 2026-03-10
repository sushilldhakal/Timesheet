import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Device } from "@/lib/db"
import mongoose from "mongoose"
import { logDeviceRevocation, logDeviceDisabled } from "@/lib/auth/auth-logger"
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  deviceCreateSchema, 
  deviceUpdateSchema, 
  deviceDeleteSchema,
  deviceCreateResponseSchema,
  devicesListResponseSchema,
  deviceUpdateResponseSchema,
  deviceDeleteResponseSchema
} from "@/lib/validations/device-manage"
import { errorResponseSchema } from "@/lib/validations/auth"

// Generate a random activation code
function generateActivationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * POST /api/device/manage
 * Create a new device record with activation code
 * Admin creates device, gets activation code for tablet setup
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/device/manage',
  summary: 'Create device',
  description: 'Create a new device record with activation code for tablet setup',
  tags: ['Devices'],
  security: 'adminAuth',
  request: {
    body: deviceCreateSchema
  },
  responses: {
    200: deviceCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      // Verify admin authentication
      const auth = await getAuthFromCookie()
      if (!auth || auth.role !== "admin") {
        return {
          status: 401,
          data: { error: "Unauthorized" }
        };
      }

      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      const { deviceName, locationName, locationAddress } = body;

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

      return {
        status: 200,
        data: {
          success: true,
          device,
          activationCode: activationCode,
          activationUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/pin?activate=${activationCode}`,
        }
      }

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
          return {
            status: 400,
            data: { error: "Device with this activation code already exists" }
          };
        }
      }
      
      return {
        status: 500,
        data: { error: "Failed to create device" }
      };
    }
  }
});

/**
 * GET /api/device/manage
 * List all devices with populated registeredBy and revokedBy fields
 * Requirements: 4.1, 4.2, 12.7
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/device/manage',
  summary: 'List devices',
  description: 'List all devices with populated user references and punch counts',
  tags: ['Devices'],
  security: 'adminAuth',
  responses: {
    200: devicesListResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    try {
      // Verify admin authentication
      const auth = await getAuthFromCookie()
      if (!auth || auth.role !== "admin") {
        return {
          status: 401,
          data: { error: "Unauthorized" }
        };
      }

      // Connect to database
      await connectDB()

      // Fetch all devices with populated user references
      const devices = await Device.find()
        .populate("registeredBy", "name username")
        .populate("revokedBy", "name username")
        .sort({ registeredAt: -1 })
        .lean()

      // Calculate totalPunches for each device from DailyShift records
      const { DailyShift } = await import("@/lib/db/schemas/daily-shift")
      
      const devicesWithPunchCounts = await Promise.all(
        devices.map(async (device) => {
          if (!device.deviceId) {
            // Device not activated yet
            return { ...device, totalPunches: 0 }
          }

          // Count punches where this device was used
          const punchCount = await DailyShift.countDocuments({
            $or: [
              { "clockIn.deviceId": device.deviceId },
              { "breakIn.deviceId": device.deviceId },
              { "breakOut.deviceId": device.deviceId },
              { "clockOut.deviceId": device.deviceId },
            ]
          })

          return { ...device, totalPunches: punchCount }
        })
      )

      return {
        status: 200,
        data: { devices: devicesWithPunchCounts }
      }
    } catch (error) {
      console.error("Error fetching devices:", error)
      return {
        status: 500,
        data: { error: "Failed to fetch devices" }
      }
    }
  }
});

/**
 * PATCH /api/device/manage
 * Update device status (disable, enable, revoke)
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 12.1, 12.4, 12.6
 */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/device/manage',
  summary: 'Update device status',
  description: 'Update device status (disable, enable, revoke) with optional reason',
  tags: ['Devices'],
  security: 'adminAuth',
  request: {
    body: deviceUpdateSchema
  },
  responses: {
    200: deviceUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      // Verify admin authentication
      const auth = await getAuthFromCookie()
      if (!auth || auth.role !== "admin") {
        return {
          status: 401,
          data: { error: "Unauthorized" }
        };
      }

      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      // Parse request body
      const { deviceId, action, reason } = body;

      if (!deviceId || !action) {
        return {
          status: 400,
          data: { error: "deviceId and action are required" }
        };
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
          return {
            status: 404,
            data: { error: "Device not found" }
          };
        }
      }
      
      if (!device) {
        return {
          status: 404,
          data: { error: "Device not found" }
        };
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
            return {
              status: 400,
              data: { error: "Cannot enable revoked device" }
            };
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
          return {
            status: 400,
            data: { error: "Invalid action" }
          };
      }

      // Save device with updated status
      await device.save()

      // Populate references for response
      await device.populate("registeredBy", "name username")
      await device.populate("revokedBy", "name username")

      return {
        status: 200,
        data: { success: true, device }
      }
    } catch (error) {
      console.error("Error updating device:", error)
      return {
        status: 500,
        data: { error: "Failed to update device" }
      }
    }
  }
});

/**
 * DELETE /api/device/manage
 * Delete a device (must be revoked first)
 */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/device/manage',
  summary: 'Delete device',
  description: 'Delete a device (must be revoked first)',
  tags: ['Devices'],
  security: 'adminAuth',
  request: {
    body: deviceDeleteSchema
  },
  responses: {
    200: deviceDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      // Verify admin authentication
      const auth = await getAuthFromCookie()
      if (!auth || auth.role !== "admin") {
        return {
          status: 401,
          data: { error: "Unauthorized" }
        };
      }

      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      // Parse request body
      const { deviceId } = body;

      if (!deviceId) {
        return {
          status: 400,
          data: { error: "deviceId is required" }
        };
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
          return {
            status: 404,
            data: { error: "Device not found" }
          };
        }
      }
      
      if (!device) {
        return {
          status: 404,
          data: { error: "Device not found" }
        };
      }

      // Check if device is revoked
      if (device.status !== "revoked") {
        return {
          status: 400,
          data: { error: "Device must be revoked before deletion" }
        };
      }

      // Delete the device
      await Device.findByIdAndDelete(device._id)

      console.log(`[api/device/manage] Device deleted: ${device.deviceName} (${device._id})`)

      return {
        status: 200,
        data: { success: true }
      }
    } catch (error) {
      console.error("Error deleting device:", error)
      return {
        status: 500,
        data: { error: "Failed to delete device" }
      }
    }
  }
});
