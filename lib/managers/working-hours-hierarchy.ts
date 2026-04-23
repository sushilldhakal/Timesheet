import mongoose from "mongoose"
import type { ISchedule } from "@/lib/db/queries/scheduling-types"
import { SchedulingModels } from "@/lib/db/queries/scheduling-models"

export interface WorkingHoursConfig {
  standardHoursPerWeek: number
  shiftPattern: ISchedule | any // Can be employee schedule or template pattern
  source: "employee" | "role" | "award"
}

/**
 * Working Hours Hierarchy Resolver
 * Implements three-tier priority: Employee → Role → Award
 */
export class WorkingHoursHierarchy {
  /**
   * Resolve working hours for an employee using three-tier hierarchy
   * Priority: Employee_Schedule → Role_Template → Award_Standard
   */
  async resolveWorkingHours(
    employeeId: mongoose.Types.ObjectId | string,
    organizationId?: string
  ): Promise<WorkingHoursConfig | null> {
    // Priority 1: Check Employee Schedule
    const employeeSchedule = await this.getEmployeeSchedule(employeeId, organizationId)
    if (employeeSchedule) {
      return employeeSchedule
    }

    // Priority 2: Check Role Template
    const roleTemplate = await this.getRoleTemplate(employeeId, organizationId)
    if (roleTemplate) {
      return roleTemplate
    }

    // Priority 3: Check Award Standard
    const awardStandard = await this.getAwardStandard(employeeId, organizationId)
    if (awardStandard) {
      return awardStandard
    }

    // No configuration found
    return null
  }

  /**
   * Get employee-level schedule configuration
   */
  async getEmployeeSchedule(
    employeeId: mongoose.Types.ObjectId | string,
    organizationId?: string
  ): Promise<WorkingHoursConfig | null> {
    try {
      const employee = await SchedulingModels.Employee.findById(employeeId)
      if (!employee || !employee.schedules || employee.schedules.length === 0) {
        return null
      }

      // Check if employee has standardHoursPerWeek defined
      if (employee.standardHoursPerWeek) {
        // Use the first active schedule (could be enhanced to filter by date)
        const activeSchedule = employee.schedules.find(s => !s.isTemplate)
        if (activeSchedule) {
          return {
            standardHoursPerWeek: employee.standardHoursPerWeek,
            shiftPattern: activeSchedule,
            source: "employee",
          }
        }
      }

      return null
    } catch (error) {
      console.error("Error getting employee schedule:", error)
      return null
    }
  }

  /**
   * Get role-level template configuration
   * Uses EmployeeTeamAssignment collection to find active team assignments
   */
  async getRoleTemplate(
    employeeId: mongoose.Types.ObjectId | string,
    organizationId?: string
  ): Promise<WorkingHoursConfig | null> {
    try {
      const EmployeeTeamAssignment = (SchedulingModels as any).EmployeeTeamAssignment
      
      // Get active role assignments for this employee
      const roleAssignments = await EmployeeTeamAssignment.find({
        employeeId: new mongoose.Types.ObjectId(employeeId.toString()),
        isActive: true,
      }).populate('teamId').lean()

      if (!roleAssignments || roleAssignments.length === 0) {
        return null
      }

      // Find the first role with a defaultScheduleTemplate
      for (const assignment of roleAssignments) {
        const role = assignment.teamId as any
        if (!role || typeof role === 'string' || !role.defaultScheduleTemplate) {
          continue
        }

        const template = role.defaultScheduleTemplate
        if (template.standardHoursPerWeek && template.shiftPattern) {
          return {
            standardHoursPerWeek: template.standardHoursPerWeek,
            shiftPattern: template.shiftPattern,
            source: "role",
          }
        }
      }

      return null
    } catch (error) {
      console.error("Error getting role template:", error)
      return null
    }
  }

  /**
   * Get award-level standard hours
   */
  async getAwardStandard(
    employeeId: mongoose.Types.ObjectId | string,
    organizationId?: string
  ): Promise<WorkingHoursConfig | null> {
    try {
      const employee = await SchedulingModels.Employee.findById(employeeId)
      if (!employee || !employee.awardId || !employee.awardLevel || !employee.employmentType) {
        return null
      }

      const award = await SchedulingModels.Award.findById(employee.awardId)
      if (!award) {
        return null
      }

      // Find the matching award level
      const levels = (award as any)?.levels
      if (!Array.isArray(levels)) return null
      const level = levels.find((l: any) => l.label === employee.awardLevel)
      if (!level) {
        return null
      }

      // Find the matching condition set for employment type
      const conditionSet = level.conditions.find(
        (c: any) => c.employmentType === employee.employmentType
      )
      if (!conditionSet || !conditionSet.payRule) {
        return null
      }

      // Extract standard hours from pay rule
      let standardHoursPerWeek: number

      if (conditionSet.payRule.type === "hourly") {
        // For hourly workers, assume standard full-time hours
        standardHoursPerWeek = 38 // Default full-time hours
      } else if (conditionSet.payRule.type === "salary") {
        standardHoursPerWeek = conditionSet.payRule.hoursPerWeek || 38
      } else {
        return null
      }

      return {
        standardHoursPerWeek,
        shiftPattern: null, // Award doesn't define specific shift patterns
        source: "award",
      }
    } catch (error) {
      console.error("Error getting award standard:", error)
      return null
    }
  }
}
