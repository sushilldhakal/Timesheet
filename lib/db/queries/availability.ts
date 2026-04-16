import mongoose from 'mongoose';
import { AvailabilityConstraint } from '@/lib/db/schemas/availability-constraint';
import { EmployeeRoleAssignment } from '@/lib/db/schemas/employee-role-assignment';

export class AvailabilityDbQueries {
  static async listEmployeeConstraints(args: { employeeId: string; organizationId?: string }) {
    const filter: any = { employeeId: new mongoose.Types.ObjectId(args.employeeId) };
    if (args.organizationId) filter.organizationId = args.organizationId;
    return AvailabilityConstraint.find(filter);
  }

  static async createConstraint(args: any) {
    return AvailabilityConstraint.create(args);
  }

  static async deleteConstraintById(constraintId: string) {
    return AvailabilityConstraint.findByIdAndDelete(constraintId);
  }

  static async countActiveAssignments(args: { roleId: any; locationId: any; date: Date }) {
    return EmployeeRoleAssignment.countDocuments({
      roleId: args.roleId,
      locationId: args.locationId,
      validFrom: { $lte: args.date },
      $or: [{ validTo: null }, { validTo: { $gte: args.date } }],
    });
  }
}

