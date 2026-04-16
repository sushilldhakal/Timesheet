import { BuddyPunchAlert } from "@/lib/db";

export class BuddyPunchAlertsDbQueries {
  static async list(args: { filter: Record<string, unknown>; skip: number; limit: number }) {
    return BuddyPunchAlert.find(args.filter)
      .populate("employeeId", "name pin")
      .populate("locationId", "name")
      .populate("reviewedBy", "name")
      .sort({ punchTime: -1 })
      .skip(args.skip)
      .limit(args.limit);
  }

  static async count(filter: Record<string, unknown>) {
    return BuddyPunchAlert.countDocuments(filter);
  }

  static async create(body: any) {
    return BuddyPunchAlert.create(body);
  }

  static async findByIdPopulated(id: string) {
    return BuddyPunchAlert.findById(id)
      .populate("employeeId", "name pin")
      .populate("locationId", "name")
      .populate("reviewedBy", "name");
  }

  static async updateByIdPopulated(id: string, update: any) {
    return BuddyPunchAlert.findByIdAndUpdate(id, update, { new: true })
      .populate("employeeId", "name pin")
      .populate("locationId", "name")
      .populate("reviewedBy", "name");
  }

  static async deleteById(id: string) {
    return BuddyPunchAlert.findByIdAndDelete(id);
  }
}

