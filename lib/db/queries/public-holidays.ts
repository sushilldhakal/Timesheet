import { PublicHoliday } from "@/lib/db/schemas/public-holiday";

export class PublicHolidaysDbQueries {
  static async listLean(filter: Record<string, unknown>) {
    return PublicHoliday.find(filter).sort({ date: 1, state: 1 }).lean();
  }

  static async create(args: any) {
    return PublicHoliday.create(args);
  }

  static async findByIdLean(id: string) {
    return PublicHoliday.findById(id).lean();
  }

  static async findByIdAndUpdate(id: string, update: any) {
    return PublicHoliday.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  }

  static async deleteById(id: string) {
    return PublicHoliday.findByIdAndDelete(id);
  }

  static async bulkUpsert(ops: any[]) {
    return PublicHoliday.bulkWrite(ops, { ordered: false });
  }
}

