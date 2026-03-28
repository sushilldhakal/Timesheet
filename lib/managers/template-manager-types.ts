import type { ISchedule } from "../db/schemas/schedule"

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
