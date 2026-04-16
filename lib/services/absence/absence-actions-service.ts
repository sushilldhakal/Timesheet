import { AbsenceManager } from "@/lib/managers/absence-manager";
import { connectDB } from "@/lib/db";

export class AbsenceActionsService {
  async approve(id: string, approverId: string) {
    await connectDB();
    const mgr = new AbsenceManager();
    const leaveRecord = await mgr.approveLeaveRecord(id, approverId);
    const affectedShifts = await mgr.identifyReplacementNeeds(id);
    return {
      leaveRecord,
      affectedShifts: affectedShifts.map((shift: any) => ({
        shiftId: shift._id.toString(),
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })),
    };
  }

  async deny(id: string, denierId: string, reason: string) {
    await connectDB();
    const mgr = new AbsenceManager();
    const leaveRecord = await mgr.denyLeaveRecord(id, denierId, reason);
    return { leaveRecord };
  }

  async affectedShifts(id: string) {
    await connectDB();
    const mgr = new AbsenceManager();
    const affectedShifts = await mgr.identifyReplacementNeeds(id);
    return {
      affectedShifts: affectedShifts.map((shift: any) => ({
        shiftId: shift._id.toString(),
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        locationId: shift.locationId.toString(),
        roleId: shift.roleId.toString(),
      })),
    };
  }

  mapError(err: any, fallback: string) {
    const message = typeof err?.message === "string" ? err.message : "";
    if (message.includes("not found")) return { status: 404, data: { error: message } };
    if (message.includes("PENDING")) return { status: 400, data: { error: message } };
    return { status: 500, data: { error: fallback } };
  }
}

export const absenceActionsService = new AbsenceActionsService();

