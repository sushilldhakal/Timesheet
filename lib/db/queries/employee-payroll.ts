import { Employee } from '@/lib/db/schemas/employee';
import { EmployeeQualification } from '@/lib/db/schemas/employee-qualification';
import { EmployeeContract } from '@/lib/db/schemas/employee-contract';
import { EmployeeBankDetails } from '@/lib/db/schemas/employee-bank-details';
import { EmployeeCompliance } from '@/lib/db/schemas/employee-compliance';

export class EmployeePayrollDbQueries {
  static async findEmployeeByIdLean(id: string) {
    return Employee.findById(id).lean();
  }

  // Qualifications
  static async listQualificationsLean(employeeId: string) {
    return EmployeeQualification.find({ employeeId }).sort({ issueDate: -1 }).lean();
  }
  static async createQualification(args: any) {
    return EmployeeQualification.create(args);
  }
  static async updateQualificationLean(args: { qualificationId: string; employeeId: string; updates: any }) {
    return EmployeeQualification.findOneAndUpdate(
      { _id: args.qualificationId, employeeId: args.employeeId },
      { $set: args.updates },
      { new: true, runValidators: true }
    ).lean();
  }
  static async deleteQualification(args: { qualificationId: string; employeeId: string }) {
    return EmployeeQualification.findOneAndDelete({ _id: args.qualificationId, employeeId: args.employeeId });
  }

  // Contracts
  static async listContractsLean(employeeId: string) {
    return EmployeeContract.find({ employeeId }).sort({ startDate: -1 }).lean();
  }
  static async deactivateActiveContracts(employeeId: string) {
    return EmployeeContract.updateMany({ employeeId, isActive: true }, { $set: { isActive: false } });
  }
  static async createContract(args: any) {
    return EmployeeContract.create(args);
  }
  static async updateActiveContractLean(args: { employeeId: string; updates: any }) {
    return EmployeeContract.findOneAndUpdate({ employeeId: args.employeeId, isActive: true }, { $set: args.updates }, { new: true, runValidators: true }).lean();
  }
  static async updateEmployeeById(id: string, update: any) {
    return Employee.findByIdAndUpdate(id, update);
  }

  // Bank details
  static async findBankDetailsLean(employeeId: string) {
    return EmployeeBankDetails.findOne({ employeeId }).lean();
  }
  static async findBankDetails(employeeId: string) {
    return EmployeeBankDetails.findOne({ employeeId });
  }
  static async createBankDetails(args: any) {
    return EmployeeBankDetails.create(args);
  }
  static async updateBankDetailsLean(args: { employeeId: string; updates: any }) {
    return EmployeeBankDetails.findOneAndUpdate({ employeeId: args.employeeId }, { $set: args.updates }, { new: true, runValidators: true }).lean();
  }

  // Compliance
  static async findComplianceLean(employeeId: string) {
    return EmployeeCompliance.findOne({ employeeId }).lean();
  }
  static async createCompliance(args: any) {
    return EmployeeCompliance.create(args);
  }
  static async upsertComplianceLean(args: { employeeId: string; updates: any }) {
    return EmployeeCompliance.findOneAndUpdate(
      { employeeId: args.employeeId },
      { $set: args.updates },
      { new: true, runValidators: true, upsert: true }
    ).lean();
  }
}

