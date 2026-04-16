import { connectDB } from "@/lib/db";
import { EmployeePinsDbQueries } from "@/lib/db/queries/employee-pins";

export class EmployeePinService {
  async checkAvailability(pin: string) {
    await connectDB();
    const existing = await EmployeePinsDbQueries.findByPinLean(pin.trim());
    return { status: 200, data: { available: !existing, pin: pin.trim() } };
  }
}

export const employeePinService = new EmployeePinService();

