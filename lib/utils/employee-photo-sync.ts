import { connectDB, Employee, Timesheet } from "@/lib/db";

/**
 * Sync employee photo from their most recent punch record
 * @param pin - Employee PIN
 * @returns The synced photo URL or null if no photo found
 */
export async function syncEmployeePhotoFromPunches(pin: string): Promise<string | null> {
  try {
    await connectDB();

    // Find most recent punch with image
    const recentPunchWithImage = await Timesheet.findOne({
      pin,
      image: { $exists: true, $ne: "" }
    })
      .sort({ date: -1, time: -1 })
      .select("image")
      .lean();

    if (!recentPunchWithImage?.image) {
      return null;
    }

    // Update employee photo
    await Employee.updateOne(
      { pin },
      { $set: { img: recentPunchWithImage.image } }
    );

    return recentPunchWithImage.image;
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
