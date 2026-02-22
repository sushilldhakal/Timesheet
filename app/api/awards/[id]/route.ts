import { NextRequest, NextResponse } from "next/server";
import Award from "@/lib/db/schemas/award";
import { Employee } from "@/lib/db/schemas/employee";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const award = await Award.findById(id).lean();

    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json(award);
  } catch (error: any) {
    console.error("Error fetching award:", error);
    return NextResponse.json(
      { error: "Failed to fetch award", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { id } = await params;

    const award = await Award.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json(award);
  } catch (error: any) {
    console.error("Error updating award:", error);

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
      { error: "Failed to update award", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Check for employee assignments
    const assignedEmployees = await Employee.countDocuments({
      awardId: new mongoose.Types.ObjectId(id),
    });

    if (assignedEmployees > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete award",
          details: `This award is assigned to ${assignedEmployees} employee(s)`,
        },
        { status: 409 }
      );
    }

    const award = await Award.findByIdAndDelete(id);

    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Award deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting award:", error);
    return NextResponse.json(
      { error: "Failed to delete award", details: error.message },
      { status: 500 }
    );
  }
}
