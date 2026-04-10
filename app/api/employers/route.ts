import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, Employer } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"

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

const employerQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform(val => val === "true"),
})

const employerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  abn: z.string().optional(),
  contactEmail: z.string().email().optional(),
  color: z.string().optional(),
  defaultAwardId: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const GET = createApiRoute({
  method: "GET",
  path: "/api/employers",
  summary: "List employers",
  description: "Get all employers, optionally filtered",
  tags: ["Employers"],
  security: "adminAuth",
  request: { query: employerQuerySchema },
  responses: {
    200: z.object({ employers: z.array(employerResponseSchema) }),
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

    const employers = await Employer.find(filter).sort({ name: 1 }).lean()
    return {
      status: 200,
      data: {
        employers: employers.map((e: any) => ({
          id: e._id.toString(),
          name: e.name,
          abn: e.abn,
          contactEmail: e.contactEmail,
          color: e.color,
          defaultAwardId: e.defaultAwardId?.toString(),
          isActive: e.isActive ?? true,
          createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
          updatedAt: e.updatedAt ? new Date(e.updatedAt).toISOString() : null,
        })),
      },
    }
  },
})

export const POST = createApiRoute({
  method: "POST",
  path: "/api/employers",
  summary: "Create employer",
  description: "Create a new employer",
  tags: ["Employers"],
  security: "adminAuth",
  request: { body: employerCreateSchema },
  responses: {
    200: z.object({ employer: employerResponseSchema }),
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

    const existing = await Employer.findOne({
      name: { $regex: new RegExp(`^${payload.name.trim()}$`, "i") },
    }).lean()
    if (existing) return { status: 409, data: { error: "An employer with this name already exists" } }

    const created = await Employer.create({
      ...payload,
      name: payload.name.trim(),
    })

    return {
      status: 200,
      data: {
        employer: {
          id: created._id.toString(),
          name: created.name,
          abn: created.abn,
          contactEmail: created.contactEmail,
          color: created.color,
          defaultAwardId: created.defaultAwardId?.toString(),
          isActive: created.isActive ?? true,
          createdAt: created.createdAt ? created.createdAt.toISOString() : null,
          updatedAt: created.updatedAt ? created.updatedAt.toISOString() : null,
        },
      },
    }
  },
})
