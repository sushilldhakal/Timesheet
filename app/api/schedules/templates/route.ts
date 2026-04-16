import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { 
  templateQuerySchema,
  templateCreateSchema,
  templatesListResponseSchema,
  templateCreateResponseSchema,
} from "@/lib/validations/schedule"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { roleTemplateService } from "@/lib/services/scheduling/role-template-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/schedules/templates',
  summary: 'List role templates',
  description: 'List all role templates for an organization',
  tags: ['Schedules'],
  security: 'adminAuth',
  request: {
    query: templateQuerySchema,
  },
  responses: {
    200: templatesListResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const organizationId = query?.organizationId ?? ""

    try {
      const { templates } = await roleTemplateService.listRoleTemplates(ctx, organizationId)

      return {
        status: 200,
        data: { templates }
      }
    } catch (err) {
      console.error("[api/schedules/templates GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch templates" }
      }
    }
  }
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/schedules/templates',
  summary: 'Create role template',
  description: 'Create a new role template with shift patterns',
  tags: ['Schedules'],
  security: 'adminAuth',
  request: {
    body: templateCreateSchema,
  },
  responses: {
    201: templateCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    try {
      return {
        status: 201,
        data: await roleTemplateService.createRoleTemplate(ctx, body)
      }
    } catch (err) {
      console.error("[api/schedules/templates POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create template" }
      }
    }
  }
})