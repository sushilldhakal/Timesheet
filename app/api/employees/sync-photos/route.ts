import { connectDB, Employee, DailyShift } from "@/lib/db";
import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeSyncRequestSchema,
  employeeSyncResponseSchema
} from "@/lib/validations/employee-sync"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/sync-photos',
  summary: 'Sync all employee photos',
  description: 'Sync employee photos from their most recent punch records',
  tags: ['Employees'],
  security: 'adminAuth',
  responses: {
    200: employeeSyncResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    try {
      await connectDB();

      // Find employees without photos
      const employeesWithoutPhotos = await Employee.find({
        $or: [
          { img: { $exists: false } },
          { img: "" },
          { img: null }
        ]
      }).select("_id pin name").lean();

      if (employeesWithoutPhotos.length === 0) {
        return {
          status: 200,
          data: {
            success: true,
            message: "All employees already have photos",
            updated: 0
          }
        };
      }

      const pins = employeesWithoutPhotos.map(e => e.pin);
      let updatedCount = 0;

      // For each employee, find their most recent daily shift with an image
      for (const employee of employeesWithoutPhotos) {
        const recentShiftWithImage = await DailyShift.findOne({
          pin: employee.pin,
          $or: [
            { "clockIn.image": { $exists: true, $ne: "" } },
            { "clockOut.image": { $exists: true, $ne: "" } }
          ]
        })
          .sort({ date: -1 })
          .select("clockIn.image clockOut.image")
          .lean();

        if (recentShiftWithImage) {
          // Prefer clock-out image (more recent), fallback to clock-in
          const imageUrl = recentShiftWithImage.clockOut?.image || recentShiftWithImage.clockIn?.image;
          
          if (imageUrl) {
            await Employee.updateOne(
              { _id: employee._id },
              { $set: { img: imageUrl } }
            );
            updatedCount++;
          }
        }
      }

      return {
        status: 200,
        data: {
          success: true,
          message: `Successfully synced photos for ${updatedCount} employees`,
          total: employeesWithoutPhotos.length,
          updated: updatedCount,
          skipped: employeesWithoutPhotos.length - updatedCount
        }
      };

    } catch (error) {
      console.error("[api/employees/sync-photos] Error:", error);
      return {
        status: 500,
        data: { 
          success: false,
          message: "Failed to sync employee photos"
        }
      };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/sync-photos',
  summary: 'Sync specific employee photo',
  description: 'Sync photo for a specific employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    body: employeeSyncRequestSchema
  },
  responses: {
    200: employeeSyncResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      if (!body) {
        return { status: 400, data: { success: false, message: "Request body is required" } };
      }

      const { pin, employeeId } = body!;

      await connectDB();

      // Find the employee
      const query = pin ? { pin } : { _id: employeeId };
      const employee = await Employee.findOne(query).select("_id pin name img").lean();

      if (!employee) {
        return { status: 404, data: { success: false, message: "Employee not found" } };
      }

      // Find most recent daily shift with image
      const recentShiftWithImage = await DailyShift.findOne({
        pin: employee.pin,
        $or: [
          { "clockIn.image": { $exists: true, $ne: "" } },
          { "clockOut.image": { $exists: true, $ne: "" } }
        ]
      })
        .sort({ date: -1 })
        .select("clockIn.image clockOut.image date")
        .lean();

      if (!recentShiftWithImage) {
        return {
          status: 200,
          data: {
            success: false,
            message: "No clock records with images found for this employee",
            employee: {
              id: employee._id.toString(),
              name: employee.name,
              pin: employee.pin
            }
          }
        };
      }

      // Prefer clock-out image (more recent), fallback to clock-in
      const imageUrl = recentShiftWithImage.clockOut?.image || recentShiftWithImage.clockIn?.image;
      
      if (!imageUrl) {
        return {
          status: 200,
          data: {
            success: false,
            message: "No images found in recent clock records",
            employee: {
              id: employee._id.toString(),
              name: employee.name,
              pin: employee.pin
            }
          }
        };
      }

      // Update employee photo
      await Employee.updateOne(
        { _id: employee._id },
        { $set: { img: imageUrl } }
      );

      return {
        status: 200,
        data: {
          success: true,
          message: "Employee photo synced successfully",
          employee: {
            id: employee._id.toString(),
            name: employee.name,
            pin: employee.pin,
            previousPhoto: employee.img,
            newPhoto: imageUrl,
            photoDate: recentShiftWithImage.date
          }
        }
      };

    } catch (error) {
      console.error("[api/employees/sync-photos POST] Error:", error);
      return {
        status: 500,
        data: { 
          success: false,
          message: "Failed to sync employee photo"
        }
      };
    }
  }
});
