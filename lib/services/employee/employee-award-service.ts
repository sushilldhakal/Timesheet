import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/db/schemas/employee";
import Award from "@/lib/db/schemas/award";

export class EmployeeAwardService {
  async assignAward(employeeId: string, body: any) {
    const { awardId, awardLevel, employmentType, effectiveFrom, overridingRate } = body;
    await connectDB();

    const award = await Award.findById(awardId);
    if (!award) return { status: 404, data: { error: "Award not found" } };

    // Derive valid levels from levelRates
    const validLevels = [...new Set((award.levelRates || []).map((r: any) => r.level))];
    if (awardLevel && !validLevels.includes(awardLevel)) {
      return { status: 400, data: { error: `Award level "${awardLevel}" not found in award` } };
    }

    // Derive valid employment types for the chosen level from levelRates
    const validEmploymentTypes = (award.levelRates || [])
      .filter((r: any) => !awardLevel || r.level === awardLevel)
      .map((r: any) => r.employmentType);
    if (employmentType && !validEmploymentTypes.includes(employmentType)) {
      return { status: 400, data: { error: `Employment type "${employmentType}" not found for level "${awardLevel}"` } };
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return { status: 404, data: { error: "Employee not found" } };

    const payConditions = (employee as any).payConditions || [];
    if (payConditions.length > 0) {
      const lastCondition = payConditions[payConditions.length - 1];
      if (!lastCondition.effectiveTo) {
        const effectiveFromDate = new Date(effectiveFrom);
        const dayBefore = new Date(effectiveFromDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        lastCondition.effectiveTo = dayBefore;
      }
    }

    payConditions.push({
      awardId,
      awardLevel,
      employmentType,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: null,
      overridingRate: overridingRate || null,
    });

    const updateOps: any = {
      awardId,
      awardLevel,
      employmentType,
      payConditions,
    };

    const updatedEmployee = await Employee.findByIdAndUpdate(employeeId, updateOps, { new: true, runValidators: false });
    return { status: 200, data: updatedEmployee };
  }

  async getAwardHistory(input: { id: string; startDate?: string; endDate?: string; adminAuth: any; employeeAuth: any }) {
    const { id, startDate, endDate, adminAuth, employeeAuth } = input;
    const isSelfEmployee = employeeAuth?.sub === id;
    if (!adminAuth && !isSelfEmployee) return { status: 401, data: { error: "Unauthorized" } };

    await connectDB();
    const employee = await Employee.findById(id).lean();
    if (!employee) return { status: 404, data: { error: "Employee not found" } };

    let payConditions = (employee as any).payConditions || [];
    if (startDate || endDate) {
      payConditions = payConditions.filter((pc: any) => {
        const effectiveFrom = new Date(pc.effectiveFrom);
        const effectiveTo = pc.effectiveTo ? new Date(pc.effectiveTo) : null;
        if (startDate && effectiveTo && effectiveTo < new Date(startDate)) return false;
        if (endDate && effectiveFrom > new Date(endDate)) return false;
        return true;
      });
    }

    payConditions.sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

    const history = await Promise.all(
      payConditions.map(async (pc: any) => {
        const award = await Award.findById(pc.awardId).lean();
        return {
          ...pc,
          awardName: (award as any)?.name || "Unknown Award",
          isActive: pc.effectiveTo === null,
        };
      }),
    );

    return { status: 200, data: { history } };
  }
}

export const employeeAwardService = new EmployeeAwardService();

