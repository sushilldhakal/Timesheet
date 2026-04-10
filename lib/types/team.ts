export interface Team {
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

export interface CreateTeamRequest {
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

export interface UpdateTeamRequest {
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
