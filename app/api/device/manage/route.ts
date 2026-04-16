import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import { apiErrors } from "@/lib/api/api-error"
import { deviceService } from "@/lib/services/device/device-service"
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
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") throw apiErrors.unauthorized()
    if (!body) throw apiErrors.badRequest("Request body is required")
    const data = await deviceService.createDevice({
      authSub: auth.sub,
      deviceName: body.deviceName,
      locationName: body.locationName,
      locationAddress: body.locationAddress,
    })
    return { status: 200, data }
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
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") throw apiErrors.unauthorized()
    const data = await deviceService.listDevicesWithPunchCounts()
    return { status: 200, data }
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
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") throw apiErrors.unauthorized()
    if (!body) throw apiErrors.badRequest("Request body is required")
    const data = await deviceService.updateDeviceStatus({
      authSub: auth.sub,
      deviceId: body.deviceId,
      action: body.action,
      reason: body.reason,
    })
    return { status: 200, data }
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
    const auth = await getAuthFromCookie()
    if (!auth || auth.role !== "admin") throw apiErrors.unauthorized()
    if (!body) throw apiErrors.badRequest("Request body is required")
    const data = await deviceService.deleteDevice(body.deviceId)
    return { status: 200, data }
  }
});
