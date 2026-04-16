import mongoose from 'mongoose';
import { EmployeeRoleAssignment } from '@/lib/db/schemas/employee-role-assignment';
import { Employee } from '@/lib/db/schemas/employee';

export class EmployeeRolesDbQueries {
  static async employeeExists(employeeId: string) {
    return Employee.findById(employeeId);
  }

  static async findAssignmentForEmployee(args: { assignmentId: string; employeeId: string }) {
    return EmployeeRoleAssignment.findOne({
      _id: new mongoose.Types.ObjectId(args.assignmentId),
      employeeId: new mongoose.Types.ObjectId(args.employeeId),
    });
  }

  static async findAssignmentPopulatedLean(assignmentId: any) {
    return EmployeeRoleAssignment.findById(assignmentId)
      .populate('roleId', 'name color type')
      .populate('locationId', 'name type')
      .lean();
  }
}

