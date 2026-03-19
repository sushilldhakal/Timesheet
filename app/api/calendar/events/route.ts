import { NextRequest, NextResponse } from "next/server";
import { getAuthWithUserLocations } from "@/lib/auth/auth-api";
import { connectDB } from "@/lib/db";
import { Roster, calculateWeekId, getWeekBoundaries } from "@/lib/db/schemas/roster";
import { parseISO, isValid } from "date-fns";
import type { IEvent } from "@/components/calendar/interfaces";
import mongoose from "mongoose";
import { createApiRoute } from "@/lib/api/create-api-route";
import {
  calendarEventsQuerySchema,
  calendarEventCreateSchema,
  calendarEventsResponseSchema,
  calendarEventCreateResponseSchema,
} from "@/lib/validations/calendar";
import { errorResponseSchema } from "@/lib/validations/auth";

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/calendar/events',
  summary: 'Get calendar events',
  description: 'Fetch filtered calendar events based on date range and optional user/location filter',
  tags: ['Calendar'],
  security: 'adminAuth',
  request: {
    query: calendarEventsQuerySchema,
  },
  responses: {
    200: calendarEventsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    console.log('[GET /api/calendar/events] Query params:', query);
    
    const ctx = await getAuthWithUserLocations();
    if (!ctx) {
      console.log('[GET /api/calendar/events] Unauthorized - no auth context');
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    console.log('[GET /api/calendar/events] Auth context:', { 
      role: ctx.auth.role, 
      userLocations: ctx.userLocations 
    });

    const { startDate: startDateParam, endDate: endDateParam, userId = "all", locationId = "all" } = query!;

    try {
      // Parse and validate dates
      let startDate: Date;
      let endDate: Date;
      
      try {
        startDate = parseISO(startDateParam);
        if (!isValid(startDate)) {
          throw new Error("Invalid startDate");
        }
      } catch (error) {
        return {
          status: 400,
          data: { error: "Invalid startDate format. Expected ISO date string." }
        };
      }

      try {
        endDate = parseISO(endDateParam);
        if (!isValid(endDate)) {
          throw new Error("Invalid endDate");
        }
      } catch (error) {
        return {
          status: 400,
          data: { error: "Invalid endDate format. Expected ISO date string." }
        };
      }

      // Validate date range
      if (startDate > endDate) {
        return {
          status: 400,
          data: { error: "startDate must be before or equal to endDate" }
        };
      }

      // Connect to database
      await connectDB();

      // Query rosters that overlap with the date range
      const rosters = await Roster.find({
        weekStartDate: { $lte: endDate },
        weekEndDate: { $gte: startDate },
      })
        .populate("shifts.employeeId", "name picturePath")
        .populate("shifts.roleId", "name")
        .populate("shifts.locationId", "name");

      // Transform roster shifts to calendar events
      const events: IEvent[] = [];

      for (const roster of rosters) {
        for (const shift of roster.shifts) {
          // Filter by date range - shift must overlap with requested range
          const shiftStart = new Date(shift.startTime);
          const shiftEnd = new Date(shift.endTime);

          if (shiftStart <= endDate && shiftEnd >= startDate) {
            // Filter by user if specified
            const employeeId = (shift.employeeId as any)?._id?.toString() || "vacant";
            const employeeName = (shift.employeeId as any)?.name || "Vacant";
            const employeePicture = (shift.employeeId as any)?.picturePath || null;
            const roleName = (shift.roleId as any)?.name || "Unknown Role";
            const locationIdStr = (shift.locationId as any)?._id?.toString() || "";
            const locationName = (shift.locationId as any)?.name || "Unknown Location";
            
            // Filter by user and location
            const matchesUser = userId === "all" || userId === employeeId;
            const matchesLocation = locationId === "all" || locationId === locationIdStr;
            
            if (matchesUser && matchesLocation) {
              // Use shift._id as unique identifier to avoid duplicate keys
              const shiftId = shift._id?.toString() || `${roster._id}-${events.length}`;
              
              // Determine color based on role (you can customize this logic)
              const colors: Array<"blue" | "green" | "red" | "yellow" | "purple" | "orange"> = [
                "blue",
                "green", 
                "red",
                "yellow",
                "purple",
                "orange",
              ];
              const colorIndex = events.length % colors.length;

              const event: IEvent = {
                id: shiftId,
                startDate: shiftStart.toISOString(),
                endDate: shiftEnd.toISOString(),
                title: `${roleName} - ${locationName}`,
                color: colors[colorIndex],
                description: shift.notes || "",
                user: {
                  id: employeeId,
                  name: employeeName,
                  picturePath: employeePicture,
                },
              };

              // Add roleId and locationId for filtering (cast to any to add extra properties)
              (event as any).roleId = (shift.roleId as any)?._id?.toString() || "";
              (event as any).locationId = locationIdStr;

              events.push(event);
            }
          }
        }
      }

      return {
        status: 200,
        data: { events }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[api/calendar/events GET]", error);
      return {
        status: 500,
        data: {
          error: "Failed to fetch events",
          details: process.env.NODE_ENV === "development" ? message : undefined,
        }
      };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/calendar/events',
  summary: 'Create calendar event',
  description: 'Create a new shift in the roster',
  tags: ['Calendar'],
  security: 'adminAuth',
  request: {
    body: calendarEventCreateSchema,
  },
  responses: {
    201: calendarEventCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations();
    if (!ctx) {
      console.error('POST /api/calendar/events - Unauthorized');
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    const {
      employeeId,
      roleId,
      locationId,
      employerId,
      startDate,
      startTime,
      endDate,
      endTime,
      breakMinutes,
      notes,
    } = body!;

    try {
      console.log('POST /api/calendar/events - Received body:', body);

      // Parse dates
      const shiftDate = parseISO(startDate);
      if (!isValid(shiftDate)) {
        console.error('Invalid startDate:', startDate);
        return {
          status: 400,
          data: { error: "Invalid startDate format" }
        };
      }

      // Create start and end datetime
      const shiftStart = new Date(shiftDate);
      shiftStart.setHours(startTime.hour, startTime.minute, 0, 0);

      const shiftEndDate = parseISO(endDate);
      const shiftEnd = new Date(shiftEndDate);
      shiftEnd.setHours(endTime.hour, endTime.minute, 0, 0);

      console.log('Shift times:', {
        shiftStart: shiftStart.toISOString(),
        shiftEnd: shiftEnd.toISOString(),
      });

      // Validate times
      if (shiftStart >= shiftEnd) {
        console.error('Invalid time range:', { shiftStart, shiftEnd });
        return {
          status: 400,
          data: { error: "Start time must be before end time" }
        };
      }

      // Connect to database
      await connectDB();
      console.log('Connected to database');

      // Calculate week ID for the shift
      const weekId = calculateWeekId(shiftDate);
      const { start: weekStartDate, end: weekEndDate } = getWeekBoundaries(weekId);
      const [year, weekStr] = weekId.split("-W");
      const weekNumber = parseInt(weekStr, 10);

      console.log('Week info:', { weekId, weekStartDate, weekEndDate, year, weekNumber });

      // Find or create roster for this week
      let roster = await Roster.findOne({ weekId });

      if (!roster) {
        console.log('Creating new roster for week:', weekId);
        roster = new Roster({
          weekId,
          year: parseInt(year, 10),
          weekNumber,
          weekStartDate,
          weekEndDate,
          shifts: [],
          status: "draft",
        });
      } else {
        console.log('Found existing roster:', roster._id);
      }

      // Create new shift
      const newShift = {
        _id: new mongoose.Types.ObjectId(),
        employeeId: employeeId && employeeId !== "vacant" ? new mongoose.Types.ObjectId(employeeId) : null,
        date: shiftDate,
        startTime: shiftStart,
        endTime: shiftEnd,
        locationId: new mongoose.Types.ObjectId(locationId),
        roleId: new mongoose.Types.ObjectId(roleId),
        sourceScheduleId: null,
        estimatedCost: 0, // TODO: Calculate based on employee award
        notes: notes || "",
      };

      console.log('New shift:', newShift);

      // Add shift to roster
      roster.shifts.push(newShift as any);

      // Save roster
      console.log('Saving roster...');
      await roster.save();
      console.log('Roster saved successfully');

      return {
        status: 201,
        data: {
          message: "Shift created successfully",
          shift: {
            _id: newShift._id.toString(),
            employeeId: newShift.employeeId?.toString() || null,
            date: newShift.date.toISOString(),
            startTime: newShift.startTime.toISOString(),
            endTime: newShift.endTime.toISOString(),
            locationId: newShift.locationId.toString(),
            roleId: newShift.roleId.toString(),
            sourceScheduleId: newShift.sourceScheduleId,
            estimatedCost: newShift.estimatedCost,
            notes: newShift.notes,
          },
          weekId,
        }
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[api/calendar/events POST] Error:", error);
      console.error("[api/calendar/events POST] Stack:", error instanceof Error ? error.stack : 'No stack');
      return {
        status: 500,
        data: {
          error: "Failed to create shift",
          details: process.env.NODE_ENV === "development" ? message : undefined,
        }
      };
    }
  }
});
