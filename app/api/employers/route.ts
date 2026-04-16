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
  color: z.string().optional(),
  defaultAwardId: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
})

const employerQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false"]).optional().transform(val => val ? val === "true" : undefined),
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

    return await employerService.list(query as any)
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

    return await employerService.create(body)
  },
})
