import { evaluateAwardRules } from "@/lib/rules/evaluate-rules";
import { checkPublicHoliday } from "@/lib/utils/public-holidays";

export class AwardEvaluateRulesService {
  async evaluate(body: any) {
    const {
      awardId,
      shiftDate,
      startTime,
      endTime,
      startWallClock,
      endWallClock,
      employmentType,
      awardTags,
      isPublicHoliday: isPublicHolidayFromRequest,
      dailyHoursWorked,
      weeklyHoursWorked,
      locationId,
    } = body || {};

    if (!awardId) return { status: 400, data: { error: "awardId is required" } };
    if (!startTime || !endTime) return { status: 400, data: { error: "startTime and endTime are required" } };

    // Resolve the shift date: prefer explicit shiftDate (noon-anchored), fall back to startTime.
    // Parse from the ISO string so we always get the intended calendar date regardless of
    // server timezone — the client sends shiftDate as YYYY-MM-DDT12:00:00 local time.
    const shiftDateIso = shiftDate || startTime
    const [sy, sm, sd] = shiftDateIso.slice(0, 10).split('-').map(Number)
    const resolvedShiftDate = new Date(Date.UTC(sy, sm - 1, sd, 12, 0, 0))

    // Auto-detect public holiday from the DB unless the caller explicitly passed true.
    // Explicit true always wins (supports manual override in the UI checkbox).
    // Explicit false or omitted → look up the real date.
    let isPublicHoliday: boolean;
    if (isPublicHolidayFromRequest === true) {
      isPublicHoliday = true;
    } else {
      isPublicHoliday = await checkPublicHoliday(resolvedShiftDate);
    }

    const result = await evaluateAwardRules({
      awardId,
      shiftDate: resolvedShiftDate,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      startWallClock,
      endWallClock,
      employmentType: employmentType || "full_time",
      awardTags: awardTags || [],
      isPublicHoliday,
      dailyHoursWorked: dailyHoursWorked ?? 0,
      weeklyHoursWorked: weeklyHoursWorked ?? 0,
      locationId,
    });

    if ((result as any)?.error) {
      const isNotFound = String((result as any).error).includes("not found");
      return { status: isNotFound ? 404 : 200, data: result };
    }

    return { status: 200, data: { ...result, isPublicHoliday } };
  }
}

export const awardEvaluateRulesService = new AwardEvaluateRulesService();

