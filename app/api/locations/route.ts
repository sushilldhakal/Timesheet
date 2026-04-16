import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { locationCreateSchema, locationQuerySchema } from "@/lib/validations/location"
import { locationService } from "@/lib/services/location/location-service"

const locationResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(),
  geofenceMode: z.enum(["hard", "soft"]).optional(),
  openingHour: z.number().optional(),
  closingHour: z.number().optional(),
  workingDays: z.array(z.number()).optional(),
  timezone: z.string().optional(),
  costCenterId: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/locations",
  summary: "List locations",
  description: "Get all locations, optionally filtered",
  tags: ["Locations"],
  security: "adminAuth",
  request: { query: locationQuerySchema },
  responses: {
    200: z.object({ locations: z.array(locationResponseSchema) }),
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    return {
      status: 200,
      data: await locationService.list(ctx, query),
    }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/locations",
  summary: "Create location",
  description: "Create a new location",
  tags: ["Locations"],
  security: "adminAuth",
  request: { body: locationCreateSchema },
  responses: {
    200: z.object({ location: locationResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }

    return await locationService.create(ctx, body)
  },
})

