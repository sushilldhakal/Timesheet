import { getAuthWithUserLocations } from "@/lib/auth/auth-api";
import { createApiRoute } from "@/lib/api/create-api-route";
import {
  calendarEventsQuerySchema,
  calendarEventCreateSchema,
  calendarEventsResponseSchema,
  calendarEventCreateResponseSchema,
} from "@/lib/validations/calendar";
import { errorResponseSchema } from "@/lib/validations/auth";
import { calendarService } from "@/lib/services/calendar/calendar-service";

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
  handler: async ({ query, req }) => {
    const ctx = await getAuthWithUserLocations();
    const data = await calendarService.getEvents({ query, req, adminCtx: ctx })
    return { status: 200, data }
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
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }
    const data = await calendarService.createShift(body!)
    return { status: 201, data }
  }
});
