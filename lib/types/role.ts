export interface Role {
  id: string
  name: string
  code?: string
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: {
      dayOfWeek?: number[]
      startHour?: number
      endHour?: number
      description?: string
    }
  }
  isActive: boolean
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateRoleRequest {
  name: string
  code?: string
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: {
      dayOfWeek?: number[]
      startHour?: number
      endHour?: number
      description?: string
    }
  }
  isActive?: boolean
}

export interface UpdateRoleRequest {
  name?: string
  code?: string
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: {
      dayOfWeek?: number[]
      startHour?: number
      endHour?: number
      description?: string
    }
  }
  isActive?: boolean
}

