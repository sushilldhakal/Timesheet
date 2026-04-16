import type { AuthUser } from "@/lib/types/auth"

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface MeResponse {
  user: AuthUser | null
}

export interface UnifiedLoginRequest {
  email: string
  password: string
  loginAs?: "admin" | "staff"
}

export interface UnifiedLoginResponse {
  success: boolean
  userType: "admin" | "employee"
  redirect?: string
  requirePasswordChange?: boolean
  user?: {
    id: string
    name?: string
    email: string
    role?: string
    location?: string | string[]
    rights?: string[]
    pin?: string
    employer?: string
  }
}

// Get current user
export async function getMe(): Promise<MeResponse> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to get user info')
  }
  
  return response.json()
}

// Logout
export async function logout(): Promise<{ success: boolean }> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('Failed to logout')
  }
  
  return response.json()
}

// Unified login
export async function unifiedLogin(data: UnifiedLoginRequest): Promise<UnifiedLoginResponse> {
  const response = await fetch('/api/auth/unified-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Login failed')
  }
  
  return response.json()
}

// Change password
export async function changePassword(data: ChangePasswordRequest): Promise<{ success: boolean }> {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to change password')
  }
  
  return response.json()
}

// Forgot password
export async function forgotPassword(data: { email: string }): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to send reset email')
  }
  
  return response.json()
}

// Reset password
export async function resetPassword(data: { token: string; password: string }): Promise<{ success: boolean }> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to reset password')
  }
  
  return response.json()
}

// Setup password
export async function setupPassword(data: { token: string; password: string }): Promise<{ success: boolean }> {
  const response = await fetch('/api/auth/setup-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to setup password')
  }
  
  return response.json()
}

// Verify reset token
export async function verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const response = await fetch(`/api/auth/reset-password?token=${token}`, {
    method: 'GET',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Invalid or expired token')
  }
  
  return response.json()
}

// Verify setup token
export async function verifySetupToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const response = await fetch(`/api/auth/setup-password?token=${token}`, {
    method: 'GET',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Invalid or expired token')
  }
  
  return response.json()
}
