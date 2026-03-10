import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { SchedulingValidator } from "@/lib/validations/scheduling-validator"
import mongoose from "mongoose"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Validation schemas
const shiftParamsSchema = z.object({
  weekId: z.string().regex(/^\d{4}-W\d{2}$/, "Invalid week ID format (expected YYYY-Www)"),
  shiftId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid shift ID")
})

// Validation schema for shift update (all fields optional)
const shiftUpdateSchema = z.object({
  employeeId: z.string().regex(/^[0-9a-fA-F]{24}$/).nullable().optional(),
  date: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  locationId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  roleId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  notes: z.string().optional(),
})

const shiftResponseSchema = z.object({
  shift: z.any()
})

const deleteResponseSchema = z.object({
  message: z.string()
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  issues: z.record(z.string(), z.array(z.string())).optional(),
  details: z.string().optional()
})

/** PUT /api/rosters/[weekId]/shifts/[shiftId] - Update a shift */
export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/rosters/{weekId}/shifts/{shiftId}',
  summary: 'Update a shift',
  description: 'Update a roster shift with new details',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: shiftParamsSchema,
    body: shiftUpdateSchema
  },
  responses: {
    200: shiftResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const weekId = params!.weekId
    const shiftId = params!.shiftId

    try {
      await connectDB()
      
      const rosterManager = new RosterManager()
      
      // Prepare update data (only include provided fields)
      const updateData: Record<string, unknown> = {}
      
      if (body!.employeeId !== undefined) {
        updateData.employeeId = body!.employeeId ? new mongoose.Types.ObjectId(body!.employeeId) : null
      }
      if (body!.date) {
        updateData.date = new Date(body!.date)
      }
      if (body!.startTime) {
        updateData.startTime = new Date(body!.startTime)
      }
      if (body!.endTime) {
        updateData.endTime = new Date(body!.endTime)
      }
      if (body!.locationId) {
        updateData.locationId = new mongoose.Types.ObjectId(body!.locationId)
      }
      if (body!.roleId) {
        updateData.roleId = new mongoose.Types.ObjectId(body!.roleId)
      }
      if (body!.notes !== undefined) {
        updateData.notes = body!.notes
      }
      
      // If role, location, employee, or date are being updated, validate the shift
      if (body!.roleId || body!.locationId || body!.employeeId !== undefined || body!.date) {
        // Get the current shift to merge with updates
        const currentRoster = await rosterManager.getRoster(weekId)
        if (!currentRoster.success || !currentRoster.roster) {
          return { 
            status: 404, 
            data: { 
              error: "ROSTER_NOT_FOUND", 
              message: "Roster not found" 
            } 
          }
        }
        
        const currentShift = currentRoster.roster.shifts.find(
          (s) => s._id?.toString() === shiftId
        )
        
        if (!currentShift) {
          return { 
            status: 404, 
            data: { 
              error: "SHIFT_NOT_FOUND", 
              message: "Shift not found" 
            } 
          }
        }
        
        // Merge current shift data with updates for validation
        const employeeIdToValidate = body!.employeeId !== undefined 
          ? (body!.employeeId ? new mongoose.Types.ObjectId(body!.employeeId) : null)
          : currentShift.employeeId
        const roleIdToValidate = body!.roleId 
          ? new mongoose.Types.ObjectId(body!.roleId)
          : currentShift.roleId
        const locationIdToValidate = body!.locationId 
          ? new mongoose.Types.ObjectId(body!.locationId)
          : currentShift.locationId
        const dateToValidate = body!.date 
          ? new Date(body!.date)
          : currentShift.date
        
        // Validate the updated shift
        const validator = new SchedulingValidator()
        const validationResult = await validator.validateShift(
          employeeIdToValidate,
          roleIdToValidate,
          locationIdToValidate,
          dateToValidate
        )
        
        if (!validationResult.valid) {
          return { 
            status: 400, 
            data: {
              error: "VALIDATION_FAILED",
              message: validationResult.message || validationResult.error,
              details: validationResult.error,
            } 
          }
        }
      }
      
      const result = await rosterManager.updateShift(weekId, shiftId, updateData)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return { 
            status: 404, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }
        if (result.error === "SHIFT_NOT_FOUND") {
          return { 
            status: 404, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }
        return { 
          status: 400, 
          data: { 
            error: result.error, 
            message: result.message 
          } 
        }
      }
      
      return { 
        status: 200, 
        data: { shift: result.shift } 
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/shifts/[shiftId] PUT]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to update shift", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        } 
      }
    }
  }
});

/** DELETE /api/rosters/[weekId]/shifts/[shiftId] - Delete a shift */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/rosters/{weekId}/shifts/{shiftId}',
  summary: 'Delete a shift',
  description: 'Delete a roster shift',
  tags: ['rosters'],
  security: 'adminAuth',
  request: {
    params: shiftParamsSchema
  },
  responses: {
    200: deleteResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const weekId = params!.weekId
    const shiftId = params!.shiftId

    try {
      await connectDB()
      
      const rosterManager = new RosterManager()
      const result = await rosterManager.deleteShift(weekId, shiftId)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return { 
            status: 404, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }
        if (result.error === "SHIFT_NOT_FOUND") {
          return { 
            status: 404, 
            data: { 
              error: result.error, 
              message: result.message 
            } 
          }
        }
        return { 
          status: 500, 
          data: { 
            error: result.error, 
            message: result.message 
          } 
        }
      }
      
      return { 
        status: 200, 
        data: { message: "Shift deleted successfully" } 
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[api/rosters/[weekId]/shifts/[shiftId] DELETE]", err)
      return { 
        status: 500, 
        data: { 
          error: "Failed to delete shift", 
          details: process.env.NODE_ENV === "development" ? message : undefined 
        } 
      }
    }
  }
});
