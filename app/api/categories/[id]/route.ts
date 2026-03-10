import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Category } from "@/lib/db"
import { 
  categoryIdParamSchema,
  categoryUpdateSchema,
  categoryResponseSchema,
} from "@/lib/validations/category"
import { successResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/categories/{id}',
  summary: 'Get single category',
  description: 'Get a category by ID',
  tags: ['Categories'],
  security: 'adminAuth',
  request: {
    params: categoryIdParamSchema,
  },
  responses: {
    200: z.object({ category: categoryResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const id = params?.id
    if (!id) {
      return {
        status: 400,
        data: { error: "Category ID is required" }
      }
    }

    try {
      await connectDB()
      const category = await Category.findById(id).lean()
      if (!category) {
        return {
          status: 404,
          data: { error: "Category not found" }
        }
      }
      
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
      console.error("[api/categories/[id] GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch category" }
      }
    }
  }
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/categories/{id}',
  summary: 'Update category',
  description: 'Update a category by ID',
  tags: ['Categories'],
  security: 'adminAuth',
  request: {
    params: categoryIdParamSchema,
    body: categoryUpdateSchema,
  },
  responses: {
    200: z.object({ category: categoryResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const id = params?.id
    if (!id) {
      return {
        status: 400,
        data: { error: "Category ID is required" }
      }
    }

    const updateData = body || {}
    const { name, lat, lng, address, radius, geofenceMode, openingHour, closingHour, color, defaultScheduleTemplate } = updateData

    try {
      await connectDB()
      const existing = await Category.findById(id)
      if (!existing) {
        return {
          status: 404,
          data: { error: "Category not found" }
        }
      }

      if (name != null) {
        const duplicate = await Category.findOne({
          type: existing.type,
          name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          _id: { $ne: id },
        })
        if (duplicate) {
          return {
            status: 409,
            data: { error: "A category with this name already exists for this type" }
          }
        }
        existing.name = name.trim()
      }
      
      if (existing.type === "location") {
        if (lat !== undefined) existing.lat = lat ?? undefined
        if (lng !== undefined) existing.lng = lng ?? undefined
        if (address !== undefined) existing.address = address ?? undefined
        if (radius !== undefined) existing.radius = radius ?? undefined
        if (geofenceMode !== undefined) existing.geofenceMode = geofenceMode ?? undefined
        if (openingHour !== undefined) existing.openingHour = openingHour ?? undefined
        if (closingHour !== undefined) existing.closingHour = closingHour ?? undefined
      }
      
      if (existing.type === "role" || existing.type === "employer") {
        if (color !== undefined) existing.color = color
      }
      
      if (existing.type === "role") {
        if (defaultScheduleTemplate !== undefined) {
          existing.defaultScheduleTemplate = defaultScheduleTemplate
          existing.markModified('defaultScheduleTemplate') // Mark nested object as modified for Mongoose
        }
      }
      
      await existing.save()

      return {
        status: 200,
        data: {
          category: {
            id: existing._id,
            name: existing.name,
            type: existing.type,
            lat: existing.lat,
            lng: existing.lng,
            address: existing.address,
            radius: existing.radius,
            geofenceMode: existing.geofenceMode,
            openingHour: existing.openingHour,
            closingHour: existing.closingHour,
            color: existing.color,
            defaultScheduleTemplate: existing.defaultScheduleTemplate,
            createdAt: existing.createdAt,
            updatedAt: existing.updatedAt,
          },
        }
      }
    } catch (err) {
      console.error("[api/categories/[id] PATCH]", err)
      return {
        status: 500,
        data: { error: "Failed to update category" }
      }
    }
  }
})

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/categories/{id}',
  summary: 'Delete category',
  description: 'Delete a category by ID',
  tags: ['Categories'],
  security: 'adminAuth',
  request: {
    params: categoryIdParamSchema,
  },
  responses: {
    200: successResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const id = params?.id
    if (!id) {
      return {
        status: 400,
        data: { error: "Category ID is required" }
      }
    }

    try {
      await connectDB()
      const deleted = await Category.findByIdAndDelete(id)
      if (!deleted) {
        return {
          status: 404,
          data: { error: "Category not found" }
        }
      }
      
      return {
        status: 200,
        data: { success: true }
      }
    } catch (err) {
      console.error("[api/categories/[id] DELETE]", err)
      return {
        status: 500,
        data: { error: "Failed to delete category" }
      }
    }
  }
})