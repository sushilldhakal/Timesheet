import { NextRequest, NextResponse } from "next/server";
import { Employee } from "@/lib/db/schemas/employee";
import Award from "@/lib/db/schemas/award";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const body = await request.json();
    const { awardId, awardLevel, employmentType, effectiveFrom, overridingRate } = body;
    const { id } = await params;

    // Validate required fields
    if (!awardId || !awardLevel || !employmentType || !effectiveFrom) {
      return NextResponse.json(
        { error: "Missing required fields: awardId, awardLevel, employmentType, effectiveFrom" },
        { status: 400 }
      );
    }

    // Validate award exists
    const award = await Award.findById(awardId);
    if (!award) {
      return NextResponse.json({ error: "Award not found" }, { status: 404 });
    }

    // Validate awardLevel exists in award
    const level = award.levels.find((l: any) => l.label === awardLevel);
    if (!level) {
      return NextResponse.json(
        { error: `Award level "${awardLevel}" not found in award` },
        { status: 400 }
      );
    }

    // Validate employmentType exists in level
    const conditionSet = level.conditions.find(
      (c: any) => c.employmentType === employmentType
    );
    if (!conditionSet) {
      return NextResponse.json(
        { error: `Employment type "${employmentType}" not found in level "${awardLevel}"` },
        { status: 400 }
      );
    }

    // Find employee
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Prepare update operations
    const updateOps: any = {
      awardId: new mongoose.Types.ObjectId(awardId),
      awardLevel,
      employmentType,
    };

    // Get current pay conditions
    const payConditions = employee.payConditions || [];

    // Set effectiveTo on previous assignment (if exists)
    if (payConditions.length > 0) {
      const lastCondition = payConditions[payConditions.length - 1];
      if (!lastCondition.effectiveTo) {
        const effectiveFromDate = new Date(effectiveFrom);
        const dayBefore = new Date(effectiveFromDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        lastCondition.effectiveTo = dayBefore;
      }
    }

    // Add new pay condition
    const newCondition = {
      awardId: new mongoose.Types.ObjectId(awardId),
      awardLevel,
      employmentType,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: null,
      overridingRate: overridingRate || null,
    };

    payConditions.push(newCondition);
    updateOps.payConditions = payConditions;

    // Update employee using findByIdAndUpdate to avoid validation issues
    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      updateOps,
      { new: true, runValidators: false }
    );

    return NextResponse.json(updatedEmployee);
  } catch (error: any) {
    console.error("Error assigning award to employee:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to assign award", details: error.message },
      { status: 500 }
    );
  }
}
