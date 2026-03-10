import { createEmployeeToken } from "@/lib/auth/auth-helpers"
import { offlineSessionSchema, offlineSessionResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { logger } from "@/lib/utils/logger"
import { createApiRoute } from "@/lib/api/create-api-route"

/**
 * POST /api/employee/offline-session
 * Creates an employee session cookie for offline mode
 * This allows the middleware to authenticate offline users
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/offline-session',
  summary: 'Create offline session',
  description: 'Create an employee session cookie for offline mode authentication',
  tags: ['Clock'],
  security: 'none',
  request: {
    body: offlineSessionSchema
  },
  responses: {
    200: offlineSessionResponseSchema,
    400: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      const { employeeId, pin, offline } = body;

      if (!employeeId || !pin) {
        return {
          status: 400,
          data: { error: "Employee ID and PIN are required" }
        };
      }

      // Create employee session token (same as online login)
      const token = await createEmployeeToken({
        sub: employeeId,
        pin: pin,
      });

      logger.log(`[api/employee/offline-session] Created offline session for employee ${employeeId}`);

      // Note: The cookie setting will be handled by the createApiRoute helper
      // For now, return the session data
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      return {
        status: 200,
        data: {
          sessionId: token,
          employee: {
            id: employeeId,
            name: "Employee", // We don't have the name here, would need to fetch from DB
            pin: pin,
          },
          expiresAt: expiresAt.toISOString(),
        }
      };

    } catch (error) {
      logger.error("[api/employee/offline-session] Error:", error);
      return {
        status: 500,
        data: { error: "Failed to create offline session" }
      };
    }
  }
});