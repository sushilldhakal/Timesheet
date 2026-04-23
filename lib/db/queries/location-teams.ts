import mongoose from 'mongoose';
import { EmployeeTeamAssignment } from '@/lib/db/schemas/employee-team-assignment';
import { LocationRoleEnablement } from '@/lib/db/schemas/location-role-enablement';

export class LocationTeamsDbQueries {
  static async countEmployeesForRoleAtLocation(args: { roleId: string; locationId: string; date: Date }) {
    return EmployeeTeamAssignment.countDocuments({
      teamId: new mongoose.Types.ObjectId(args.roleId),
      locationId: new mongoose.Types.ObjectId(args.locationId),
      validFrom: { $lte: args.date },
      $or: [{ validTo: null }, { validTo: { $gte: args.date } }],
    });
  }

  static async findActiveEnablement(args: { locationId: string; teamId: string; now: Date }) {
    return LocationRoleEnablement.findOne({
      locationId: new mongoose.Types.ObjectId(args.locationId),
      roleId: new mongoose.Types.ObjectId(args.teamId),
      effectiveFrom: { $lte: args.now },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: args.now } }],
    });
  }

  static async findEnablementByIdPopulated(id: string) {
    return LocationRoleEnablement.findById(id).populate('roleId', 'name color');
  }
}

