import { NextRequest, NextResponse } from "next/server";
import { Employee } from "@/lib/db/schemas/employee";
import Award from "@/lib/db/schemas/award";
import { connectDB } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const { id } = await params;

    // Find employee
    const employee = await Employee.findById(id).lean();
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    let payConditions = employee.payConditions || [];

    // Filter by date range if provided
    if (startDate || endDate) {
      payConditions = payConditions.filter((pc) => {
        const effectiveFrom = new Date(pc.effectiveFrom);
        const effectiveTo = pc.effectiveTo ? new Date(pc.effectiveTo) : null;

        if (startDate && effectiveTo && effectiveTo < new Date(startDate)) {
          return false;
        }
        if (endDate && effectiveFrom > new Date(endDate)) {
          return false;
        }
        return true;
      });
    }

    // Sort by effectiveFrom date (newest first)
    payConditions.sort((a, b) => {
      return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
    });

    // Populate award names
    const history = await Promise.all(
      payConditions.map(async (pc) => {
        const award = await Award.findById(pc.awardId).lean();
        return {
          ...pc,
          awardName: (award as any)?.name || "Unknown Award",
          isActive: pc.effectiveTo === null,
        };
      })
    );

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Error fetching award history:", error);
    return NextResponse.json(
      { error: "Failed to fetch award history", details: error.message },
      { status: 500 }
    );
  }
}
