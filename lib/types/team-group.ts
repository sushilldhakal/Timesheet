export interface TeamGroup {
  id: string
  name: string
  description?: string
  color?: string
  order?: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateTeamGroupRequest {
  name: string
  description?: string
  color?: string
  order?: number
  isActive?: boolean
}

export interface UpdateTeamGroupRequest {
  name?: string
  description?: string
  color?: string
  order?: number
  isActive?: boolean
}
