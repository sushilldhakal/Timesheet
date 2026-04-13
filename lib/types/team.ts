export interface Team {
  id: string
  name: string
  code?: string
  color?: string
  /** Reference to TeamGroup for organizational hierarchy */
  groupId?: string
  /** UI ordering; lower first. */
  order?: number
  groupSnapshot?: { name?: string }
  /** Populated on list for display (current group). */
  groupName?: string
  groupColor?: string
  /** Distinct employees with an active assignment to this team (any location) */
  staffCount?: number
  /** Dashboard users (manager/supervisor) with this team in managedRoleIds */
  managerCount?: number
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
  groupId?: string
  order?: number
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
  groupId?: string
  order?: number
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
