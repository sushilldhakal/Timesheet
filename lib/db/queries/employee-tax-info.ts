import mongoose from 'mongoose';
import { Employee } from '@/lib/db/schemas/employee';
import { EmployeeTaxInfo } from '@/lib/db/schemas/employee-tax-info';

export class EmployeeTaxInfoDbQueries {
  static async findEmployeeByIdLean(employeeId: string) {
    return Employee.findById(employeeId).lean();
  }

  static async findTaxInfoLean(opts: { employeeId: string; tenantId: string }) {
    return EmployeeTaxInfo.findOne({
      employeeId: opts.employeeId,
      tenantId: opts.tenantId,
    }).lean();
  }

  static async findTaxInfo(opts: { employeeId: string; tenantId: string }) {
    return EmployeeTaxInfo.findOne({
      employeeId: opts.employeeId,
      tenantId: opts.tenantId,
    });
  }

  static async pushAccessLog(taxInfoId: unknown, userId: string, action: 'VIEW_TAX' | 'EDIT_TAX') {
    return EmployeeTaxInfo.updateOne(
      { _id: taxInfoId },
      {
        $push: {
          accessLogs: {
            userId: new mongoose.Types.ObjectId(userId),
            action,
            timestamp: new Date(),
          },
        },
      }
    );
  }

  static async createTaxInfo(doc: any) {
    return EmployeeTaxInfo.create(doc);
  }

  static async updateTaxInfoById(taxInfoId: unknown, updates: Record<string, unknown>, userId: string) {
    return EmployeeTaxInfo.findOneAndUpdate(
      { _id: taxInfoId },
      {
        $set: updates,
        $push: {
          accessLogs: {
            userId: new mongoose.Types.ObjectId(userId),
            action: 'EDIT_TAX',
            timestamp: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    ).lean();
  }

  static async setEmployeeTaxInfoId(employeeId: string, taxInfoId: unknown) {
    return Employee.findByIdAndUpdate(employeeId, { taxInfoId });
  }
}

