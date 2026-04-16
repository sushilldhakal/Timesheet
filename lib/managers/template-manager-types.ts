import type { ISchedule } from "@/lib/db/queries/scheduling-types"

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
