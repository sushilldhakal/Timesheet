import { VarianceAnalyticsService } from '@/lib/services/analytics/variance-analytics-service';
import { isLikelyObjectIdString } from '@/shared/ids';
import { connectDB } from '@/lib/db';

export class AnalyticsService {
  async variance(shiftId: string) {
    await connectDB();
    if (!isLikelyObjectIdString(shiftId)) {
      return { status: 400, data: { error: 'Invalid shift ID format' } };
    }
    const analyticsService = new VarianceAnalyticsService();
    const result = await analyticsService.calculateVariance(shiftId);
    if (!result.success) {
      if (result.error === 'SHIFT_NOT_FOUND') return { status: 404, data: { error: result.error, message: result.message } };
      return { status: 500, data: { error: result.error, message: result.message } };
    }
    return {
      status: 200,
      data: { scheduledHours: result.scheduledHours, actualHours: result.actualHours, variance: result.variance, timesheetCount: result.timesheetCount },
    };
  }

  async punctuality(shiftId: string) {
    await connectDB();
    const analyticsService = new VarianceAnalyticsService();
    const result = await analyticsService.calculatePunctuality(shiftId);
    if (!result.success) {
      if (result.error === 'SHIFT_NOT_FOUND' || result.error === 'NO_TIMESHEET') return { status: 404, data: { error: result.error, message: result.message } };
      return { status: 500, data: { error: result.error, message: result.message } };
    }
    return { status: 200, data: { status: result.status, minutes: result.minutes } };
  }

  async noShows(weekId: string) {
    await connectDB();
    const analyticsService = new VarianceAnalyticsService();
    const result = await analyticsService.detectNoShows(weekId);
    if (!result.success) {
      if (result.error === 'ROSTER_NOT_FOUND') return { status: 404, data: { error: result.error, message: result.message } };
      return { status: 500, data: { error: result.error, message: result.message } };
    }
    return { status: 200, data: { noShows: result.noShows, count: result.noShows.length } };
  }

  async weeklyReport(weekId: string) {
    await connectDB();
    const analyticsService = new VarianceAnalyticsService();
    const result = await analyticsService.generateWeeklyReport(weekId);
    if (!result.success) {
      if (result.error === 'ROSTER_NOT_FOUND') return { status: 404, data: { error: result.error, message: result.message } };
      return { status: 500, data: { error: result.error, message: result.message } };
    }
    return { status: 200, data: { report: result.report } };
  }

  async employeeReport(employeeId: string, startDate: string, endDate: string) {
    await connectDB();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { status: 400, data: { error: 'Invalid date values' } };
    if (start > end) return { status: 400, data: { error: 'startDate must be before or equal to endDate' } };
    const analyticsService = new VarianceAnalyticsService();
    const result = await analyticsService.generateEmployeeReport(employeeId, startDate, endDate);
    if (!result.success) return { status: 500, data: { error: result.error, message: result.message } };
    return { status: 200, data: { report: result.report } };
  }
}

export const analyticsService = new AnalyticsService();

