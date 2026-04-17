import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { clockRequestSchema, clockResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { employeeClockService } from "@/lib/services/employee/employee-clock-service"
import { getRedisOptional } from "@/lib/redis/redis-client"

/** POST /api/employee/clock - Clock in/out/break. Requires employee session. */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/clock',
  summary: 'Employee clock in/out',
  description: 'Record employee clock in, out, break start, or break end with location and photo validation',
  tags: ['Clock'],
  security: 'employeeAuth',
  request: {
    body: clockRequestSchema
  },
  responses: {
    200: clockResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, req }) => {
    const auth = await getEmployeeFromCookie();
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    // Idempotency key — mobile clients send X-Idempotency-Key to prevent duplicate punches
    const idempotencyKey = req.headers.get('x-idempotency-key')
    if (idempotencyKey) {
      const redis = getRedisOptional()
      if (redis) {
        const cacheKey = `idempotency:clock:${auth.sub}:${idempotencyKey}`
        const cached = await redis.get(cacheKey).catch(() => null)
        if (cached) {
          try { return { status: 200, data: JSON.parse(cached) } } catch { /* fall through */ }
        }
      }
    }

    const headerDeviceId = req.headers.get("x-device-id") || ""
    const data = await employeeClockService.clock({ authSub: auth.sub, body, headerDeviceId })

    // Cache result for 10 minutes to handle mobile retries
    if (idempotencyKey) {
      const redis = getRedisOptional()
      if (redis) {
        const cacheKey = `idempotency:clock:${auth.sub}:${idempotencyKey}`
        redis.set(cacheKey, JSON.stringify(data), 'EX', 600).catch(() => {})
      }
    }

    return { status: 200, data }
  }
});
