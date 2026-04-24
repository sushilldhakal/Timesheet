import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  buddyPunchAlertsQuerySchema, 
  buddyPunchAlertCreateSchema,
  buddyPunchAlertsListResponseSchema,
  buddyPunchAlertCreateResponseSchema,
} from "@/lib/validations/buddy-punch-alerts"
import { errorResponseSchema } from "@/lib/validations/auth"
import { buddyPunchAlertsService } from "@/lib/services/face-recognition/buddy-punch-alerts-service"

// GET /api/buddy-punch-alerts - Dashboard list
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/buddy-punch-alerts',
  summary: 'List buddy punch alerts',
  description: 'Get paginated list of buddy punch alerts with filtering options',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    query: buddyPunchAlertsQuerySchema,
  },
  responses: {
    200: buddyPunchAlertsListResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    try {
      return { 
        status: 200, 
        data: await buddyPunchAlertsService.list(query)
      }
    } catch (error: any) {
      console.error("Error fetching buddy punch alerts:", error)
      return { status: 500, data: { error: error.message || "Failed to fetch alerts" } }
    }
  }
})

// POST /api/buddy-punch-alerts - Create new alert (internal use)
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/buddy-punch-alerts',
  summary: 'Create buddy punch alert',
  description: 'Create a new buddy punch alert (internal use)',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    body: buddyPunchAlertCreateSchema,
  },
  responses: {
    200: buddyPunchAlertCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      return { 
        status: 200, 
        data: await buddyPunchAlertsService.create(body)
      }
    } catch (error: any) {
      console.error("Error creating buddy punch alert:", error)
      return { status: 500, data: { error: error.message || "Failed to create alert" } }
    }
  }
})