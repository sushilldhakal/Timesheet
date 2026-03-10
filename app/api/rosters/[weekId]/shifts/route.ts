import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB } from "@/lib/db"
import { RosterManager } from "@/lib/managers/roster-manager"
import { SchedulingValidator } from "@/lib/validations/scheduling-validator"
import { 
  weekIdParamSchema,
  addShiftSchema,
  shiftCreateResponseSchema,
} from "@/lib/validations/roster"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import mongoose from "mongoose"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/rosters/{weekId}/shifts',
  summary: 'Add a shift to a roster',
  description: 'Add a new shift to a roster with validation',
  tags: ['Rosters'],
  security: 'adminAuth',
  request: {
    params: weekIdParamSchema,
    body: addShiftSchema,
  },
  responses: {
    201: shiftCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    const weekId = params!.weekId
    const shiftData = body!

    try {
      await connectDB()
      
      // Validate shift using SchedulingValidator
      const validator = new SchedulingValidator()
      const validationResult = await validator.validateShift(
        shiftData.employeeId ? new mongoose.Types.ObjectId(shiftData.employeeId) : null,
        new mongoose.Types.ObjectId(shiftData.roleId),
        new mongoose.Types.ObjectId(shiftData.locationId),
        new Date(shiftData.date)
      )
      
      if (!validationResult.valid) {
        return {
          status: 400,
          data: { error: validationResult.message || validationResult.error || "Validation failed" }
        }
      }
      
      const rosterManager = new RosterManager()
      
      // Prepare shift data
      const preparedShiftData = {
        employeeId: shiftData.employeeId ? new mongoose.Types.ObjectId(shiftData.employeeId) : null,
        date: new Date(shiftData.date),
        startTime: new Date(shiftData.startTime),
        endTime: new Date(shiftData.endTime),
        locationId: new mongoose.Types.ObjectId(shiftData.locationId),
        roleId: new mongoose.Types.ObjectId(shiftData.roleId),
        sourceScheduleId: shiftData.sourceScheduleId ? new mongoose.Types.ObjectId(shiftData.sourceScheduleId) : null,
        notes: shiftData.notes || "",
      }
      
      const result = await rosterManager.addShift(weekId, preparedShiftData)
      
      if (!result.success) {
        if (result.error === "ROSTER_NOT_FOUND") {
          return {
            status: 404,
            data: { error: result.message || "Roster not found" }
          }
        }
        return {
          status: 400,
          data: { error: result.message || "Failed to add shift" }
        }
      }
      
      return {
        status: 201,
        data: { shift: result.shift }
      }
    } catch (err) {
      console.error("[api/rosters/[weekId]/shifts POST]", err)
      return {
        status: 500,
        data: { error: "Failed to add shift" }
      }
    }
  }
})