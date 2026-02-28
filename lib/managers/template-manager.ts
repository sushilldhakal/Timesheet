import mongoose from "mongoose"
import { Employee } from "../db/schemas/employee"
import { ISchedule } from "../db/schemas/schedule"
import { Category } from "../db/schemas/category"

export interface ShiftPattern {
  dayOfWeek: number[]
  startTime: Date
  endTime: Date
  locationId: string
  roleId: string
  isRotating?: boolean
  rotationCycle?: number
  rotationStartDate?: Date
}

export interface RoleTemplate {
  _id: string
  roleId: string
  organizationId: string
  schedule: ISchedule
}

/**
 * Template Manager
 * Manages role templates and quick copy operations
 */
export class TemplateManager {
  /**
   * Create a role template
   * @param roleId - The role this template is for
   * @param organizationId - Organization context
   * @param shiftPattern - The shift pattern configuration
   * @returns Created role template
   */
  async createRoleTemplate(
    roleId: string,
    organizationId: string,
    shiftPattern: ShiftPattern
  ): Promise<RoleTemplate> {
    // Create a special "template" employee for this role
    // In a real implementation, you might have a separate RoleTemplate collection
    // For now, we'll use the Employee model with a special flag

    const templateEmployee = await Employee.create({
      name: `Template for Role ${roleId}`,
      pin: `TEMPLATE_${roleId}_${Date.now()}`,
      employer: [organizationId],
      schedules: [
        {
          dayOfWeek: shiftPattern.dayOfWeek,
          startTime: shiftPattern.startTime,
          endTime: shiftPattern.endTime,
          locationId: new mongoose.Types.ObjectId(shiftPattern.locationId),
          roleId: new mongoose.Types.ObjectId(shiftPattern.roleId),
          effectiveFrom: new Date(),
          effectiveTo: null,
          priority: 1,
          isTemplate: true,
          isRotating: shiftPattern.isRotating || false,
          rotationCycle: shiftPattern.rotationCycle,
          rotationStartDate: shiftPattern.rotationStartDate || null,
        },
      ],
    })

    return {
      _id: templateEmployee._id.toString(),
      roleId,
      organizationId,
      schedule: templateEmployee.schedules![0],
    }
  }

  /**
   * Copy a template to an employee's schedule
   * @param templateId - The template to copy from
   * @param employeeId - The employee to copy to
   * @param overwrite - Whether to overwrite existing schedules
   * @returns Updated employee schedule
   */
  async copyTemplateToEmployee(
    templateId: string,
    employeeId: string,
    overwrite: boolean = false
  ): Promise<ISchedule> {
    // Load the template
    const templateEmployee = await Employee.findById(templateId)
    if (!templateEmployee || !templateEmployee.schedules || templateEmployee.schedules.length === 0) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const templateSchedule = templateEmployee.schedules[0]

    // Load the target employee
    const employee = await Employee.findById(employeeId)
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`)
    }

    // Check if employee already has a schedule
    if (employee.schedules && employee.schedules.length > 0 && !overwrite) {
      throw new Error(`Employee already has schedules. Set overwrite=true to replace them.`)
    }

    // Create new schedule based on template
    const newSchedule: ISchedule = {
      _id: new mongoose.Types.ObjectId(),
      dayOfWeek: [...templateSchedule.dayOfWeek],
      startTime: templateSchedule.startTime,
      endTime: templateSchedule.endTime,
      locationId: templateSchedule.locationId,
      roleId: templateSchedule.roleId,
      effectiveFrom: new Date(),
      effectiveTo: null,
      priority: templateSchedule.priority,
      isTemplate: false, // This is an employee schedule, not a template
      isRotating: templateSchedule.isRotating,
      rotationCycle: templateSchedule.rotationCycle,
      rotationStartDate: templateSchedule.rotationStartDate,
    }

    if (overwrite) {
      // Replace all existing schedules
      employee.schedules = [newSchedule]
    } else {
      // Add to existing schedules
      if (!employee.schedules) {
        employee.schedules = []
      }
      employee.schedules.push(newSchedule)
    }

    await employee.save()
    return newSchedule
  }

  /**
   * Get role template for a specific role
   * @param roleId - The role to get template for
   * @param organizationId - Organization context
   * @returns Role template or null if not found
   */
  async getRoleTemplate(
    roleId: string,
    organizationId: string
  ): Promise<RoleTemplate | null> {
    // Find template employee for this role
    const templateEmployee = await Employee.findOne({
      employer: organizationId,
      "schedules.isTemplate": true,
      "schedules.roleId": new mongoose.Types.ObjectId(roleId),
    })

    if (!templateEmployee || !templateEmployee.schedules || templateEmployee.schedules.length === 0) {
      return null
    }

    return {
      _id: templateEmployee._id.toString(),
      roleId,
      organizationId,
      schedule: templateEmployee.schedules[0],
    }
  }

  /**
   * Update a role template
   * @param templateId - The template to update
   * @param shiftPattern - The new shift pattern
   * @returns Updated role template
   */
  async updateRoleTemplate(
    templateId: string,
    shiftPattern: ShiftPattern
  ): Promise<RoleTemplate> {
    const templateEmployee = await Employee.findById(templateId)
    if (!templateEmployee || !templateEmployee.schedules || templateEmployee.schedules.length === 0) {
      throw new Error(`Template not found: ${templateId}`)
    }

    // Update the schedule
    const schedule = templateEmployee.schedules[0]
    schedule.dayOfWeek = shiftPattern.dayOfWeek
    schedule.startTime = shiftPattern.startTime
    schedule.endTime = shiftPattern.endTime
    schedule.locationId = new mongoose.Types.ObjectId(shiftPattern.locationId)
    schedule.roleId = new mongoose.Types.ObjectId(shiftPattern.roleId)
    schedule.isRotating = shiftPattern.isRotating || false
    schedule.rotationCycle = shiftPattern.rotationCycle
    schedule.rotationStartDate = shiftPattern.rotationStartDate || null

    await templateEmployee.save()

    return {
      _id: templateEmployee._id.toString(),
      roleId: schedule.roleId.toString(),
      organizationId: templateEmployee.employer?.[0] || "",
      schedule: templateEmployee.schedules[0],
    }
  }

  /**
   * List all role templates for an organization
   * @param organizationId - Organization context
   * @returns Array of role templates
   */
  async listRoleTemplates(organizationId: string): Promise<RoleTemplate[]> {
    const templateEmployees = await Employee.find({
      employer: organizationId,
      "schedules.isTemplate": true,
    })

    return templateEmployees
      .filter((emp) => emp.schedules && emp.schedules.length > 0)
      .map((emp) => ({
        _id: emp._id.toString(),
        roleId: emp.schedules![0].roleId.toString(),
        organizationId: emp.employer?.[0] || "",
        schedule: emp.schedules![0],
      }))
  }

  /**
   * Delete a role template
   * @param templateId - The template to delete
   */
  async deleteRoleTemplate(templateId: string): Promise<void> {
    const templateEmployee = await Employee.findById(templateId)
    if (!templateEmployee) {
      throw new Error(`Template not found: ${templateId}`)
    }

    await Employee.findByIdAndDelete(templateId)
  }
}
