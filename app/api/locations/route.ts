import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Location } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { locationCreateSchema, locationQuerySchema } from "@/lib/validations/location"

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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const search = query?.search?.trim()
    const isActive = query?.isActive

    await connectDB()
    const filter: Record<string, unknown> = {}
    if (typeof isActive === "boolean") filter.isActive = isActive
    if (search) filter.name = { $regex: search, $options: "i" }

    const locations = await Location.find(filter).sort({ name: 1 }).lean()
    return {
      status: 200,
      data: {
        locations: locations.map((l: any) => ({
          id: l._id.toString(),
          name: l.name,
          code: l.code,
          address: l.address,
          lat: l.lat,
          lng: l.lng,
          radius: l.radius,
          geofenceMode: l.geofenceMode,
          openingHour: l.openingHour,
          closingHour: l.closingHour,
          workingDays: l.workingDays,
          timezone: l.timezone,
          costCenterId: l.costCenterId,
          color: l.color,
          isActive: l.isActive ?? true,
          createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
          updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : null,
        })),
      },
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
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const payload = body!
    await connectDB()

    const existing = await Location.findOne({
      name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
    }).lean()
    if (existing) return { status: 409, data: { error: "A location with this name already exists" } }

    const created = await Location.create({
      ...payload,
      name: payload.name.trim(),
      createdBy: auth.sub,
    })

    return {
      status: 200,
      data: {
        location: {
          id: created._id.toString(),
          name: created.name,
          code: created.code,
          address: created.address,
          lat: created.lat,
          lng: created.lng,
          radius: created.radius,
          geofenceMode: created.geofenceMode,
          openingHour: created.openingHour,
          closingHour: created.closingHour,
          workingDays: created.workingDays,
          timezone: created.timezone,
          costCenterId: created.costCenterId,
          color: created.color,
          isActive: created.isActive ?? true,
          createdAt: created.createdAt ? created.createdAt.toISOString() : null,
          updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
        },
      },
    }
  },
})

