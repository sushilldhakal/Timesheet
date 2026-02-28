import { NextRequest, NextResponse } from "next/server";
import { getAuthWithUserLocations } from "@/lib/auth-api";
import { connectDB } from "@/lib/db";
import { Roster, calculateWeekId, getWeekBoundaries } from "@/lib/db/schemas/roster";
import { parseISO, isValid } from "date-fns";
import type { IEvent } from "@/components/calendar/interfaces";
import mongoose from "mongoose";

/**
 * GET /api/calendar/events
 * Fetch filtered calendar events based on date range and optional user filter
 * 
 * Query Parameters:
 * - startDate: ISO 8601 date string (required)
 * - endDate: ISO 8601 date string (required)
 * - userId: Employee ID or "all" (optional, defaults to "all")
 */
export async function GET(request: NextRequest) {
  const ctx = await getAuthWithUserLocations();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const userIdParam = searchParams.get("userId") || "all";
    const locationIdParam = searchParams.get("locationId") || "all";

    // Validate required parameters
    if (!startDateParam) {
      return NextResponse.json(
        { error: "startDate is required" },
        { status: 400 }
      );
    }

    if (!endDateParam) {
      return NextResponse.json(
        { error: "endDate is required" },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const startDate = parseISO(startDateParam);
    if (!isValid(startDate)) {
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }

    const endDate = parseISO(endDateParam);
    if (!isValid(endDate)) {
      return NextResponse.json(
        { error: "Invalid endDate format" },
        { status: 400 }
      );
    }

    // Validate date range
    if (startDate > endDate) {
      return NextResponse.json(
        { error: "startDate must be before or equal to endDate" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Query rosters that overlap with the date range
    // A roster overlaps if: roster.weekStartDate <= endDate AND roster.weekEndDate >= startDate
    const rosters = await Roster.find({
      weekStartDate: { $lte: endDate },
      weekEndDate: { $gte: startDate },
    })
      .populate("shifts.employeeId", "name picturePath")
      .populate("shifts.roleId", "name")
      .populate("shifts.locationId", "name");

    // Transform roster shifts to calendar events
    const events: IEvent[] = [];
    let eventId = 1;

    for (const roster of rosters) {
      for (const shift of roster.shifts) {
        // Filter by date range - shift must overlap with requested range
        const shiftStart = new Date(shift.startTime);
        const shiftEnd = new Date(shift.endTime);

        if (shiftStart <= endDate && shiftEnd >= startDate) {
          // Filter by user if specified
          const employeeId = (shift.employeeId as any)?._id?.toString() || "vacant";
          const employeeName = (shift.employeeId as any)?.name || "Vacant";
          const employeePicture = (shift.employeeId as any)?.picturePath || null;
          const roleName = (shift.roleId as any)?.name || "Unknown Role";
          const locationId = (shift.locationId as any)?._id?.toString() || "";
          const locationName = (shift.locationId as any)?.name || "Unknown Location";
          
          // Filter by user and location
          const matchesUser = userIdParam === "all" || userIdParam === employeeId;
          const matchesLocation = locationIdParam === "all" || locationIdParam === locationId;
          
          if (matchesUser && matchesLocation) {
            // Determine color based on role (you can customize this logic)
            const colors: Array<"blue" | "green" | "red" | "yellow" | "purple" | "orange"> = [
              "blue",
              "green",
              "red",
              "yellow",
              "purple",
              "orange",
            ];
            const colorIndex = eventId % colors.length;

            const event: IEvent = {
              id: eventId++,
              startDate: shiftStart.toISOString(),
              endDate: shiftEnd.toISOString(),
              title: `${roleName} - ${locationName}`,
              color: colors[colorIndex],
              description: shift.notes || "",
              user: {
                id: employeeId,
                name: employeeName,
                picturePath: employeePicture,
              },
            };

            // Add roleId and locationId for filtering (cast to any to add extra properties)
            (event as any).roleId = (shift.roleId as any)?._id?.toString() || "";
            (event as any).locationId = locationId;

            events.push(event);
          }
        }
      }
    }

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/calendar/events GET]", error);
    return NextResponse.json(
      {
        error: "Failed to fetch events",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * Create a new shift in the roster
 */
export async function POST(request: NextRequest) {
  const ctx = await getAuthWithUserLocations();
  if (!ctx) {
    console.error('POST /api/calendar/events - Unauthorized');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log('POST /api/calendar/events - Received body:', body);
    
    const {
      employeeId,
      roleId,
      locationId,
      employerId,
      startDate,
      startTime,
      endDate,
      endTime,
      breakMinutes,
      notes,
    } = body;

    // Validate required fields
    if (!roleId || !locationId || !employerId || !startDate || !startTime || !endDate || !endTime) {
      console.error('Missing required fields:', {
        roleId: !!roleId,
        locationId: !!locationId,
        employerId: !!employerId,
        startDate: !!startDate,
        startTime: !!startTime,
        endDate: !!endDate,
        endTime: !!endTime,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse dates
    const shiftDate = parseISO(startDate);
    if (!isValid(shiftDate)) {
      console.error('Invalid startDate:', startDate);
      return NextResponse.json(
        { error: "Invalid startDate format" },
        { status: 400 }
      );
    }

    // Create start and end datetime
    const shiftStart = new Date(shiftDate);
    shiftStart.setHours(startTime.hour, startTime.minute, 0, 0);

    const shiftEndDate = parseISO(endDate);
    const shiftEnd = new Date(shiftEndDate);
    shiftEnd.setHours(endTime.hour, endTime.minute, 0, 0);

    console.log('Shift times:', {
      shiftStart: shiftStart.toISOString(),
      shiftEnd: shiftEnd.toISOString(),
    });

    // Validate times
    if (shiftStart >= shiftEnd) {
      console.error('Invalid time range:', { shiftStart, shiftEnd });
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Calculate week ID for the shift
    const weekId = calculateWeekId(shiftDate);
    const { start: weekStartDate, end: weekEndDate } = getWeekBoundaries(weekId);
    const [year, weekStr] = weekId.split("-W");
    const weekNumber = parseInt(weekStr, 10);

    console.log('Week info:', { weekId, weekStartDate, weekEndDate, year, weekNumber });

    // Find or create roster for this week
    let roster = await Roster.findOne({ weekId });

    if (!roster) {
      console.log('Creating new roster for week:', weekId);
      roster = new Roster({
        weekId,
        year: parseInt(year, 10),
        weekNumber,
        weekStartDate,
        weekEndDate,
        shifts: [],
        status: "draft",
      });
    } else {
      console.log('Found existing roster:', roster._id);
    }

    // Create new shift
    const newShift = {
      _id: new mongoose.Types.ObjectId(),
      employeeId: employeeId && employeeId !== "vacant" ? new mongoose.Types.ObjectId(employeeId) : null,
      date: shiftDate,
      startTime: shiftStart,
      endTime: shiftEnd,
      locationId: new mongoose.Types.ObjectId(locationId),
      roleId: new mongoose.Types.ObjectId(roleId),
      sourceScheduleId: null,
      estimatedCost: 0, // TODO: Calculate based on employee award
      notes: notes || "",
    };

    console.log('New shift:', newShift);

    // Add shift to roster
    roster.shifts.push(newShift as any);

    // Save roster
    console.log('Saving roster...');
    await roster.save();
    console.log('Roster saved successfully');

    return NextResponse.json(
      { 
        message: "Shift created successfully",
        shift: newShift,
        weekId,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/calendar/events POST] Error:", error);
    console.error("[api/calendar/events POST] Stack:", error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: "Failed to create shift",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
