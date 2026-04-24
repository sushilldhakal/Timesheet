import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeIdParamSchema, 
  faceProfileUpdateSchema,
  faceProfileResponseSchema,
  faceProfileCreateResponseSchema,
} from "@/lib/validations/face-profiles"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"
import { faceProfilesService } from "@/lib/services/face-recognition/face-profiles-service"

// GET /api/face-profiles/:employeeId - Fetch profile for employee
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/face-profiles/{employeeId}',
  summary: 'Get face profile by employee ID',
  description: 'Fetch face profile for a specific employee (without descriptor for security)',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
  },
  responses: {
    200: faceProfileResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { employeeId } = params!

    try {
      return await faceProfilesService.get(employeeId)
    } catch (error: any) {
      console.error("Error fetching face profile:", error)
      return { status: 500, data: { error: error.message || "Failed to fetch face profile" } }
    }
  }
})

// DELETE /api/face-profiles/:employeeId - GDPR right to erasure
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/face-profiles/{employeeId}',
  summary: 'Delete face profile',
  description: 'Delete face profile for GDPR compliance (right to erasure)',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
  },
  responses: {
    200: successResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { employeeId } = params!

    try {
      return await faceProfilesService.remove(employeeId)
    } catch (error: any) {
      console.error("Error deleting face profile:", error)
      return { status: 500, data: { error: error.message || "Failed to delete face profile" } }
    }
  }
})

// PATCH /api/face-profiles/:employeeId - Toggle active status
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/face-profiles/{employeeId}',
  summary: 'Update face profile status',
  description: 'Toggle active status of a face profile',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: faceProfileUpdateSchema,
  },
  responses: {
    200: faceProfileCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const { employeeId } = params!
    const { isActive } = body!

    try {
      return await faceProfilesService.setActive(employeeId, isActive)
    } catch (error: any) {
      console.error("Error updating face profile:", error)
      return { status: 500, data: { error: error.message || "Failed to update face profile" } }
    }
  }
})