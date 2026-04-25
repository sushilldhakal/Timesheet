import type { EntityId } from "@/shared/types"

export interface EmployeeTeamAssignmentDTO {
  id: EntityId
  team: { id: EntityId; name: string; color?: string }
  location: {
    id: EntityId
    name: string
    color?: string
    address: string
    lat?: number
    lng?: number
    geofence: { radius: number; mode: string }
    hours: { opening?: number; closing?: number; workingDays: unknown[] }
  }
  validFrom: unknown
  validTo: unknown
  isActive: boolean
}

export interface EmployeeEmployerDTO {
  id: EntityId
  name: string
  color?: string
}

export interface EmployeeLocationDTO {
  id: EntityId
  name: string
  color?: string
  address: string
  lat?: number
  lng?: number
  geofence: { radius: number; mode: string }
  hours: { opening?: number; closing?: number; workingDays: unknown[] }
}

export interface EmployeeDTO {
  id: EntityId
  name: string
  pin: string
  email: string
  phone: string
  homeAddress: string
  img: string
  dob: string
  gender: string
  employmentType: string | null
  standardHoursPerWeek: number | null | undefined
  comment: string
  awardId: EntityId | null
  awardLevel: string | null
  onboardingCompleted: boolean
  onboardingWorkflowStatus: string
  onboardingCountry: string
  createdAt: unknown
  updatedAt: unknown

  teams?: EmployeeTeamAssignmentDTO[]
  employers?: EmployeeEmployerDTO[]
  locations?: EmployeeLocationDTO[]
  award?: { id: EntityId; name: string; level: string; description: string } | null

  // Extra fields present in detail responses
  passwordSetByAdmin?: boolean
  requirePasswordChange?: boolean
  onboardingCompletedAt?: unknown
  onboardingStatus?: unknown
  legalFirstName?: string
  legalMiddleNames?: string
  legalLastName?: string
  preferredName?: string
  timeZone?: string
  locale?: string
  nationality?: string
  isActive?: boolean
  isProbationary?: boolean
  probationEndDate?: unknown
  terminatedAt?: unknown
  terminationReason?: string
  skills?: string[]
  certifications?: unknown[]
  emergencyContact?: unknown
  address?: unknown
  passwordSetupExpiry?: unknown
}

export interface EmployeeCreateCertificationPersistInput {
  type: string
  label?: string
  required: boolean
  provided: boolean
}

/** Plain persistence payload for employee create — service builds tokens/emails; adapter only saves. */
export interface EmployeeCreatePersistInput {
  name: string
  pin: string
  employer: string[]
  location: string[]
  email: string
  phone: string
  homeAddress: string
  dob: string
  gender: string
  comment: string
  img: string
  employmentType: string | null
  standardHoursPerWeek: number | null | undefined
  awardId: string | null
  awardLevel: string | null
  certifications: EmployeeCreateCertificationPersistInput[]
  onboardingWorkflowStatus: string
  onboardingCountry: string
  onboardingInvitedBy?: string | null
  password?: string
  passwordSetByAdmin?: boolean
  requirePasswordChange?: boolean
  passwordSetupToken?: string
  passwordSetupExpiry?: Date | string | null
}

