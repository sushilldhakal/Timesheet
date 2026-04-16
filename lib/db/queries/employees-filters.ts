import { Employee } from "@/lib/db";

export class EmployeeFiltersDbQueries {
  static async listEmployeeIds(baseFilter: Record<string, unknown>) {
    return Employee.find(baseFilter).distinct("_id");
  }

  static async aggregateEmployers(baseFilter: Record<string, unknown>) {
    return Employee.aggregate([
      { $match: baseFilter },
      { $unwind: { path: "$employer", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$employer", count: { $addToSet: "$_id" } } },
      { $project: { name: "$_id", count: { $size: "$count" } } },
      { $sort: { name: 1 } },
    ]);
  }
}

