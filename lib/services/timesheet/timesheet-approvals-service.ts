import mongoose from "mongoose";
import { TimesheetApprovalsDbQueries } from "@/lib/db/queries/timesheet-approvals";
import { connectDB } from "@/lib/db";

export class TimesheetApprovalsService {
  async list(ctx: any, query: any) {
    await connectDB();
    const { tenantId, employeeId, status, payPeriodStart, payPeriodEnd, page, limit } = query || {};
    const filter: Record<string, unknown> = { tenantId: tenantId || ctx.tenantId };
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;
    if (payPeriodStart) filter.payPeriodStart = { $gte: new Date(payPeriodStart) };
    if (payPeriodEnd) filter.payPeriodEnd = { $lte: new Date(payPeriodEnd) };
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const skip = (pageNum - 1) * limitNum;

    const [timesheets, total] = await Promise.all([
      TimesheetApprovalsDbQueries.listApprovalsLean({ filter, skip, limit: limitNum }),
      TimesheetApprovalsDbQueries.countApprovals(filter),
    ]);

    return {
      timesheets,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async submit(ctx: any, id: string, body: any) {
    await connectDB();
    const timesheet = await TimesheetApprovalsDbQueries.findTimesheetById(id);
    if (!timesheet) return { status: 404, data: { error: "Timesheet not found" } };
    if (timesheet.status !== "draft") {
      return {
        status: 400,
        data: { error: `Cannot submit timesheet in '${timesheet.status}' status. Only draft timesheets can be submitted.` },
      };
    }
    if (!timesheet.shiftIds || timesheet.shiftIds.length === 0) {
      return { status: 400, data: { error: "Cannot submit timesheet with no linked shifts" } };
    }

    const invalidShifts = await TimesheetApprovalsDbQueries.countInvalidShiftsForSubmission(timesheet.shiftIds as any[]);
    if (invalidShifts > 0) {
      return {
        status: 400,
        data: {
          error: `${invalidShifts} shift(s) are not in approved/completed status. All shifts must be approved or completed before submission.`,
        },
      };
    }

    timesheet.status = "submitted";
    timesheet.submittedBy = ctx.auth.sub as any;
    timesheet.submittedAt = new Date();
    if (body?.submissionNotes) timesheet.submissionNotes = body.submissionNotes;
    await timesheet.save();

    return { status: 200, data: { success: true, timesheet } };
  }

  async approve(ctx: any, id: string, body: any) {
    await connectDB();
    const allowedRoles = ["admin", "super_admin", "manager", "supervisor"];
    if (!allowedRoles.includes(ctx.auth.role)) {
      return { status: 403, data: { error: "Only managers or admins can approve timesheets" } };
    }

    const timesheet = await TimesheetApprovalsDbQueries.findTimesheetById(id);
    if (!timesheet) return { status: 404, data: { error: "Timesheet not found" } };
    if (timesheet.status !== "submitted") {
      return {
        status: 400,
        data: { error: `Cannot approve timesheet in '${timesheet.status}' status. Only submitted timesheets can be approved.` },
      };
    }

    const now = new Date();
    const userId = ctx.auth.sub;
    timesheet.status = "approved";
    timesheet.approvedBy = userId as any;
    timesheet.approvedAt = now;
    if (body?.notes) timesheet.notes = body.notes;
    await timesheet.save();

    const lockResult = await TimesheetApprovalsDbQueries.lockShifts(timesheet.shiftIds as any[], userId, now);
    return { status: 200, data: { success: true, timesheet, lockedShifts: lockResult.modifiedCount } };
  }

  async reject(ctx: any, id: string, body: any) {
    await connectDB();
    const allowedRoles = ["admin", "super_admin", "manager", "supervisor"];
    if (!allowedRoles.includes(ctx.auth.role)) {
      return { status: 403, data: { error: "Only managers or admins can reject timesheets" } };
    }

    const timesheet = await TimesheetApprovalsDbQueries.findTimesheetById(id);
    if (!timesheet) return { status: 404, data: { error: "Timesheet not found" } };
    if (timesheet.status !== "submitted") {
      return {
        status: 400,
        data: { error: `Cannot reject timesheet in '${timesheet.status}' status. Only submitted timesheets can be rejected.` },
      };
    }

    const now = new Date();
    const userId = ctx.auth.sub;
    timesheet.status = "rejected";
    timesheet.rejectedBy = userId as any;
    timesheet.rejectedAt = now;
    timesheet.rejectionReason = body.rejectionReason;
    await timesheet.save();
    await TimesheetApprovalsDbQueries.unlockRejectedShifts(timesheet.shiftIds as any[]);

    return { status: 200, data: { success: true, timesheet } };
  }

  async lock(ctx: any, id: string, body: any) {
    await connectDB();
    const allowedRoles = ["admin", "super_admin", "accounts"];
    if (!allowedRoles.includes(ctx.auth.role)) {
      return { status: 403, data: { error: "Only payroll admins can lock timesheets" } };
    }

    const { payRunId } = body;
    if (!mongoose.Types.ObjectId.isValid(payRunId)) return { status: 400, data: { error: "Invalid payRunId" } };

    const payRun = await TimesheetApprovalsDbQueries.findPayRunById(payRunId);
    if (!payRun) return { status: 404, data: { error: "PayRun not found" } };

    const timesheet = await TimesheetApprovalsDbQueries.findTimesheetById(id);
    if (!timesheet) return { status: 404, data: { error: "Timesheet not found" } };
    if (timesheet.status !== "approved") {
      return {
        status: 400,
        data: { error: `Cannot lock timesheet in '${timesheet.status}' status. Only approved timesheets can be locked.` },
      };
    }

    const now = new Date();
    const userId = ctx.auth.sub;
    timesheet.status = "locked";
    timesheet.lockedBy = userId as any;
    timesheet.lockedAt = now;
    timesheet.payRunId = payRunId as any;
    await timesheet.save();

    const lockResult = await TimesheetApprovalsDbQueries.lockShifts(timesheet.shiftIds as any[], userId, now);
    return { status: 200, data: { success: true, timesheet, lockedShifts: lockResult.modifiedCount } };
  }
}

export const timesheetApprovalsService = new TimesheetApprovalsService();

