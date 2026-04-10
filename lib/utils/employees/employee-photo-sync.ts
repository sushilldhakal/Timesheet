import { connectDB, Employee, DailyShift } from "@/lib/db";

/**
 * Sync employee photo from their most recent clock event
 * @param pin - Employee PIN
 * @returns The synced photo URL or null if no photo found
 */
export async function syncEmployeePhotoFromPunches(pin: string): Promise<string | null> {
  try {
    await connectDB();

    // Find most recent daily shift with clock-in or clock-out image
    const recentShiftWithImage = await DailyShift.findOne({
      pin,
      $or: [
        { "clockIn.image": { $exists: true, $ne: "" } },
        { "clockOut.image": { $exists: true, $ne: "" } }
      ]
    })
      .sort({ date: -1 })
      .select("clockIn.image clockOut.image")
      .lean();

    if (!recentShiftWithImage) {
      return null;
    }

    // Prefer clock-out image (more recent), fallback to clock-in
    const imageUrl = recentShiftWithImage.clockOut?.image || recentShiftWithImage.clockIn?.image;
    
    if (!imageUrl) {
      return null;
    }

    // Update employee photo
    await Employee.updateOne(
      { pin },
      { $set: { img: imageUrl } }
    );

    return imageUrl;
  } catch (error) {
    console.error(`[syncEmployeePhotoFromPunches] Error for PIN ${pin}:`, error);
    return null;
  }
}

/**
 * Sync photos for all employees without photos
 * @returns Count of updated employees
 */
export async function syncAllEmployeePhotos(): Promise<number> {
  try {
    await connectDB();

    // Find employees without photos
    const employeesWithoutPhotos = await Employee.find({
      $or: [
        { img: { $exists: false } },
        { img: "" },
        { img: null }
      ]
    }).select("pin").lean();

    let updatedCount = 0;

    for (const employee of employeesWithoutPhotos) {
      const synced = await syncEmployeePhotoFromPunches(employee.pin);
      if (synced) {
        updatedCount++;
      }
    }

    return updatedCount;
  } catch (error) {
    console.error("[syncAllEmployeePhotos] Error:", error);
    return 0;
  }
}
