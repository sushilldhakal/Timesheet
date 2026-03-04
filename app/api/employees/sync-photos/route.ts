import { NextResponse } from "next/server";
import { connectDB, Employee, Timesheet } from "@/lib/db";

/**
 * Sync employee photos from their most recent punch records
 * GET /api/employees/sync-photos
 * 
 * This endpoint finds employees without photos and updates them with
 * the most recent photo from their timesheet punch records.
 */
export async function GET() {
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
      return NextResponse.json({
        success: true,
        message: "All employees already have photos",
        updated: 0
      });
    }

    const pins = employeesWithoutPhotos.map(e => e.pin);
    let updatedCount = 0;

    // For each employee, find their most recent punch with an image
    for (const employee of employeesWithoutPhotos) {
      const recentPunchWithImage = await Timesheet.findOne({
        pin: employee.pin,
        image: { $exists: true, $ne: "" }
      })
        .sort({ date: -1, time: -1 })
        .select("image")
        .lean();

      if (recentPunchWithImage?.image) {
        await Employee.updateOne(
          { _id: employee._id },
          { $set: { img: recentPunchWithImage.image } }
        );
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced photos for ${updatedCount} employees`,
      total: employeesWithoutPhotos.length,
      updated: updatedCount,
      skipped: employeesWithoutPhotos.length - updatedCount
    });

  } catch (error) {
    console.error("[api/employees/sync-photos] Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to sync employee photos",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * Sync photo for a specific employee
 * POST /api/employees/sync-photos
 * Body: { pin: string } or { employeeId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, employeeId } = body;

    if (!pin && !employeeId) {
      return NextResponse.json(
        { error: "Either pin or employeeId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the employee
    const query = pin ? { pin } : { _id: employeeId };
    const employee = await Employee.findOne(query).select("_id pin name img").lean();

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Find most recent punch with image
    const recentPunchWithImage = await Timesheet.findOne({
      pin: employee.pin,
      image: { $exists: true, $ne: "" }
    })
      .sort({ date: -1, time: -1 })
      .select("image date time")
      .lean();

    if (!recentPunchWithImage?.image) {
      return NextResponse.json({
        success: false,
        message: "No punch records with images found for this employee",
        employee: {
          id: employee._id,
          name: employee.name,
          pin: employee.pin
        }
      });
    }

    // Update employee photo
    await Employee.updateOne(
      { _id: employee._id },
      { $set: { img: recentPunchWithImage.image } }
    );

    return NextResponse.json({
      success: true,
      message: "Employee photo synced successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        pin: employee.pin,
        previousPhoto: employee.img,
        newPhoto: recentPunchWithImage.image,
        photoDate: recentPunchWithImage.date,
        photoTime: recentPunchWithImage.time
      }
    });

  } catch (error) {
    console.error("[api/employees/sync-photos POST] Error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to sync employee photo",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
