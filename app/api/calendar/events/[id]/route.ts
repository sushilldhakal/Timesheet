import { getAuthWithUserLocations } from "@/lib/auth/auth-api";
import { createApiRoute } from "@/lib/api/create-api-route";
import {
  calendarEventCreateSchema,
  calendarEventCreateResponseSchema,
} from "@/lib/validations/calendar";
import { errorResponseSchema } from "@/lib/validations/auth";
import { z } from "zod";
import { calendarService } from "@/lib/services/calendar/calendar-service";

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
  handler: async ({ params, body }) => {

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

    const data = await calendarService.updateShift(id, updateData)
    return { status: 200, data }
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
  handler: async ({ params }) => {

    const ctx = await getAuthWithUserLocations();
    if (!ctx) {
      console.error('DELETE /api/calendar/events/[id] - Unauthorized');
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    const { id } = params!;

    const data = await calendarService.deleteShift(id)
    return { status: 200, data }
  }
});