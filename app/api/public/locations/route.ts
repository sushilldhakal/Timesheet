import { connectDB, Location } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { publicLocationsResponseSchema } from "@/lib/validations/public"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    try {
      await connectDB()
      
      // Fetch only locations with minimal data for security
      const locations = await Location.find({ isActive: true })
        .select("_id name") // Only return id and name
        .sort({ name: 1 })
        .lean()

      const items = locations.map((location) => ({
        _id: location._id.toString(),
        id: location._id.toString(),
        name: location.name,
      }))

      return {
        status: 200,
        data: { 
          locations: items,
          count: items.length 
        }
      }
    } catch (err) {
      console.error("[api/public/locations GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch locations" }
      }
    }
  }
});