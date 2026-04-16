import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { RoleEnablementManager } from "@/lib/managers/role-enablement-manager";
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment";

export class TeamAvailabilityService {
  private roleEnablementManager = new RoleEnablementManager();

  async getAvailability(locationId: string, dateString?: string) {
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return { status: 400, data: { error: "Invalid location ID format" } };
    }

    await connectDB();
    const date = dateString ? new Date(dateString) : new Date();
    const enablements = await this.roleEnablementManager.getEnabledRoles(locationId, date);

    const teamsWithCounts = await Promise.all(
      enablements.map(async (enablement: any) => {
        const roleId = enablement.roleId as any;
        const employeeCount = await EmployeeRoleAssignment.countDocuments({
          roleId: roleId._id,
          locationId: new mongoose.Types.ObjectId(locationId),
          validFrom: { $lte: date },
          $or: [{ validTo: null }, { validTo: { $gte: date } }],
        });

        return {
          teamId: roleId._id.toString(),
          teamName: roleId.name,
          teamColor: roleId.color,
          employeeCount,
          isEnabled: true,
        };
      }),
    );

    return {
      status: 200,
      data: { teams: teamsWithCounts },
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "CDN-Cache-Control": "public, max-age=300",
      },
    };
  }
}

export const teamAvailabilityService = new TeamAvailabilityService();

