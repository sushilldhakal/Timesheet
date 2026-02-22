import { NextRequest, NextResponse } from "next/server";
import Award from "@/lib/db/schemas/award";
import { connectDB } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    // Build query
    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Get total count
    const total = await Award.countDocuments(query);

    // Get paginated awards
    const awards = await Award.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      awards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching awards:", error);
    return NextResponse.json(
      { error: "Failed to fetch awards", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Create new award
    const award = new Award(body);
    await award.save();

    return NextResponse.json(award, { status: 201 });
  } catch (error: any) {
    console.error("Error creating award:", error);

    // Handle duplicate name error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Award name must be unique" },
        { status: 409 }
      );
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create award", details: error.message },
      { status: 500 }
    );
  }
}
