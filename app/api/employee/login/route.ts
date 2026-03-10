import { connectDB, Employee, DailyShift, Category } from "@/lib/db"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import { createEmployeeToken, setEmployeeCookie } from "@/lib/auth/auth-helpers"
import { employeeLoginSchema, employeeLoginResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { isWithinGeofence } from "@/lib/utils/validation/geofence"
import { logger } from "@/lib/utils/logger"
import { createApiRoute } from "@/lib/api/create-api-route"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"

export const dynamic = "force-dynamic"

/**
 * Check if today is the employee's birthday
 * Supports formats: YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY
 */
function checkIfBirthday(dob?: string): boolean {
  if (!dob || typeof dob !== "string" || !dob.trim()) return false
  
  const today = new Date()
  const todayMonth = today.getMonth() + 1 // 1-12
  const todayDay = today.getDate() // 1-31
  
  const dobStr = dob.trim()
  
  // Try different date formats
  let month: number | null = null
  let day: number | null = null
  
  // Format: YYYY-MM-DD (e.g., "1998-12-12")
  const isoMatch = dobStr.match(/^\d{4}-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    month = parseInt(isoMatch[1], 10)
    day = parseInt(isoMatch[2], 10)
  }
  
  // Format: DD-MM-YYYY (e.g., "12-12-1998")
  const ddmmyyyyMatch = dobStr.match(/^(\d{1,2})-(\d{1,2})-\d{4}$/)
  if (ddmmyyyyMatch) {
    day = parseInt(ddmmyyyyMatch[1], 10)
    month = parseInt(ddmmyyyyMatch[2], 10)
  }
  
  // Format: MM/DD/YYYY (e.g., "12/12/1998")
  const mmddyyyyMatch = dobStr.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/)
  if (mmddyyyyMatch) {
    month = parseInt(mmddyyyyMatch[1], 10)
    day = parseInt(mmddyyyyMatch[2], 10)
  }
  
  if (month === null || day === null) return false
  
  return month === todayMonth && day === todayDay
}

/** POST /api/employee/login - Verify PIN, create employee session. Returns employee + today's punches for clock page (no extra fetch needed). */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/login',
  summary: 'Employee PIN login',
  description: 'Authenticate employee with PIN and return session with today\'s punch data',
  tags: ['Clock'],
  security: 'none',
  request: {
    body: employeeLoginSchema
  },
  responses: {
    200: employeeLoginResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }
      
      const { pin, lat: userLat, lng: userLng } = body;
      const pinStr = pin.trim();

      await connectDB();
      const employee = await Employee.findOne({ pin: pinStr }).lean();
      if (!employee) {
        return {
          status: 401,
          data: { error: "Invalid PIN" }
        };
      }

      // Helper to normalize arrays
      const arr = (v: unknown) => (Array.isArray(v) ? v : v ? [String(v)] : []);
      const locations = arr(employee.location);
      const employers = arr(employee.employer);
      
      // Get employee's current role assignments
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: employee._id,
        isActive: true,
      })
        .populate("roleId", "name")
        .lean();
      
      const roles = roleAssignments.map((assignment: any) => assignment.roleId?.name).filter(Boolean);
      
      let geofenceWarning = false;
      let detectedLocation: string | null = null;
      
      // Check geofence if employee has location and user provided coordinates
      if (locations.length > 0 && userLat !== undefined && userLng !== undefined) {
        // Find ALL location categories assigned to this employee
        const locationCategories = await Category.find({
          type: "location",
          name: { $in: locations },
          lat: { $exists: true, $ne: null },
          lng: { $exists: true, $ne: null },
        }).lean();

        if (locationCategories.length > 0) {
          // Check if user is within ANY of their assigned locations (not all)
          const withinAnyGeofence = locationCategories.some((locationCategory) => {
            const radius = locationCategory.radius ?? 100;
            const isWithin = isWithinGeofence(
              userLat,
              userLng,
              locationCategory.lat!,
              locationCategory.lng!,
              radius
            );
            
            // Track which location they're at
            if (isWithin && !detectedLocation) {
              detectedLocation = locationCategory.name;
            }
            
            return isWithin;
          });

          if (!withinAnyGeofence) {
            // Not at ANY of their assigned locations
            // Check if any location has hard mode
            const hasHardMode = locationCategories.some((loc) => (loc.geofenceMode ?? "hard") === "hard");
            
            if (hasHardMode) {
              return {
                status: 403,
                data: { 
                  error: "You are outside the allowed location range. Please move closer to clock in or contact IT support."
                }
              };
            }
            
            // All locations are soft mode - allow but warn
            geofenceWarning = true;
          }
        }
      }

      const token = await createEmployeeToken({
        sub: String(employee._id),
        pin: pinStr,
      });
      await setEmployeeCookie(token);

      const displayRole = roles[0] || locations[0] || employers[0] || "";

      // Check if today is employee's birthday
      const isBirthday = checkIfBirthday(employee.dob);

      // Get today's shift data - use Date object for proper MongoDB querying
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
      
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
        data: {
          employee: {
            id: String(employee._id),
            name: employee.name,
            pin: employee.pin,
            role: displayRole,
            location: locations[0] || "", // Include employee's assigned location
          },
          punches,
          geofenceWarning, // Include warning flag for soft mode violations
          isBirthday, // Include birthday flag (no DOB exposed)
          detectedLocation, // Include which location they're at
        }
      };
    } catch (err) {
      logger.error("[api/employee/login]", err);
      return {
        status: 500,
        data: { error: "Login failed" }
      };
    }
  }
});
