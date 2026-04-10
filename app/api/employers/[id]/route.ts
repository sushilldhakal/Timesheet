import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Employer } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import mongoose from "mongoose"

const employerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  abn: z.string().optional(),
  contactEmail: z.string().optional(),
  color: z.string().optional(),
  defaultAwardId: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const employerUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  abn: z.string().optional(),
  contactEmail: z.string().email().optional(),
  color: z.string().optional(),
  defaultAwardId: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/employers/{id}",
  summary: "Get employer",
  description: "Get a single employer by ID",
  tags: ["Employers"],
  security: "adminAuth",
  responses: {
    200: z.object({ employer: employerResponseSchema }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params as { id: string }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 404, data: { error: "Invalid employer ID" } }
    }

    await connectDB()
    const employer = await Employer.findById(id).lean()
    if (!employer) return { status: 404, data: { error: "Employer not found" } }

    return {
      status: 200,
      data: {
        employer: {
          id: employer._id.toString(),
          name: employer.name,
          abn: employer.abn,
          contactEmail: employer.contactEmail,
          color: employer.color,
          defaultAwardId: employer.defaultAwardId?.toString(),
          isActive: employer.isActive ?? true,
          createdAt: employer.createdAt ? new Date(employer.createdAt).toISOString() : null,
          updatedAt: employer.updatedAt ? new Date(employer.updatedAt).toISOString() : null,
        },
      },
    }
  },
})

export const PATCH = createApiRoute({
  method: "PATCH",
  path: "/api/employers/{id}",
  summary: "Update employer",
  description: "Update an employer by ID",
  tags: ["Employers"],
  security: "adminAuth",
  request: { body: employerUpdateSchema },
  responses: {
    200: z.object({ employer: employerResponseSchema }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params as { id: string }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 404, data: { error: "Invalid employer ID" } }
    }

    const payload = body!
    await connectDB()

    const employer = await Employer.findById(id)
    if (!employer) return { status: 404, data: { error: "Employer not found" } }

    // Check for duplicate name if name is being updated
    if (payload.name && payload.name.trim() !== employer.name) {
      const existing = await Employer.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
      }).lean()
      if (existing) return { status: 409, data: { error: "An employer with this name already exists" } }
    }

    // Update fields
    if (payload.name !== undefined) employer.name = payload.name.trim()
    if (payload.abn !== undefined) employer.abn = payload.abn
    if (payload.contactEmail !== undefined) employer.contactEmail = payload.contactEmail
    if (payload.color !== undefined) employer.color = payload.color
    if (payload.defaultAwardId !== undefined) {
      employer.defaultAwardId = payload.defaultAwardId 
        ? new mongoose.Types.ObjectId(payload.defaultAwardId) 
        : undefined
    }
    if (payload.isActive !== undefined) employer.isActive = payload.isActive

    await employer.save()

    return {
      status: 200,
      data: {
        employer: {
          id: employer._id.toString(),
          name: employer.name,
          abn: employer.abn,
          contactEmail: employer.contactEmail,
          color: employer.color,
          defaultAwardId: employer.defaultAwardId?.toString(),
          isActive: employer.isActive ?? true,
          createdAt: employer.createdAt ? employer.createdAt.toISOString() : null,
          updatedAt: employer.updatedAt ? employer.updatedAt.toISOString() : null,
        },
      },
    }
  },
})

export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/employers/{id}",
  summary: "Delete employer",
  description: "Delete an employer by ID",
  tags: ["Employers"],
  security: "adminAuth",
  responses: {
    200: z.object({ success: z.boolean() }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) return { status: 401, data: { error: "Unauthorized" } }

    const { id } = params as { id: string }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { status: 404, data: { error: "Invalid employer ID" } }
    }

    await connectDB()
    const employer = await Employer.findByIdAndDelete(id)
    if (!employer) return { status: 404, data: { error: "Employer not found" } }

    return {
      status: 200,
      data: { success: true },
    }
  },
})
