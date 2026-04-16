import { connectDB } from "@/lib/db";
import { EmployeeSyncPhotosDbQueries } from "@/lib/db/queries/employee-sync-photos";

export class EmployeeSyncPhotosService {
  async syncAll() {
    await connectDB();
    const employeesWithoutPhotos = await EmployeeSyncPhotosDbQueries.listEmployeesWithoutPhotosLean();

    if (employeesWithoutPhotos.length === 0) {
      return { status: 200, data: { success: true, message: "All employees already have photos", updated: 0 } };
    }

    let updatedCount = 0;
    for (const employee of employeesWithoutPhotos as any[]) {
      const recentShiftWithImage = await EmployeeSyncPhotosDbQueries.findMostRecentShiftWithImageLean(employee.pin);

      if (recentShiftWithImage) {
        const imageUrl = (recentShiftWithImage as any).clockOut?.image || (recentShiftWithImage as any).clockIn?.image;
        if (imageUrl) {
          await EmployeeSyncPhotosDbQueries.updateEmployeePhotoById((employee as any)._id, imageUrl);
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
        skipped: employeesWithoutPhotos.length - updatedCount,
      },
    };
  }

  async syncOne(body: any) {
    await connectDB();
    if (!body) return { status: 400, data: { success: false, message: "Request body is required" } };
    const { pin, employeeId } = body;

    const query = pin ? { pin } : { _id: employeeId };
    const employee = await EmployeeSyncPhotosDbQueries.findEmployeeByPinOrIdLean(query);
    if (!employee) return { status: 404, data: { success: false, message: "Employee not found" } };

    const recentShiftWithImage = await EmployeeSyncPhotosDbQueries.findMostRecentShiftWithImageLean((employee as any).pin);

    if (!recentShiftWithImage) {
      return {
        status: 200,
        data: {
          success: false,
          message: "No clock records with images found for this employee",
          employee: { id: (employee as any)._id.toString(), name: (employee as any).name, pin: (employee as any).pin },
        },
      };
    }

    const imageUrl = (recentShiftWithImage as any).clockOut?.image || (recentShiftWithImage as any).clockIn?.image;
    if (!imageUrl) {
      return {
        status: 200,
        data: {
          success: false,
          message: "No images found in recent clock records",
          employee: { id: (employee as any)._id.toString(), name: (employee as any).name, pin: (employee as any).pin },
        },
      };
    }

    await EmployeeSyncPhotosDbQueries.updateEmployeePhotoById((employee as any)._id, imageUrl);
    return {
      status: 200,
      data: {
        success: true,
        message: "Employee photo synced successfully",
        employee: {
          id: (employee as any)._id.toString(),
          name: (employee as any).name,
          pin: (employee as any).pin,
          previousPhoto: (employee as any).img,
          newPhoto: imageUrl,
          photoDate: (recentShiftWithImage as any).date,
        },
      },
    };
  }
}

export const employeeSyncPhotosService = new EmployeeSyncPhotosService();

