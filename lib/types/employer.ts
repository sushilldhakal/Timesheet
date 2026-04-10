export interface Employer {
  id: string
  name: string
  abn?: string
  contactEmail?: string
  color?: string
  defaultAwardId?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateEmployerRequest {
  name: string
  abn?: string
  contactEmail?: string
  color?: string
  defaultAwardId?: string
  isActive?: boolean
}

export interface UpdateEmployerRequest {
  name?: string
  abn?: string
  contactEmail?: string
  color?: string
  defaultAwardId?: string
  isActive?: boolean
}

