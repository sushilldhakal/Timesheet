import { deviceAuthService } from "@/lib/services/device/device-auth-service"
import { logger } from "@/lib/utils/logger"
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
      return await deviceAuthService.check(deviceId)
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