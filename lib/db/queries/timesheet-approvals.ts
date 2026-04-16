import { Timesheet } from "@/lib/db/schemas/timesheet";
import { DailyShift } from "@/lib/db/schemas/daily-shift";
import { PayRun } from "@/lib/db/schemas/pay-run";

export class TimesheetApprovalsDbQueries {
  static async listApprovalsLean(args: { filter: Record<string, unknown>; skip: number; limit: number }) {
    return Timesheet.find(args.filter)
      .populate("employeeId", "name pin email")
      .populate("submittedBy", "email")
      .populate("approvedBy", "email")
      .populate("rejectedBy", "email")
      .populate("lockedBy", "email")
      .sort({ createdAt: -1 })
      .skip(args.skip)
      .limit(args.limit)
      .lean();
  }

  static async countApprovals(filter: Record<string, unknown>) {
    return Timesheet.countDocuments(filter);
  }

  static async findTimesheetById(id: string) {
    return Timesheet.findById(id);
  }

  static async countInvalidShiftsForSubmission(shiftIds: any[]) {
    return DailyShift.countDocuments({
      _id: { $in: shiftIds },
      status: { $nin: ["approved", "completed"] },
    });
  }

  static async lockShifts(shiftIds: any[], userId: any, now: Date) {
    return DailyShift.updateMany(
      { _id: { $in: shiftIds } },
      { status: "locked", lockedBy: userId, lockedAt: now }
    );
  }

  static async unlockRejectedShifts(shiftIds: any[]) {
    return DailyShift.updateMany(
      { _id: { $in: shiftIds }, status: "locked" },
      { status: "approved", $unset: { lockedBy: 1, lockedAt: 1 } }
    );
  }

  static async findPayRunById(payRunId: string) {
    return PayRun.findById(payRunId);
  }
}

