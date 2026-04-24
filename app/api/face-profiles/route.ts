import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  faceProfileCreateSchema, 
  faceProfilesQuerySchema,
  faceProfilesListResponseSchema,
  faceProfileCreateResponseSchema,
} from "@/lib/validations/face-profiles"
import { errorResponseSchema } from "@/lib/validations/auth"
import { faceProfilesService } from "@/lib/services/face-recognition/face-profiles-service"

// POST /api/face-profiles - Enroll or re-enroll a staff member
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/face-profiles',
  summary: 'Enroll face profile',
  description: 'Enroll or re-enroll a staff member face profile for recognition',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    body: faceProfileCreateSchema,
  },
  responses: {
    200: faceProfileCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    try {
      return await faceProfilesService.enroll(body)
    } catch (error: any) {
      console.error("Error enrolling face profile:", error)
      return { status: 500, data: { error: error.message || "Failed to enroll face profile" } }
    }
  }
})

// GET /api/face-profiles - Get all face profiles (admin only)
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/face-profiles',
  summary: 'List face profiles',
  description: 'Get all face profiles with optional filtering by active status',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    query: faceProfilesQuerySchema,
  },
  responses: {
    200: faceProfilesListResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    try {
      return { 
        status: 200, 
        data: await faceProfilesService.list(query)
      }
    } catch (error: any) {
      console.error("Error fetching face profiles:", error)
      return { status: 500, data: { error: error.message || "Failed to fetch face profiles" } }
    }
  }
})