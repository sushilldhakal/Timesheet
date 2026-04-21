import { employeeLocationFilter, getFilteredEmployeeIdsByRole } from "@/lib/auth/auth-api";
import { EmployeeFiltersDbQueries } from "@/lib/db/queries/employees-filters";
import { EmployeeRoleAssignmentsDbQueries } from "@/lib/db/queries/employee-role-assignments";
import { connectDB } from "@/lib/db";

export class EmployeeFiltersService {
  async getFilters(ctx: any) {
    await connectDB();
    const andConditions: Record<string, unknown>[] = [];
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter);

    const roleFilteredEmployeeIds = await getFilteredEmployeeIdsByRole(ctx.userLocations, ctx.managedRoles);
    if (roleFilteredEmployeeIds !== null) {
      andConditions.push({ _id: { $in: roleFilteredEmployeeIds } });
    }

    const baseFilter: Record<string, unknown> = {};
    if (andConditions.length > 0) baseFilter.$and = andConditions;

    const employeeIds = await EmployeeFiltersDbQueries.listEmployeeIds(baseFilter);

    const roleAggregation = await EmployeeRoleAssignmentsDbQueries.aggregate([
      { $match: { employeeId: { $in: employeeIds }, isActive: true } },
      { $lookup: { from: "roles", localField: "roleId", foreignField: "_id", as: "role" } },
      { $unwind: "$role" },
      { $group: { _id: "$role.name", count: { $addToSet: "$employeeId" } } },
      { $project: { name: "$_id", count: { $size: "$count" } } },
      { $sort: { name: 1 } },
    ]);

    const employerAggregation = await EmployeeFiltersDbQueries.aggregateEmployers(baseFilter);

    const locationAggregation = await EmployeeRoleAssignmentsDbQueries.aggregate([
      { $match: { employeeId: { $in: employeeIds }, isActive: true } },
      { $lookup: { from: "locations", localField: "locationId", foreignField: "_id", as: "location" } },
      { $unwind: "$location" },
      { $group: { _id: "$location.name", count: { $addToSet: "$employeeId" } } },
      { $project: { name: "$_id", count: { $size: "$count" } } },
      { $sort: { name: 1 } },
    ]);

    return { teams: roleAggregation, employers: employerAggregation, locations: locationAggregation };
  }
}

export const employeeFiltersService = new EmployeeFiltersService();

