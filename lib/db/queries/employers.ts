import { Employer } from "@/lib/db";
import mongoose from "mongoose";

export class EmployerDbQueries {
  static async listEmployers(filter: Record<string, unknown>) {
    return await Employer.find(filter).sort({ name: 1 }).lean();
  }

  static async findByIdLean(id: string) {
    return await Employer.findById(id).lean();
  }

  static async findById(id: string) {
    return await Employer.findById(id);
  }

  static async findByNameCaseInsensitive(name: string, excludeId?: string) {
    const trimmed = name.trim();
    const filter: any = { name: { $regex: new RegExp(`^${trimmed}$`, "i") } };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: excludeId };
    }
    return await Employer.findOne(filter).lean();
  }

  static async createEmployer(payload: any) {
    return await Employer.create(payload);
  }

  static async deleteById(id: string) {
    return await Employer.findByIdAndDelete(id);
  }
}

