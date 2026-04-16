import { connectDB } from "@/lib/db";
import { getEmployeeConditions } from "@/lib/utils/employees/award-resolver";

export class EmployeeConditionsService {
  async get(employeeId: string, date: Date) {
    await connectDB();
    const conditions = await getEmployeeConditions(employeeId, date);
    if (!conditions) return { status: 404, data: { error: "No active award conditions found for this employee" } };
    return { status: 200, data: conditions };
  }
}

export const employeeConditionsService = new EmployeeConditionsService();

