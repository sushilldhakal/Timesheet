export interface Location {
  id: string
  name: string
  code?: string
  address?: string
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: 'hard' | 'soft'
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  timezone?: string
  costCenterId?: string
  color?: string
  isActive: boolean
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateLocationRequest {
  name: string
  code?: string
  address?: string
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: 'hard' | 'soft'
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  timezone?: string
  costCenterId?: string
  color?: string
  isActive?: boolean
}

export interface UpdateLocationRequest {
  name?: string
  code?: string
  address?: string
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: 'hard' | 'soft'
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  timezone?: string
  costCenterId?: string
  color?: string
  isActive?: boolean
}

