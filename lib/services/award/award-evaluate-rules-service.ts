import { evaluateAwardRules } from "@/lib/rules/evaluate-rules";

export class AwardEvaluateRulesService {
  async evaluate(body: any) {
    const {
      awardId,
      shiftDate,
      startTime,
      endTime,
      employmentType,
      awardTags,
      isPublicHoliday,
      dailyHoursWorked,
      weeklyHoursWorked,
      locationId,
    } = body || {};

    if (!awardId) return { status: 400, data: { error: "awardId is required" } };
    if (!startTime || !endTime) return { status: 400, data: { error: "startTime and endTime are required" } };

    const result = await evaluateAwardRules({
      awardId,
      shiftDate: new Date(shiftDate || startTime),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      employmentType: employmentType || "full_time",
      awardTags: awardTags || [],
      isPublicHoliday: isPublicHoliday ?? false,
      dailyHoursWorked: dailyHoursWorked ?? 0,
      weeklyHoursWorked: weeklyHoursWorked ?? 0,
      locationId,
    });

    if ((result as any)?.error) {
      const isNotFound = String((result as any).error).includes("not found");
      return { status: isNotFound ? 404 : 200, data: result };
    }

    return { status: 200, data: result };
  }
}

export const awardEvaluateRulesService = new AwardEvaluateRulesService();

