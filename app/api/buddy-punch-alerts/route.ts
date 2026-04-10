import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB, BuddyPunchAlert } from "@/lib/db"
import { 
  buddyPunchAlertsQuerySchema, 
  buddyPunchAlertCreateSchema,
  buddyPunchAlertsListResponseSchema,
  buddyPunchAlertCreateResponseSchema,
} from "@/lib/validations/buddy-punch-alerts"
import { errorResponseSchema } from "@/lib/validations/auth"

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
  handler: async ({ query, context }) => {
    const { status, employeeId, locationId, page = 1, limit = 50 } = query || {}

    try {
      await connectDB()

      // Build query
      const queryFilter: any = {}
      if (status) queryFilter.status = status
      if (employeeId) queryFilter.employeeId = employeeId
      
      console.log('[API] Buddy punch alerts query:', {
        requestedLocationId: locationId,
        status,
      })
      
      // Filter by location (permission filtering is currently disabled)
      if (locationId) {
        queryFilter.locationId = locationId
      }

      const skip = (page - 1) * limit

      console.log('[API] Final query:', queryFilter)

      const [alerts, total] = await Promise.all([
        BuddyPunchAlert.find(queryFilter)
          .populate("employeeId", "name pin")
          .populate("locationId", "name")
          .populate("reviewedBy", "name")
          .sort({ punchTime: -1 })
          .skip(skip)
          .limit(limit),
        BuddyPunchAlert.countDocuments(queryFilter),
      ])

      console.log('[API] Found alerts:', alerts.length, 'total:', total)

      return { 
        status: 200, 
        data: {
          success: true,
          alerts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        }
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
    const {
      employeeId,
      punchType,
      punchTime,
      matchScore,
      capturedPhotoUrl,
      enrolledPhotoUrl,
      locationId,
    } = body!

    try {
      await connectDB()

      const alert = await BuddyPunchAlert.create({
        employeeId,
        punchType,
        punchTime,
        matchScore,
        capturedPhotoUrl,
        enrolledPhotoUrl,
        locationId,
        status: "pending",
      })

      return { 
        status: 200, 
        data: {
          success: true,
          alert,
        }
      }
    } catch (error: any) {
      console.error("Error creating buddy punch alert:", error)
      return { status: 500, data: { error: error.message || "Failed to create alert" } }
    }
  }
})