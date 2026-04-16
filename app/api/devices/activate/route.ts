import { deviceAuthService } from "@/lib/services/device/device-auth-service"
import { logger } from "@/lib/utils/logger"
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
      return await deviceAuthService.activate(deviceId, activationCode)

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