import { ApiResponse } from '@/lib/utils/api/api-response'

export interface SetupStatus {
  isSetupComplete: boolean
  hasAdmin: boolean
  databaseConnected: boolean
  requiredSteps: string[]
  completedSteps: string[]
  needsSetup: boolean
}

export interface CreateAdminRequest {
  username: string
  password: string
}

export interface CreateAdminResponse {
  success: boolean
  message: string
  admin: {
    id: string
    name: string
    email: string
  }
}

// Fetch setup status
export async function fetchSetupStatus(): Promise<ApiResponse<SetupStatus>> {
  const response = await fetch('/api/setup/status', {
    credentials: 'include',
  })
  return response.json()
}

// Create admin user
export async function createAdmin(data: CreateAdminRequest): Promise<ApiResponse<CreateAdminResponse>> {
  const response = await fetch('/api/setup/create-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}