import { Employee, StaffFaceProfile } from "@/lib/db";

export class FaceProfilesDbQueries {
  static async employeeExists(employeeId: string) {
    return Employee.findById(employeeId);
  }

  static async findByEmployeeId(employeeId: string) {
    return StaffFaceProfile.findOne({ employeeId });
  }

  static async create(args: any) {
    return StaffFaceProfile.create(args);
  }

  static async list(args: { filter: Record<string, unknown> }) {
    return StaffFaceProfile.find(args.filter)
      .populate("employeeId", "name pin")
      .select("-descriptor")
      .sort({ enrolledAt: -1 });
  }

  static async findActiveByEmployeeIdNoDescriptor(employeeId: string) {
    return StaffFaceProfile.findOne({ employeeId, isActive: true }).select("-descriptor");
  }

  static async deleteByEmployeeId(employeeId: string) {
    return StaffFaceProfile.findOneAndDelete({ employeeId });
  }

  static async updateActive(employeeId: string, isActive: boolean) {
    return StaffFaceProfile.findOneAndUpdate({ employeeId }, { isActive }, { new: true });
  }
}

