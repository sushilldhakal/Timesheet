import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB, Employee, StaffFaceProfile } from "@/lib/db"
import { isValidDescriptor } from "@/lib/services/face-matching"
import { 
  faceProfileCreateSchema, 
  faceProfilesQuerySchema,
  faceProfilesListResponseSchema,
  faceProfileCreateResponseSchema,
} from "@/lib/validations/face-profiles"
import { errorResponseSchema } from "@/lib/validations/auth"

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
    const { employeeId, descriptor, enrollmentQuality, enrolledBy = "admin" } = body!

    try {
      await connectDB()

      if (!isValidDescriptor(descriptor)) {
        return { status: 400, data: { error: "Invalid descriptor format" } }
      }

      // Verify employee exists
      const employee = await Employee.findById(employeeId)
      if (!employee) {
        return { status: 404, data: { error: "Employee not found" } }
      }

      // Check if profile already exists
      const existingProfile = await StaffFaceProfile.findOne({ employeeId })

      if (existingProfile) {
        // Re-enroll: update existing profile
        existingProfile.descriptor = descriptor
        existingProfile.enrollmentQuality = enrollmentQuality
        existingProfile.enrolledBy = enrolledBy as "auto" | "admin"
        existingProfile.enrolledAt = new Date()
        existingProfile.isActive = true
        await existingProfile.save()

        return { 
          status: 200, 
          data: {
            success: true,
            message: "Face profile updated successfully",
            profile: existingProfile,
          }
        }
      } else {
        // New enrollment
        const newProfile = await StaffFaceProfile.create({
          employeeId,
          descriptor,
          enrollmentQuality,
          enrolledBy,
          enrolledAt: new Date(),
          isActive: true,
        })

        return { 
          status: 200, 
          data: {
            success: true,
            message: "Face profile enrolled successfully",
            profile: newProfile,
          }
        }
      }
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
    const { activeOnly } = query || {}

    try {
      await connectDB()

      const queryFilter = activeOnly ? { isActive: true } : {}
      
      const profiles = await StaffFaceProfile.find(queryFilter)
        .populate("employeeId", "name pin")
        .select("-descriptor") // Don't send descriptors in list view
        .sort({ enrolledAt: -1 })

      return { 
        status: 200, 
        data: {
          success: true,
          profiles,
        }
      }
    } catch (error: any) {
      console.error("Error fetching face profiles:", error)
      return { status: 500, data: { error: error.message || "Failed to fetch face profiles" } }
    }
  }
})