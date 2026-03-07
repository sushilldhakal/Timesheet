import { ApiResponse } from '@/lib/utils/api-response'

const BASE_URL = '/api/shift-swaps'

export interface ShiftSwap {
  id: string
  requesterId: string
  requesterName: string
  targetId: string | null
  targetName: string | null
  originalShiftId: string
  originalShift: {
    date: string
    startTime: string
    endTime: string
    locationName: string
    roleName: string
  }
  replacementShiftId: string | null
  replacementShift: {
    date: string
    startTime: string
    endTime: string
    locationName: string
    roleName: string
  } | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason: string
  requestedAt: string
  respondedAt: string | null
  approvedBy: string | null
  approverName: string | null
  notes: string | null
}

export interface CreateShiftSwapRequest {
  originalShiftId: string
  targetId?: string | null
  replacementShiftId?: string | null
  reason: string
}

export interface RespondToShiftSwapRequest {
  response: 'approve' | 'reject'
  notes?: string
}

// Get all shift swap requests
export async function getShiftSwaps(params?: {
  status?: string
  requesterId?: string
  targetId?: string
  startDate?: string
  endDate?: string
}): Promise<ApiResponse<ShiftSwap[]>> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.requesterId) searchParams.set('requesterId', params.requesterId)
  if (params?.targetId) searchParams.set('targetId', params.targetId)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  
  const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get a specific shift swap request
export async function getShiftSwap(id: string): Promise<ApiResponse<ShiftSwap>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    credentials: 'include',
  })
  return response.json()
}

// Create a new shift swap request
export async function createShiftSwap(data: CreateShiftSwapRequest): Promise<ApiResponse<ShiftSwap>> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Respond to a shift swap request (approve/reject)
export async function respondToShiftSwap(
  id: string, 
  data: RespondToShiftSwapRequest
): Promise<ApiResponse<ShiftSwap>> {
  const response = await fetch(`${BASE_URL}/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Cancel a shift swap request
export async function cancelShiftSwap(id: string): Promise<ApiResponse<ShiftSwap>> {
  const response = await fetch(`${BASE_URL}/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  return response.json()
}

// Delete a shift swap request
export async function deleteShiftSwap(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return response.json()
}