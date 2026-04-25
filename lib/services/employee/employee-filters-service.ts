import { employeeLocationFilter, getFilteredEmployeeIdsByRole } from "@/lib/auth/auth-api";
import { EmployeeFiltersDbQueries } from "@/lib/db/queries/employees-filters";
import { EmployeeTeamAssignmentsDbQueries } from "@/lib/db/queries/employee-team-assignments";
import { EmployeeDbQueries } from "@/lib/db/queries/employees";
import { connectDB } from "@/lib/db";
import { isLikelyObjectIdString } from "@/shared/ids";

export class EmployeeFiltersService {
  async getFilters(
    ctx: any,
    args?: { locationId?: string; locationName?: string }
  ) {
    await connectDB();
    const andConditions: Record<string, unknown>[] = [];
    const locFilter = employeeLocationFilter(ctx.userLocations);
    if (Object.keys(locFilter).length > 0) andConditions.push(locFilter);

    const roleFilteredEmployeeIds = await getFilteredEmployeeIdsByRole(
      { tenantId: ctx.tenantId },
      ctx.userLocations,
      ctx.managedRoles
    );
    if (roleFilteredEmployeeIds !== null) {
      andConditions.push({ _id: { $in: roleFilteredEmployeeIds } });
    }

    const baseFilter: Record<string, unknown> = {};
    if (andConditions.length > 0) baseFilter.$and = andConditions;

    const employeeIds = await EmployeeFiltersDbQueries.listEmployeeIds(baseFilter);

    // Build location filter for aggregations if location is specified
    const aggregationMatch: Record<string, unknown> = { 
      employeeId: { $in: employeeIds }, 
      isActive: true 
    };

    // Prefer locationId (stable across orgs). locationName is deprecated.
    let locationIds: string[] = [];
    let normalizedLocation: string | null = null;
    if (args?.locationId) {
      const locIds = String(args.locationId)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((id) => isLikelyObjectIdString(id));

      if (locIds.length > 0) {
        locationIds = locIds;
        aggregationMatch.locationId = { $in: locationIds };
      }
    } else if (args?.locationName) {
      // Be tolerant of callers passing non-decoded query strings (e.g. "Bendigo+Store")
      // or values with leading/trailing whitespace.
      normalizedLocation = decodeURIComponent(String(args.locationName))
        .replace(/\+/g, " ")
        .trim();
      const locations = normalizedLocation ? await EmployeeDbQueries.findLocationsByNames([normalizedLocation]) : [];
      if (locations.length > 0) {
        locationIds = locations.map((loc) => String((loc as { _id: unknown })._id));
        aggregationMatch.locationId = { $in: locationIds };
      } else {
        // If we can't resolve the location name, we intentionally fall back
        // to matching by location name in aggregation ($lookup -> match).
      }
    }

    // Aggregate teams - count unique employees per team AT THIS LOCATION
    const teamPipeline: object[] = [{ $match: aggregationMatch }];
    // If location couldn't be resolved to IDs, enforce it by name.
    if (normalizedLocation && locationIds.length === 0) {
      teamPipeline.push({ $lookup: { from: "locations", localField: "locationId", foreignField: "_id", as: "location" } });
      teamPipeline.push({ $unwind: "$location" });
      teamPipeline.push({ $match: { "location.name": normalizedLocation } });
    }
    teamPipeline.push({ $lookup: { from: "teams", localField: "teamId", foreignField: "_id", as: "team" } });
    teamPipeline.push({ $unwind: "$team" });
    teamPipeline.push({
      $group: {
        _id: "$team.name",
        employeeIds: { $addToSet: "$employeeId" },
      },
    });
    teamPipeline.push({
      $project: {
        name: "$_id",
        count: { $size: "$employeeIds" },
      },
    });
    teamPipeline.push({ $sort: { name: 1 } });
    const teamAggregation = await EmployeeTeamAssignmentsDbQueries.aggregate(teamPipeline);

    // For employers, filter by location if specified
    let employerAggregation;
    if ((args?.locationId || args?.locationName) && locationIds.length > 0) {
      // Get unique employees at the specified location
      const employeesAtLocation = await EmployeeTeamAssignmentsDbQueries.aggregate([
        { $match: aggregationMatch },
        { $group: { _id: "$employeeId" } },
        { $project: { _id: 1 } }
      ]);
      const employeeIdsAtLocation = employeesAtLocation.map(e => e._id);
      // Filter base filter to only include these employees
      const locationBaseFilter = { ...baseFilter };
      if (employeeIdsAtLocation.length > 0) {
        if (locationBaseFilter.$and) {
          (locationBaseFilter.$and as any[]).push({ _id: { $in: employeeIdsAtLocation } });
        } else {
          locationBaseFilter._id = { $in: employeeIdsAtLocation };
        }
        employerAggregation = await EmployeeFiltersDbQueries.aggregateEmployers(locationBaseFilter);
      } else {
        employerAggregation = [];
      }
    } else if (normalizedLocation && locationIds.length === 0) {
      // Location was requested but couldn't be resolved by ID.
      // Fall back to "match by location name" via lookup on assignments, then count employers for those employees.
      const employeesAtLocation = await EmployeeTeamAssignmentsDbQueries.aggregate([
        { $match: { employeeId: { $in: employeeIds }, isActive: true } },
        { $lookup: { from: "locations", localField: "locationId", foreignField: "_id", as: "location" } },
        { $unwind: "$location" },
        { $match: { "location.name": normalizedLocation } },
        { $group: { _id: "$employeeId" } },
        { $project: { _id: 1 } },
      ]);
      const employeeIdsAtLocation = employeesAtLocation.map((e: any) => e._id);

      const locationBaseFilter = { ...baseFilter };
      if (employeeIdsAtLocation.length > 0) {
        if (locationBaseFilter.$and) (locationBaseFilter.$and as any[]).push({ _id: { $in: employeeIdsAtLocation } });
        else locationBaseFilter._id = { $in: employeeIdsAtLocation };
        employerAggregation = await EmployeeFiltersDbQueries.aggregateEmployers(locationBaseFilter);
      } else {
        employerAggregation = [];
      }
    } else {
      employerAggregation = await EmployeeFiltersDbQueries.aggregateEmployers(baseFilter);
    }

    // Location aggregation - always show all locations
    const locationAggregation = await EmployeeTeamAssignmentsDbQueries.aggregate([
      { $match: { employeeId: { $in: employeeIds }, isActive: true } },
      { $lookup: { from: "locations", localField: "locationId", foreignField: "_id", as: "location" } },
      { $unwind: "$location" },
      { $group: { 
        _id: "$location.name", 
        employeeIds: { $addToSet: "$employeeId" }
      }},
      { $project: { 
        name: "$_id", 
        count: { $size: "$employeeIds" }
      }},
      { $sort: { name: 1 } },
    ]);

    return { teams: teamAggregation, employers: employerAggregation, locations: locationAggregation };
  }
}

export const employeeFiltersService = new EmployeeFiltersService();

