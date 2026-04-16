import { connectDB } from "@/lib/db";
import { AbsenceManager } from "@/lib/managers/absence-manager";
import { LeaveType } from "@/lib/db/schemas/leave-record";

export class EmployeeAbsencesService {
  private absenceManager = new AbsenceManager();

  async list(employeeId: string, startDate: string, endDate: string) {
    await connectDB();
    const absences = await this.absenceManager.getLeaveRecords(employeeId, new Date(startDate), new Date(endDate));
    return { status: 200, data: { absences } };
  }

  async create(employeeId: string, body: any) {
    await connectDB();
    const leaveRecord = await this.absenceManager.createLeaveRecord(
      employeeId,
      new Date(body.startDate),
      new Date(body.endDate),
      body.leaveType as LeaveType,
      body.notes,
    );
    return { status: 201, data: { leaveRecord } };
  }
}

export const employeeAbsencesService = new EmployeeAbsencesService();

