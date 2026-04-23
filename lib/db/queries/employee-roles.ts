import mongoose from 'mongoose';
import { EmployeeTeamAssignment } from '@/lib/db/schemas/employee-team-assignment';
import { Employee } from '@/lib/db/schemas/employee';

export class EmployeeRolesDbQueries {
  static async employeeExists(employeeId: string) {
    return Employee.findById(employeeId);
  }

  static async findAssignmentForEmployee(args: { assignmentId: string; employeeId: string }) {
    return EmployeeTeamAssignment.findOne({
      _id: new mongoose.Types.ObjectId(args.assignmentId),
      employeeId: new mongoose.Types.ObjectId(args.employeeId),
    });
  }

  static async findAssignmentPopulatedLean(assignmentId: any) {
    return EmployeeTeamAssignment.findById(assignmentId)
      .populate('teamId', 'name color type')
      .populate('locationId', 'name type')
      .lean();
  }
}

