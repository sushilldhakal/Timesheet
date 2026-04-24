import { PayRun } from '@/lib/db/schemas/pay-run';
import { PayItem } from '@/lib/db/schemas/pay-item';
import { Employee } from '@/lib/db/schemas/employee';
import { PayrollExport } from '@/lib/db/schemas/payroll-export';

export class PayRunsDbQueries {
  static async findOverlappingPayRun(args: { tenantId: string; startDate: Date; endDate: Date }) {
    const { tenantId, startDate, endDate } = args;
    return PayRun.findOne({
      tenantId,
      $or: [
        { startDate: { $lte: startDate }, endDate: { $gt: startDate } },
        { startDate: { $lt: endDate }, endDate: { $gte: endDate } },
        { startDate: { $gte: startDate }, endDate: { $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    });
  }

  static async createPayRun(args: any) {
    return PayRun.create(args);
  }

  static async listPayRunsLean(args: { filter: any; skip: number; limit: number }) {
    return PayRun.find(args.filter).sort({ createdAt: -1 }).skip(args.skip).limit(args.limit).lean();
  }

  static async countPayRuns(filter: any) {
    return PayRun.countDocuments(filter);
  }

  static async findPayRunByIdLean(id: string) {
    return PayRun.findById(id).lean();
  }

  static async findPayRunById(id: string) {
    return PayRun.findById(id);
  }

  static async approvePayRun(args: { id: string; approvedBy: string; approvedAt: Date }) {
    return PayRun.findByIdAndUpdate(
      args.id,
      { $set: { status: "approved", approvedBy: args.approvedBy, approvedAt: args.approvedAt } },
      { new: true }
    );
  }

  static async listPayItemsForPayRunLean(payRunId: any) {
    return PayItem.find({ payRunId }).sort({ employeeId: 1, from: 1 }).lean();
  }

  static async findEmployeeNameLean(employeeId: string) {
    return Employee.findById(employeeId).select('name').lean();
  }

  static async findEmployeesByIdsLean(employeeIds: string[]) {
    return Employee.find({ _id: { $in: employeeIds } }).select('name').lean();
  }

  static async listPayrollExportsForPayRunLean(payRunId: string) {
    return PayrollExport.find({ payRunId }).sort({ createdAt: -1 }).lean();
  }
}
