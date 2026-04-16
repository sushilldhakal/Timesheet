import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { schedulesTemplateCopyService } from "@/lib/services/scheduling/schedules-template-copy-service"

// Request schema
const copyFromTemplateRequestSchema = z.object({
  templateId: z.string(),
  employeeId: z.string(),
  overwrite: z.boolean().optional()
})

// Response schemas
const copyFromTemplateResponseSchema = z.object({
  schedule: z.any()
})

const errorResponseSchema = z.object({
  error: z.string()
})

/**
 * POST /api/schedules/copy-from-template
 * Copy a role template to an employee's schedule
 */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/schedules/copy-from-template',
  summary: 'Copy template to employee schedule',
  description: 'Copy a role template to an employee\'s schedule',
  tags: ['schedules'],
  security: 'adminAuth',
  request: {
    body: copyFromTemplateRequestSchema
  },
  responses: {
    201: copyFromTemplateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    try {
      return await schedulesTemplateCopyService.copyFromTemplate(body)
    } catch (err: any) {
      console.error("[api/schedules/copy-from-template POST]", err)
      
      if (err.message?.includes("already has schedules")) {
        return { status: 409, data: { error: err.message } }
      }

      return { status: 500, data: { error: "Failed to copy template" } }
    }
  }
});
