import { connectDB } from "@/lib/db";
import { EmployeePinsDbQueries } from "@/lib/db/queries/employee-pins";

export class EmployeePinGenerationService {
  async generateUniquePin() {
    await connectDB();
    const existing = await EmployeePinsDbQueries.listPinsLean();
    const usedPins = new Set((existing || []).map((e: any) => String(e.pin ?? "")));

    let pin = "";
    let attempts = 0;
    const maxAttempts = 100;
    do {
      pin = String(Math.floor(1000 + Math.random() * 9000));
      attempts++;
      if (attempts >= maxAttempts) {
        return { status: 500, data: { error: "Could not generate unique PIN. Try again." } };
      }
    } while (usedPins.has(pin));

    return { status: 200, data: { pin } };
  }
}

export const employeePinGenerationService = new EmployeePinGenerationService();

