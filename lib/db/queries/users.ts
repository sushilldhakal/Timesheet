import { User } from '@/lib/db/schemas/user';
import { Employee } from '@/lib/db/schemas/employee';
import { mongoose } from '@/lib/db';

export class UsersDbQueries {
  static tenantObjectId(tenantId: string) {
    return new mongoose.Types.ObjectId(tenantId);
  }

  static async findUserByIdLean(id: string, select?: any) {
    return User.findById(id).select(select ?? '').lean();
  }

  static async findUserById(id: string, select?: any) {
    return User.findById(id).select(select ?? '');
  }

  static async listUsersLean(query: any) {
    return User.find(query).select('-password').sort({ createdAt: -1 }).lean();
  }

  static async findByTenantEmailLean(args: { tenantId: any; email: string; idNe?: string }) {
    return User.findOne({
      tenantId: args.tenantId,
      email: args.email.toLowerCase(),
      ...(args.idNe ? { _id: { $ne: args.idNe } } : {}),
    }).lean();
  }

  static async createUser(args: any) {
    return User.create(args);
  }

  static async deleteUserById(id: string) {
    return User.findByIdAndDelete(id);
  }

  static async findEmployeeByIdWithPassword(employeeId: string) {
    return Employee.findById(employeeId).select('+password');
  }
}

