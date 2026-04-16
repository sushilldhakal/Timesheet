import { createApiRoute } from "@/lib/api/create-api-route"
import { publicLocationsResponseSchema } from "@/lib/validations/public"
import { errorResponseSchema } from "@/lib/validations/auth"
import { publicLocationsService } from "@/lib/services/public/public-locations-service"

/**
 * GET /api/public/locations - Public endpoint for device registration
 * Returns basic location information (id and name only) without authentication
 * Used by DeviceRegistrationDialog to show available locations
 */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/public/locations',
  summary: 'Get public locations',
  description: 'Get basic location information for device registration (no authentication required)',
  tags: ['Public'],
  security: 'none',
  responses: {
    200: publicLocationsResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    const data = await publicLocationsService.listActiveLocations()
    return { status: 200, data }
  }
});