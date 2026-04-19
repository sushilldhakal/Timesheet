import { apiFetch } from './fetch-client'

export interface FaceProfile {
  employeeId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Get face profile for employee
export async function getFaceProfile(employeeId: string): Promise<{ profile: FaceProfile }> {
  return apiFetch<{ profile: FaceProfile }>(`/api/face-profiles/${employeeId}`)
}

// Delete face profile for employee
export async function deleteFaceProfile(employeeId: string): Promise<void> {
  return apiFetch<void>(`/api/face-profiles/${employeeId}`, { method: "DELETE" })
}

// Toggle face profile active status
export async function toggleFaceProfile(employeeId: string, isActive: boolean): Promise<{ profile: FaceProfile }> {
  return apiFetch<{ profile: FaceProfile }>(`/api/face-profiles/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  })
}