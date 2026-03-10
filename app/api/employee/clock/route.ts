import { connectDB, Employee, DailyShift, Category, Device } from "@/lib/db"
import { getEmployeeFromCookie } from "@/lib/auth/auth-helpers"
import { clockRequestSchema, clockResponseSchema } from "@/lib/validations/employee-clock"
import { errorResponseSchema } from "@/lib/validations/auth"
import { isWithinGeofence } from "@/lib/utils/validation/geofence"
import { logger } from "@/lib/utils/logger"
import { updateComputedFields } from "@/lib/utils/calculations/shift-calculations"
import { processFaceRecognition } from "@/lib/services/clock-with-face-recognition"
import { createApiRoute } from "@/lib/api/create-api-route"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import type { IClockEvent } from "@/lib/db/schemas/daily-shift"

/** POST /api/employee/clock - Clock in/out/break. Requires employee session. */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/clock',
  summary: 'Employee clock in/out',
  description: 'Record employee clock in, out, break start, or break end with location and photo validation',
  tags: ['Clock'],
  security: 'employeeAuth',
  request: {
    body: clockRequestSchema
  },
  responses: {
    200: clockResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, req }) => {
    const auth = await getEmployeeFromCookie();
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    try {
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      const { 
        type, 
        imageUrl: clientImageUrl, 
        date: clientDate, 
        time: clientTime, 
        lat, 
        lng,
        noPhoto,
        offline,
        offlineTimestamp,
        employeePin,
        faceDescriptor: faceDescriptorRaw,
        deviceId,
        deviceName,
      } = body;

      // Parse face descriptor if provided
      let faceDescriptor: number[] | undefined;
      if (faceDescriptorRaw) {
        try {
          faceDescriptor = JSON.parse(faceDescriptorRaw);
          console.log("[api/employee/clock] Face descriptor parsed:", faceDescriptor?.length || 0, "floats");
        } catch (err) {
          logger.error("[api/employee/clock] Failed to parse faceDescriptor:", err);
        }
      } else {
        console.log("[api/employee/clock] No faceDescriptor in request body");
      }

      await connectDB();
      
      // For offline sync, use the provided employeePin to find the original employee
      let employee;
      if (offline && employeePin) {
        employee = await Employee.findOne({ pin: employeePin }).lean();
        if (!employee) {
          return {
            status: 404,
            data: { error: "Employee not found for offline sync" }
          };
        }
        logger.log(`[api/employee/clock] Processing offline sync for employee ${employee.name} (PIN: ${employee.pin})`);
      } else {
        // Normal operation: use session cookie
        employee = await Employee.findById(auth.sub).lean();
        if (!employee) {
          return {
            status: 404,
            data: { error: "Employee not found" }
          };
        }
      }

      // Get employee's current role assignments for caching
      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment");
      const roleAssignments = await EmployeeRoleAssignment.find({
        employeeId: employee._id,
        isActive: true,
      })
        .populate("roleId", "name")
        .lean();
      
      const roles = roleAssignments.map((assignment: any) => assignment.roleId?.name).filter(Boolean);
      const displayRole = roles[0] || "";

      // Get device context from headers (set by middleware) - use header device if body device not provided
      const headerDeviceId = req.headers.get("x-device-id") || "";
      const finalDeviceId = deviceId || headerDeviceId;
      let deviceLocation = "";
      
      // Update device usage tracking
      if (finalDeviceId) {
        const device = await Device.findOne({ deviceId: finalDeviceId }).lean();
        if (device) {
          deviceLocation = device.locationName;
          
          // Update device activity and usage (fire and forget)
          Device.findByIdAndUpdate(device._id, {
            lastActivity: new Date(),
            lastUsedBy: employee._id,
            $inc: { totalPunches: 1 }
          }).catch(err => {
            logger.error("[api/employee/clock] Failed to update device activity:", err);
          });
        }
      }

      const imageUrl = (clientImageUrl && clientImageUrl.trim()) || "";
      const latStr = (lat && String(lat).trim()) || "";
      const lngStr = (lng && String(lng).trim()) || "";
      const where = latStr && lngStr ? `${latStr},${lngStr}` : "";
      
      // Flag logic: missing image, location, or explicitly marked as noPhoto
      let flag = !imageUrl || !latStr || !lngStr || (noPhoto === true);
      let detectedLocationName = "";
      let detectedLocationId = "";

      // Geofence check for all punch types — detect location and enforce on clock-in only
      const rawLocationNames = (employee.location ?? []) as string[];
      const locationNames = rawLocationNames.map((n) => String(n).trim()).filter(Boolean);
      
      if (locationNames.length > 0 && latStr && lngStr) {
        const userLat = parseFloat(latStr);
        const userLng = parseFloat(lngStr);
        
        if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
          const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const nameRegex = locationNames.length > 0
            ? new RegExp(`^(${locationNames.map(esc).join("|")})$`, "i")
            : /^$/;
          const locations = await Category.find({
            type: "location",
            name: { $regex: nameRegex },
            lat: { $exists: true, $ne: null, $gte: -90, $lte: 90 },
            lng: { $exists: true, $ne: null, $gte: -180, $lte: 180 },
          }).lean();

          // Check if user is within ANY assigned location and track which one
          let withinFence = false;
          for (const loc of locations) {
            if (
              loc.lat != null &&
              loc.lng != null &&
              isWithinGeofence(
                userLat,
                userLng,
                loc.lat,
                loc.lng,
                loc.radius ?? 100
              )
            ) {
              withinFence = true;
              detectedLocationName = loc.name;
              detectedLocationId = loc._id.toString();
              break;
            }
          }

          if (!withinFence && locations.length > 0) {
            // Only enforce geofence on clock-in
            if (type === "in") {
              const hasHardBlock = locations.some((loc) => loc.geofenceMode !== "soft");
              if (hasHardBlock) {
                return {
                  status: 403,
                  data: { error: "You are not at an approved location." }
                };
              }
            }
            
            // Find nearest location for display purposes
            let minDistance = Infinity;
            for (const loc of locations) {
              if (loc.lat != null && loc.lng != null) {
                const R = 6371e3; // Earth radius in meters
                const φ1 = (userLat * Math.PI) / 180;
                const φ2 = (loc.lat * Math.PI) / 180;
                const Δφ = ((loc.lat - userLat) * Math.PI) / 180;
                const Δλ = ((loc.lng - userLng) * Math.PI) / 180;
                const a =
                  Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;
                if (distance < minDistance) {
                  minDistance = distance;
                  detectedLocationName = loc.name;
                  detectedLocationId = loc._id.toString();
                }
              }
            }
            flag = true;
          }
        }
      } else if (type === "in" && locationNames.length > 0) {
        // Clock-in requires location if employee has assigned locations
        return {
          status: 400,
          data: { error: "Location is required for clock-in at an assigned location." }
        };
      }

      const now = new Date();
      const dateStr =
        clientDate && clientDate.trim()
          ? clientDate.trim()
          : format(now, "dd-MM-yyyy", { locale: enUS });
      
      // For offline punches, use the original offline timestamp if provided
      let timeStr: string;
      if (offline && offlineTimestamp) {
        timeStr = offlineTimestamp;
      } else if (clientTime && clientTime.trim()) {
        timeStr = clientTime.trim();
      } else {
        timeStr = now.toISOString();
      }

      // Convert dateStr to Date object for MongoDB storage
      // dateStr is in format "dd-MM-yyyy", convert to Date at start of day UTC
      const [day, month, year] = dateStr.split("-").map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

      // Build clock event object
      const clockEvent: IClockEvent = {
        time: new Date(timeStr),
        lat: latStr ? parseFloat(latStr) : undefined,
        lng: lngStr ? parseFloat(lngStr) : undefined,
        image: imageUrl,
        flag,
        deviceId: finalDeviceId,
        deviceLocation: deviceName,
      };

      // Log offline punch processing
      if (offline) {
        logger.log(`[api/employee/clock] Processing offline punch: ${type} for employee ${employee.pin} at ${timeStr}`);
      }

      // Handle different clock types using upsert pattern
      if (type === "in") {
        // Clock-in: Create or update daily shift
        await DailyShift.findOneAndUpdate(
          { pin: employee.pin, date: dateObj },
          {
            $setOnInsert: {
              pin: employee.pin,
              date: dateObj,
              source: "clock",
              status: "active",
            },
            $set: {
              clockIn: clockEvent,
            },
          },
          { upsert: true, new: true }
        );
      } else if (type === "out") {
        // Clock-out: Update existing shift and calculate hours
        const shift = await DailyShift.findOne({ pin: employee.pin, date: dateObj });
        
        if (!shift) {
          return {
            status: 400,
            data: { error: "No clock-in found for today. Please clock in first." }
          };
        }

        // Calculate computed fields
        const computed = updateComputedFields(shift.clockIn, clockEvent, shift.breakIn, shift.breakOut);

        await DailyShift.findOneAndUpdate(
          { pin: employee.pin, date: dateObj },
          {
            $set: {
              clockOut: clockEvent,
              status: "completed",
              totalBreakMinutes: computed.totalBreakMinutes,
              totalWorkingHours: computed.totalWorkingHours,
            },
          }
        );
      } else if (type === "break") {
        // Break start: Set breakIn field
        await DailyShift.findOneAndUpdate(
          { pin: employee.pin, date: dateObj },
          {
            $set: { breakIn: clockEvent },
          }
        );
      } else if (type === "endBreak") {
        // Break end: Set breakOut field and recalculate
        const shift = await DailyShift.findOne({ pin: employee.pin, date: dateObj });
        
        if (!shift || !shift.breakIn) {
          return {
            status: 400,
            data: { error: "No active break found." }
          };
        }

        // Calculate computed fields
        const computed = updateComputedFields(shift.clockIn, shift.clockOut, shift.breakIn, clockEvent);

        await DailyShift.findOneAndUpdate(
          { pin: employee.pin, date: dateObj },
          {
            $set: {
              breakOut: clockEvent,
              totalBreakMinutes: computed.totalBreakMinutes,
              totalWorkingHours: computed.totalWorkingHours,
            },
          }
        );
      }

      // Note: Session remains active for multiple clock operations
      // Session will expire naturally or can be manually logged out

      // Process face recognition (fire and forget - don't block response)
      if (faceDescriptor && imageUrl && detectedLocationId) {
        console.log("[api/employee/clock] Calling processFaceRecognition with:", {
          descriptorLength: faceDescriptor.length,
          hasImageUrl: !!imageUrl,
          locationId: detectedLocationId
        });
        processFaceRecognition({
          employeeId: employee._id.toString(),
          punchType: type,
          punchTime: new Date(timeStr),
          locationId: detectedLocationId,
          photoUrl: imageUrl,
          faceDescriptor,
          faceQuality: 0.8,
          deviceId: finalDeviceId,
          deviceName,
        }).catch(err => {
          logger.error("[api/employee/clock] Face recognition failed:", err);
        });
      } else {
        console.log("[api/employee/clock] Skipping face recognition:", {
          hasFaceDescriptor: !!faceDescriptor,
          hasImageUrl: !!imageUrl,
          hasLocationId: !!detectedLocationId
        });
      }

      return {
        status: 200,
        data: {
          success: true,
          type,
          date: dateStr,
          time: timeStr,
          lat: latStr,
          lng: lngStr,
          where,
          flag,
          offline: offline || false,
          detectedLocation: detectedLocationName,
          deviceLocation,
          syncedAt: offline ? new Date().toISOString() : undefined,
          // Include employee data for client-side caching
          employee: {
            id: employee._id.toString(),
            pin: employee.pin,
            name: employee.name,
            role: displayRole,
            location: Array.isArray(employee.location) ? employee.location.join(", ") : (employee.location || ""),
          },
        }
      };
    } catch (err) {
      logger.error("[api/employee/clock]", err);
      return {
        status: 500,
        data: { error: "Clock in/out failed" }
      };
    }
  }
});
