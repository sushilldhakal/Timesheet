import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { TemplateManager } from "@/lib/managers/template-manager"
import { 
  templateQuerySchema,
  templateCreateSchema,
  templatesListResponseSchema,
  templateCreateResponseSchema,
} from "@/lib/validations/schedule"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

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
      await connectDB()
      const templateManager = new TemplateManager()
      const isAdmin = ctx.auth.role === "admin" || ctx.auth.role === "super_admin"
      const templates = await templateManager.listRoleTemplates(ctx.auth.sub, isAdmin, organizationId)

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

    const { roleId, organizationId, shiftPattern } = body!

    try {
      await connectDB()
      const templateManager = new TemplateManager()

      const template = await templateManager.createRoleTemplate(
        roleId,
        organizationId,
        {
          dayOfWeek: shiftPattern.dayOfWeek,
          startTime: new Date(shiftPattern.startTime),
          endTime: new Date(shiftPattern.endTime),
          locationId: shiftPattern.locationId as string,
          roleId: (shiftPattern.roleId ?? roleId) as string,
          isRotating: shiftPattern.isRotating || false,
          rotationCycle: shiftPattern.rotationCycle,
          rotationStartDate: shiftPattern.rotationStartDate
            ? new Date(shiftPattern.rotationStartDate)
            : undefined,
        },
        ctx.auth.sub
      )

      return {
        status: 201,
        data: { template }
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