import { z } from "zod"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employerService } from "@/lib/services/employer/employer-service"

const employerResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  abn: z.string().optional(),
  contactEmail: z.string().optional(),
  phone: z.string().optional(),
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
  phone: z.string().optional(),
  color: z.string().optional(),
  defaultAwardId: z.string().optional(),
  isActive: z.boolean().optional(),
  payPeriodConfig: z.object({
    windowType: z.enum(["weekly", "fortnightly", "roster_cycle", "rolling_days"]),
    periodStartDayOfWeek: z.number().int().min(0).max(6).optional(),
    rosterCycleDays: z.number().int().min(7).max(84).optional(),
    rollingDays: z.number().int().min(7).max(84).optional(),
  }).optional(),
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
    return await employerService.getById(id)
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
    return await employerService.update(id, body)
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
    return await employerService.delete(id)
  },
})
