import { connectDB, Employee, DailyShift } from "@/lib/db"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { z } from "zod"

const timesheetTodayResponseSchema = z.object({
  date: z.string(),
  punches: z.object({
    clockIn: z.string(),
    breakIn: z.string(),
    breakOut: z.string(),
    clockOut: z.string(),
  }),
})

/** GET /api/employee/timesheet - Today's punches for the logged-in employee */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employee/timesheet',
  summary: 'Get employee timesheet',
  description: 'Get today\'s punch data for the authenticated employee',
  tags: ['Clock'],
  security: 'employeeAuth',
  responses: {
    200: timesheetTodayResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    const auth = await getEmployeeFromCookie();
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    try {
      await connectDB();
      const employee = await Employee.findById(auth.sub).lean();
      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        };
      }

      // Get today's shift data - use Date object for proper MongoDB querying
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
      const todayFormatted = format(now, "dd-MM-yyyy", { locale: enUS });
      
      const shift = await DailyShift.findOne({ 
        pin: employee.pin, 
        date: todayStart 
      }).lean();

      const punches = {
        clockIn: shift?.clockIn?.time ? format(new Date(shift.clockIn.time), "h:mm:ss a", { locale: enUS }) : "",
        breakIn: shift?.breakIn?.time ? format(new Date(shift.breakIn.time), "h:mm:ss a", { locale: enUS }) : "",
        breakOut: shift?.breakOut?.time ? format(new Date(shift.breakOut.time), "h:mm:ss a", { locale: enUS }) : "",
        clockOut: shift?.clockOut?.time ? format(new Date(shift.clockOut.time), "h:mm:ss a", { locale: enUS }) : "",
      };

      return {
        status: 200,
        data: { date: todayFormatted, punches }
      };
    } catch (err) {
      console.error("[api/employee/timesheet GET]", err);
      return {
        status: 500,
        data: { error: "Failed to fetch timesheet" }
      };
    }
  }
});
