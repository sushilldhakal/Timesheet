import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"
import { locationIdPathParamSchema, locationUpdateSchema } from "@/lib/validations/location"
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
  createdAt: z.any().optional(),
  updatedAt: z.any().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/locations/{locationId}",
  summary: "Get location",
  description: "Get a location by id",
  tags: ["Locations"],
  security: "adminAuth",
  request: { params: locationIdPathParamSchema },
  responses: {
    200: z.object({ location: locationResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    return await locationService.get(ctx, params!.locationId)
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/locations/{locationId}",
  summary: "Update location",
  description: "Update a location by id",
  tags: ["Locations"],
  security: "adminAuth",
  request: { params: locationIdPathParamSchema, body: locationUpdateSchema },
  responses: {
    200: z.object({ location: locationResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    return await locationService.update(ctx, params!.locationId, body)
  },
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/locations/{locationId}",
  summary: "Delete location",
  description: "Delete a location by id",
  tags: ["Locations"],
  security: "adminAuth",
  request: { params: locationIdPathParamSchema },
  responses: {
    200: successResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    return await locationService.remove(ctx, params!.locationId)
  },
})

