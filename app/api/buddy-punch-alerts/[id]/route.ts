import { createApiRoute } from "@/lib/api/create-api-route"
import { connectDB, BuddyPunchAlert } from "@/lib/db"
import { 
  buddyPunchAlertIdParamSchema, 
  buddyPunchAlertUpdateSchema,
  buddyPunchAlertResponseSchema,
  buddyPunchAlertUpdateResponseSchema,
} from "@/lib/validations/buddy-punch-alerts"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"

// PATCH /api/buddy-punch-alerts/:id - Update status (dismiss/confirm)
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/buddy-punch-alerts/{id}',
  summary: 'Update buddy punch alert',
  description: 'Update status and notes of a buddy punch alert',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    params: buddyPunchAlertIdParamSchema,
    body: buddyPunchAlertUpdateSchema,
  },
  responses: {
    200: buddyPunchAlertUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body, context }) => {
    const { id } = params!
    const { status, notes } = body!

    try {
      await connectDB()

      const alert = await BuddyPunchAlert.findByIdAndUpdate(
        id,
        {
          status,
          notes,
          reviewedBy: undefined, // context?.auth?.sub not available in createApiRoute
          reviewedAt: new Date(),
        },
        { new: true }
      ).populate("employeeId", "name pin")
       .populate("locationId", "name")
       .populate("reviewedBy", "name")

      if (!alert) {
        return { status: 404, data: { error: "Alert not found" } }
      }

      return { 
        status: 200, 
        data: {
          success: true,
          message: "Alert updated successfully",
          alert,
        }
      }
    } catch (error: any) {
      console.error("Error updating buddy punch alert:", error)
      return { status: 500, data: { error: error.message || "Failed to update alert" } }
    }
  }
})

// GET /api/buddy-punch-alerts/:id - Get single alert
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/buddy-punch-alerts/{id}',
  summary: 'Get buddy punch alert by ID',
  description: 'Get a single buddy punch alert with full details',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    params: buddyPunchAlertIdParamSchema,
  },
  responses: {
    200: buddyPunchAlertResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { id } = params!

    try {
      await connectDB()

      const alert = await BuddyPunchAlert.findById(id)
        .populate("employeeId", "name pin")
        .populate("locationId", "name")
        .populate("reviewedBy", "name")

      if (!alert) {
        return { status: 404, data: { error: "Alert not found" } }
      }

      return { 
        status: 200, 
        data: {
          success: true,
          alert,
        }
      }
    } catch (error: any) {
      console.error("Error fetching buddy punch alert:", error)
      return { status: 500, data: { error: error.message || "Failed to fetch alert" } }
    }
  }
})

// DELETE /api/buddy-punch-alerts/:id - Delete alert
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/buddy-punch-alerts/{id}',
  summary: 'Delete buddy punch alert',
  description: 'Delete a buddy punch alert permanently',
  tags: ['FaceRecognition'],
  security: 'adminAuth',
  request: {
    params: buddyPunchAlertIdParamSchema,
  },
  responses: {
    200: successResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { id } = params!

    try {
      await connectDB()

      const alert = await BuddyPunchAlert.findByIdAndDelete(id)

      if (!alert) {
        return { status: 404, data: { error: "Alert not found" } }
      }

      return { 
        status: 200, 
        data: {
          success: true,
          message: "Alert deleted successfully",
        }
      }
    } catch (error: any) {
      console.error("Error deleting buddy punch alert:", error)
      return { status: 500, data: { error: error.message || "Failed to delete alert" } }
    }
  }
})