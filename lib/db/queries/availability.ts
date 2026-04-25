import mongoose from 'mongoose';
import { AvailabilityConstraint } from '@/lib/db/schemas/availability-constraint';
import { EmployeeTeamAssignment } from '@/lib/db/schemas/employee-team-assignment';

export class AvailabilityDbQueries {
  static async listEmployeeConstraints(args: { employeeId: string; tenantId: string }) {
    const filter: any = {
      tenantId: new mongoose.Types.ObjectId(args.tenantId),
      employeeId: new mongoose.Types.ObjectId(args.employeeId),
    };
    return AvailabilityConstraint.find(filter);
  }

  static async createConstraint(args: any) {
    return AvailabilityConstraint.create(args);
  }

  static async updateConstraint(args: {
    constraintId: string;
    tenantId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    patch: Record<string, unknown>;
  }) {
    return AvailabilityConstraint.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(args.constraintId),
        tenantId: args.tenantId,
        employeeId: args.employeeId,
      },
      { $set: args.patch },
      { new: true, runValidators: true }
    );
  }

  static async deleteConstraintById(constraintId: string) {
    return AvailabilityConstraint.findByIdAndDelete(constraintId);
  }

  static async countActiveAssignments(args: { roleId: any; locationId: any; date: Date }) {
    return EmployeeTeamAssignment.countDocuments({
      teamId: args.roleId,
      locationId: args.locationId,
      validFrom: { $lte: args.date },
      $or: [{ validTo: null }, { validTo: { $gte: args.date } }],
    });
  }
}

