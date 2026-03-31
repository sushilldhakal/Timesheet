import { NextRequest, NextResponse } from "next/server";
import { getAuthWithUserLocations } from "@/lib/auth/auth-api";
import { connectDB } from "@/lib/db";
import { Roster } from "@/lib/db/schemas/roster";
import { parseISO, isValid } from "date-fns";
import mongoose from "mongoose";
import { createApiRoute } from "@/lib/api/create-api-route";
import {
  calendarEventCreateSchema,
  calendarEventCreateResponseSchema,
} from "@/lib/validations/calendar";
import { errorResponseSchema } from "@/lib/validations/auth";
import { z } from "zod";

const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

const updateCalendarEventSchema = z.object({
  employeeId: z.string().optional(),
  roleId: z.string().optional(),
  locationId: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }).optional(),
  endDate: z.string().optional(),
  endTime: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }).optional(),
  breakMinutes: z.number().int().min(0).optional(),
  /** Explicit break window as decimal hours */
  breakStartH: z.number().min(0).max(24).optional(),
  breakEndH: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/calendar/events/{id}',
  summary: 'Update calendar event',
  description: 'Update an existing shift in the roster',
  tags: ['Calendar'],
  security: 'adminAuth',
  request: {
    params: idParamSchema,
    body: updateCalendarEventSchema,
  },
  responses: {
    200: calendarEventCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {;;

    const ctx = await getAuthWithUserLocations();
    if (!ctx) {
      console.error('PUT /api/calendar/events/[id] - Unauthorized');
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    const { id } = params!;
    const updateData = body!;

    try {
      // Connect to database
      await connectDB();
      console.log('Connected to database');

      // Find the roster containing the shift
      const roster = await Roster.findOne({
        "shifts._id": new mongoose.Types.ObjectId(id)
      });

      if (!roster) {
        console.error('Shift not found:', id);
        return {
          status: 404,
          data: { error: "Shift not found" }
        };
      }

      console.log('Found roster:', roster._id);

      // Find the specific shift
      const shiftIndex = roster.shifts.findIndex(
        (shift: any) => shift._id.toString() === id
      );

      if (shiftIndex === -1) {
        console.error('Shift not found in roster:', id);
        return {
          status: 404,
          data: { error: "Shift not found" }
        };
      }

      const shift = roster.shifts[shiftIndex];
      console.log('Found shift:', shift);

      // Update shift fields
      if (updateData.employeeId !== undefined) {
        shift.employeeId = updateData.employeeId && updateData.employeeId !== "vacant" 
          ? new mongoose.Types.ObjectId(updateData.employeeId) 
          : null;
      }

      if (updateData.roleId) {
        shift.roleId = new mongoose.Types.ObjectId(updateData.roleId);
      }

      if (updateData.locationId) {
        shift.locationId = new mongoose.Types.ObjectId(updateData.locationId);
      }

      if (updateData.startDate && updateData.startTime) {
        const shiftDate = parseISO(updateData.startDate);
        if (!isValid(shiftDate)) {
          return {
            status: 400,
            data: { error: "Invalid startDate format" }
          };
        }

        const shiftStart = new Date(shiftDate);
        shiftStart.setHours(updateData.startTime.hour, updateData.startTime.minute, 0, 0);
        shift.startTime = shiftStart;
        shift.date = shiftDate;
      }

      if (updateData.endDate && updateData.endTime) {
        const shiftEndDate = parseISO(updateData.endDate);
        if (!isValid(shiftEndDate)) {
          return {
            status: 400,
            data: { error: "Invalid endDate format" }
          };
        }

        const shiftEnd = new Date(shiftEndDate);
        shiftEnd.setHours(updateData.endTime.hour, updateData.endTime.minute, 0, 0);
        shift.endTime = shiftEnd;
      }

      if (updateData.notes !== undefined) {
        shift.notes = updateData.notes;
      }

      // Update break window — explicit hours take precedence over breakMinutes
      if (updateData.breakStartH !== undefined && updateData.breakEndH !== undefined) {
        const baseDate = shift.date ?? shift.startTime
        const bst = new Date(baseDate)
        bst.setHours(Math.floor(updateData.breakStartH), Math.round((updateData.breakStartH % 1) * 60), 0, 0)
        const bet = new Date(baseDate)
        bet.setHours(Math.floor(updateData.breakEndH), Math.round((updateData.breakEndH % 1) * 60), 0, 0)
        ;(shift as any).breakStartTime = bst
        ;(shift as any).breakEndTime   = bet
        ;(shift as any).breakMinutes   = Math.round((bet.getTime() - bst.getTime()) / 60_000)
      } else if (updateData.breakMinutes !== undefined) {
        if (updateData.breakMinutes === 0) {
          // Clear break
          ;(shift as any).breakStartTime = undefined
          ;(shift as any).breakEndTime   = undefined
          ;(shift as any).breakMinutes   = 0
        } else {
          const s = new Date(shift.startTime)
          const e = new Date(shift.endTime)
          const midMs  = s.getTime() + (e.getTime() - s.getTime()) / 2
          const halfMs = (updateData.breakMinutes / 2) * 60_000
          ;(shift as any).breakStartTime = new Date(midMs - halfMs)
          ;(shift as any).breakEndTime   = new Date(midMs + halfMs)
          ;(shift as any).breakMinutes   = updateData.breakMinutes
        }
      }

      // Validate times if both are present
      if (shift.startTime && shift.endTime && shift.startTime >= shift.endTime) {
        return {
          status: 400,
          data: { error: "Start time must be before end time" }
        };
      }

      console.log('Updated shift:', shift);

      // Save the roster
      await roster.save();
      console.log('Roster saved successfully');

      return {
        status: 200,
        data: {
          message: "Shift updated successfully",
          shift: {
            _id: shift._id.toString(),
            employeeId: shift.employeeId?.toString() || null,
            date: shift.date.toISOString(),
            startTime: shift.startTime.toISOString(),
            endTime: shift.endTime.toISOString(),
            locationId: shift.locationId.toString(),
            roleId: shift.roleId.toString(),
            sourceScheduleId: shift.sourceScheduleId,
            estimatedCost: shift.estimatedCost,
            notes: shift.notes,
            breakStartTime: (shift as any).breakStartTime?.toISOString?.(),
            breakEndTime:   (shift as any).breakEndTime?.toISOString?.(),
            breakMinutes:   (shift as any).breakMinutes,
          },
          weekId: roster.weekId,
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[api/calendar/events/[id] PUT] Error:", error);
      console.error("[api/calendar/events/[id] PUT] Stack:", error instanceof Error ? error.stack : 'No stack');
      return {
        status: 500,
        data: {
          error: "Failed to update shift",
          details: process.env.NODE_ENV === "development" ? message : undefined,
        }
      };
    }
  }
});

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/calendar/events/{id}',
  summary: 'Delete calendar event',
  description: 'Delete a shift from the roster',
  tags: ['Calendar'],
  security: 'adminAuth',
  request: {
    params: idParamSchema,
  },
  responses: {
    200: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {;

    const ctx = await getAuthWithUserLocations();
    if (!ctx) {
      console.error('DELETE /api/calendar/events/[id] - Unauthorized');
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    const { id } = params!;

    try {
      // Connect to database
      await connectDB();
      console.log('Connected to database');

      // Find and update the roster by removing the shift
      const result = await Roster.updateOne(
        { "shifts._id": new mongoose.Types.ObjectId(id) },
        { $pull: { shifts: { _id: new mongoose.Types.ObjectId(id) } } }
      );

      console.log('Delete result:', result);

      if (result.matchedCount === 0) {
        console.error('Shift not found:', id);
        return {
          status: 404,
          data: { error: "Shift not found" }
        };
      }

      if (result.modifiedCount === 0) {
        console.error('Shift not deleted:', id);
        return {
          status: 500,
          data: { error: "Failed to delete shift" }
        };
      }

      console.log('Shift deleted successfully');

      return {
        status: 200,
        data: {
          success: true,
          message: "Shift deleted successfully"
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[api/calendar/events/[id] DELETE] Error:", error);
      console.error("[api/calendar/events/[id] DELETE] Stack:", error instanceof Error ? error.stack : 'No stack');
      return {
        status: 500,
        data: {
          error: "Failed to delete shift",
          details: process.env.NODE_ENV === "development" ? message : undefined,
        }
      };
    }
  }
});