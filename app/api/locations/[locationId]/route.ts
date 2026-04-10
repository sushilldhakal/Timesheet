import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Location } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"
import { locationIdParamSchema, locationUpdateSchema } from "@/lib/validations/location"

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
  request: { params: locationIdParamSchema },
  responses: {
    200: z.object({ location: locationResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }
    await connectDB()

    const doc = await Location.findById(params!.id).lean()
    if (!doc) return { status: 404, data: { error: "Location not found" } }

    return {
      status: 200,
      data: {
        location: {
          id: doc._id.toString(),
          name: doc.name,
          code: doc.code,
          address: doc.address,
          lat: doc.lat,
          lng: doc.lng,
          radius: doc.radius,
          geofenceMode: doc.geofenceMode,
          openingHour: doc.openingHour,
          closingHour: doc.closingHour,
          workingDays: doc.workingDays,
          timezone: doc.timezone,
          costCenterId: doc.costCenterId,
          color: doc.color,
          isActive: doc.isActive ?? true,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
      },
    }
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/locations/{locationId}",
  summary: "Update location",
  description: "Update a location by id",
  tags: ["Locations"],
  security: "adminAuth",
  request: { params: locationIdParamSchema, body: locationUpdateSchema },
  responses: {
    200: z.object({ location: locationResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }
    await connectDB()

    const existing = await Location.findById(params!.id)
    if (!existing) return { status: 404, data: { error: "Location not found" } }

    const patch = body ?? {}
    if (patch.name != null) {
      const dup = await Location.findOne({
        _id: { $ne: existing._id },
        name: { $regex: new RegExp(`^${String(patch.name).trim()}$`, "i") },
      }).lean()
      if (dup) return { status: 409, data: { error: "A location with this name already exists" } }
      existing.name = String(patch.name).trim()
    }

    Object.assign(existing, { ...patch, name: existing.name })
    await existing.save()

    return {
      status: 200,
      data: {
        location: {
          id: existing._id.toString(),
          name: existing.name,
          code: existing.code,
          address: existing.address,
          lat: existing.lat,
          lng: existing.lng,
          radius: existing.radius,
          geofenceMode: existing.geofenceMode,
          openingHour: existing.openingHour,
          closingHour: existing.closingHour,
          workingDays: existing.workingDays,
          timezone: existing.timezone,
          costCenterId: existing.costCenterId,
          color: existing.color,
          isActive: existing.isActive ?? true,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      },
    }
  },
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/locations/{locationId}",
  summary: "Delete location",
  description: "Delete a location by id",
  tags: ["Locations"],
  security: "adminAuth",
  request: { params: locationIdParamSchema },
  responses: {
    200: successResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }
    await connectDB()

    const deleted = await Location.findByIdAndDelete(params!.id)
    if (!deleted) return { status: 404, data: { error: "Location not found" } }
    return { status: 200, data: { success: true } }
  },
})

