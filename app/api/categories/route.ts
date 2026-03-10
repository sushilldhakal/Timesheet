import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Category } from "@/lib/db"
import { 
  categoryCreateSchema, 
  categoryQuerySchema,
  categoriesListResponseSchema,
  categoryCreateResponseSchema,
} from "@/lib/validations/category"
import { errorResponseSchema } from "@/lib/validations/auth"
import { isValidCategoryType } from "@/lib/config/category-types"
import { createApiRoute } from "@/lib/api/create-api-route"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/categories',
  summary: 'List categories by type',
  description: 'Get all categories, optionally filtered by type (role, location, employer)',
  tags: ['Categories'],
  security: 'adminAuth',
  request: {
    query: categoryQuerySchema,
  },
  responses: {
    200: categoriesListResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const type = query?.type

    try {
      await connectDB()
      const filter = type && isValidCategoryType(type) ? { type } : {}
      const categories = await Category.find(filter)
        .sort({ name: 1 })
        .lean()

      const items = categories.map((c) => ({
        _id: c._id.toString(),
        id: c._id.toString(),
        name: c.name,
        type: c.type,
        color: c.color,
        lat: c.lat,
        lng: c.lng,
        address: c.address,
        radius: c.radius,
        geofenceMode: c.geofenceMode,
        openingHour: c.openingHour,
        closingHour: c.closingHour,
        defaultScheduleTemplate: c.defaultScheduleTemplate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))

      return {
        status: 200,
        data: { categories: items }
      }
    } catch (err) {
      console.error("[api/categories GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch categories" }
      }
    }
  }
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/categories',
  summary: 'Create category',
  description: 'Create a new category (role, location, or employer)',
  tags: ['Categories'],
  security: 'adminAuth',
  request: {
    body: categoryCreateSchema,
  },
  responses: {
    200: categoryCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const { name, type, lat, lng, address, radius, geofenceMode, openingHour, closingHour, color, defaultScheduleTemplate } = body!

    if (!name || !type) {
      return {
        status: 400,
        data: { error: "Name and type are required" }
      }
    }

    try {
      await connectDB()

      const existing = await Category.findOne({
        type,
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      })
      if (existing) {
        return {
          status: 409,
          data: { error: "A category with this name already exists for this type" }
        }
      }

      const createData: Record<string, unknown> = { name: name.trim(), type }
      if (type === "location") {
        if (lat != null) createData.lat = lat
        if (lng != null) createData.lng = lng
        if (address != null) createData.address = address
        if (radius != null) createData.radius = radius
        if (geofenceMode != null) createData.geofenceMode = geofenceMode
        if (openingHour != null) createData.openingHour = openingHour
        if (closingHour != null) createData.closingHour = closingHour
      }
      if (type === "role" || type === "employer") {
        if (color != null) createData.color = color
      }
      if (type === "role") {
        if (defaultScheduleTemplate != null) createData.defaultScheduleTemplate = defaultScheduleTemplate
      }
      const category = await Category.create(createData)

      return {
        status: 200,
        data: {
          category: {
            id: category._id,
            name: category.name,
            type: category.type,
            lat: category.lat,
            lng: category.lng,
            address: category.address,
            radius: category.radius,
            geofenceMode: category.geofenceMode,
            openingHour: category.openingHour,
            closingHour: category.closingHour,
            color: category.color,
            defaultScheduleTemplate: category.defaultScheduleTemplate,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          },
        }
      }
    } catch (err) {
      console.error("[api/categories POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create category" }
      }
    }
  }
})