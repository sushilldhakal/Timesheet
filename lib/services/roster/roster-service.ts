import { connectDB } from "@/lib/db";
import { RosterDbQueries } from "@/lib/db/queries/rosters";
import { RosterManager } from "@/lib/managers/roster-manager";
import { AutoFillEngine } from "@/lib/managers/auto-fill-engine";
import { ComplianceManager } from "@/lib/managers/compliance-manager";

export class RosterService {
  private rosterManager = new RosterManager();
  private autoFillEngine = new AutoFillEngine();
  private complianceManager = new ComplianceManager();

  async createRoster(weekId: string, autoPopulate: boolean) {
    await connectDB();

    const createResult = await this.rosterManager.createRoster(weekId);
    if (!createResult.success) {
      return { status: 400, data: { error: createResult.error || "Failed to create roster" } };
    }

    if (!autoPopulate) {
      return { status: 201, data: { roster: createResult.roster, shiftsGenerated: 0 } };
    }

    const populateResult = await this.rosterManager.populateRosterFromSchedules(weekId);
    if (!populateResult.success) {
      return { status: 207, data: { roster: createResult.roster, shiftsGenerated: 0 } };
    }

    return { status: 201, data: { roster: createResult.roster, shiftsGenerated: populateResult.shiftsCreated || 0 } };
  }

  async getRoster(weekId: string) {
    await connectDB();
    const result = await this.rosterManager.getRoster(weekId);
    if (!result.success) {
      if (result.error === "ROSTER_NOT_FOUND") return { status: 404, data: { error: result.message || "Roster not found" } };
      return { status: 500, data: { error: result.message || "Failed to fetch roster" } };
    }
    return { status: 200, data: { roster: result.roster } };
  }

  async deleteRoster(weekId: string) {
    await connectDB();
    const result = await this.rosterManager.deleteRoster(weekId);
    if (!result.success) {
      if (result.error === "ROSTER_NOT_FOUND") return { status: 404, data: { error: result.message || "Roster not found" } };
      if (result.error === "ROSTER_PUBLISHED") return { status: 403, data: { error: result.message || "Cannot delete published roster" } };
      return { status: 500, data: { error: result.message || "Failed to delete roster" } };
    }
    return { status: 200, data: { message: "Roster deleted successfully" } };
  }

  async generateRoster(weekId: string, body: any) {
    await connectDB();

    const existingRoster = await this.rosterManager.getRoster(weekId);
    if (!existingRoster.success) {
      const createResult = await this.rosterManager.createRoster(weekId);
      if (!createResult.success) {
        return { status: 400, data: { error: (createResult as any).error, message: (createResult as any).message } };
      }
    }

    if (body.mode === "copy") {
      if (!body.copyFromWeekId) return { status: 400, data: { error: "copyFromWeekId is required when mode is 'copy'" } };
      const result = await this.rosterManager.copyRosterFromWeek(weekId, body.copyFromWeekId);
      if (!result.success) return { status: 400, data: { error: (result as any).error, message: (result as any).message } };
      return { status: 200, data: { message: "Roster copied successfully", shiftsCreated: (result as any).shiftsCreated } };
    }

    const result = await this.rosterManager.populateRosterFromSchedules(weekId, body.includeEmploymentTypes, body.locationIds);
    if (!result.success) return { status: 400, data: { error: (result as any).error, message: (result as any).message } };
    return { status: 200, data: { message: "Roster generated from schedules", shiftsCreated: (result as any).shiftsCreated } };
  }

  async autoFillRoster(weekId: string, locationId: string, managedRoles: string[], employmentTypes?: string[], replaceDrafts?: boolean) {
    await connectDB();
    const roster = await RosterDbQueries.createRosterIfMissing(weekId);
    const types = (employmentTypes || ["FULL_TIME", "PART_TIME"]) as any;
    const result = await this.autoFillEngine.fillRoster(roster._id.toString(), locationId, managedRoles, types, {
      replaceDrafts: !!replaceDrafts,
    });
    return {
      status: 200,
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
        skippedCount: result.skippedCount,
        violations: result.violations,
        skippedEmployees: result.skippedEmployees,
      },
    };
  }

  async validateCompliance(weekId: string, organizationId: string) {
    await connectDB();
    const roster = await RosterDbQueries.requireRosterByWeekId(weekId);
    if (!roster) return { status: 404, data: { error: "Roster not found" } };

    const violations = await this.complianceManager.validateRoster(roster._id.toString(), organizationId);
    const blockingViolations = violations.filter((v: any) => v.blockPublish);
    const canPublish = blockingViolations.length === 0;

    return {
      status: 200,
      data: {
        isCompliant: violations.length === 0,
        violations: violations.map((v: any) => ({
          employeeId: v.employeeId,
          date: v.date,
          ruleType: v.ruleType,
          ruleName: v.ruleName,
          message: v.message,
          severity: v.severity,
        })),
        canPublish,
      },
    };
  }

  async publishRoster(weekId: string) {
    await connectDB();
    const result = await this.rosterManager.publishRoster(weekId);
    if (!result.success) {
      if ((result as any).error === "ROSTER_NOT_FOUND") return { error: (result as any).error, message: (result as any).message };
      return { error: (result as any).error, message: (result as any).message };
    }
    return { message: "Roster published successfully", roster: (result as any).roster };
  }

  async publishShiftsInScope(input: { weekId: string; locationId: string; roleIds: string[] }) {
    await connectDB();
    const result = await this.rosterManager.publishShiftsInScope(input.weekId, input.locationId, input.roleIds);
    if (!result.success) {
      return { error: (result as any).error, message: (result as any).message };
    }
    return {
      message: "Shifts published successfully",
      roster: (result as any).roster,
      publishedCount: (result as any).publishedCount,
    };
  }

  async unpublishRoster(weekId: string) {
    await connectDB();
    const result = await this.rosterManager.unpublishRoster(weekId);
    if (!result.success) {
      return { error: (result as any).error, message: (result as any).message };
    }
    return { message: "Roster unpublished successfully", roster: (result as any).roster };
  }

  async detectGaps(input: { weekId: string; organizationId?: string; includeSuggestions?: boolean }) {
    await connectDB();
    const result = await this.rosterManager.detectGaps(input.weekId);
    if (!result.success) {
      return { error: (result as any).error, message: (result as any).message };
    }
    return { gaps: (result as any).gaps };
  }

  async addShift(input: any) {
    await connectDB();
    const { weekId, ...rest } = input;
    const result = await this.rosterManager.addShift(weekId, rest);
    if (!result.success) return { error: (result as any).error, message: (result as any).message };
    return { shift: (result as any).shift };
  }

  async updateShift(input: { weekId: string; shiftId: string; update: any }) {
    await connectDB();
    const result = await this.rosterManager.updateShift(input.weekId, input.shiftId, input.update);
    if (!result.success) return { error: (result as any).error, message: (result as any).message };
    return { shift: (result as any).shift };
  }

  async deleteShift(input: { weekId: string; shiftId: string }) {
    await connectDB();
    const result = await this.rosterManager.deleteShift(input.weekId, input.shiftId);
    if (!result.success) return { error: (result as any).error, message: (result as any).message };
    return { message: "Shift deleted successfully" };
  }
}

export const rosterService = new RosterService();

