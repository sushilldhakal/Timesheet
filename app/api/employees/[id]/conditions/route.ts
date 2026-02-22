import { NextRequest, NextResponse } from "next/server";
import { getEmployeeConditions } from "@/lib/utils/award-resolver";
import { connectDB } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const date = dateParam ? new Date(dateParam) : new Date();
    const { id } = await params;

    const conditions = await getEmployeeConditions(id, date);

    if (!conditions) {
      return NextResponse.json(
        { error: "No active award conditions found for this employee" },
        { status: 404 }
      );
    }

    return NextResponse.json(conditions);
  } catch (error: any) {
    console.error("Error fetching employee conditions:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee conditions", details: error.message },
      { status: 500 }
    );
  }
}
