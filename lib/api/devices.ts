import { ApiResponse } from '@/lib/utils/api/api-response'
import type {
  Device,
  ManagedDevice,
  DeviceLocation,
  RegisterDeviceRequest,
  CreateManagedDeviceRequest,
  RegisterDeviceWithAuthRequest,
  UpdateDeviceRequest,
  UpdateManagedDeviceRequest,
  DeviceCheckResponse
} from '@/lib/types/devices'

const BASE_URL = '/api/devices'
const DEVICE_MANAGE_URL = '/api/device/manage'
const DEVICE_REGISTER_URL = '/api/device/register'
const PUBLIC_LOCATIONS_URL = '/api/public/locations'

// Check if device is authorized
export async function checkDevice(): Promise<ApiResponse<DeviceCheckResponse>> {
  const response = await fetch(`${BASE_URL}/check`, {
    credentials: 'include',
  })
  return response.json()
}

// Activate/register a device
export async function activateDevice(data: RegisterDeviceRequest): Promise<ApiResponse<Device>> {
  const response = await fetch(`${BASE_URL}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Get all devices (admin only)
export async function getDevices(params?: {
  search?: string
  locationName?: string
  isActive?: boolean
}): Promise<ApiResponse<Device[]>> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.locationName) searchParams.set('locationName', params.locationName)
  if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())
  
  const url = searchParams.toString() ? `${BASE_URL}?${searchParams}` : BASE_URL
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get a specific device (admin only)
export async function getDevice(id: string): Promise<ApiResponse<Device>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    credentials: 'include',
  })
  return response.json()
}

// Update a device (admin only)
export async function updateDevice(
  id: string, 
  data: UpdateDeviceRequest
): Promise<ApiResponse<Device>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Delete a device (admin only)
export async function deleteDevice(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  return response.json()
}

// Get managed devices (admin only)
export async function getManagedDevices(): Promise<{ devices: ManagedDevice[] }> {
  const response = await fetch(DEVICE_MANAGE_URL, {
    credentials: 'include',
  })
  return response.json()
}

// Create managed device (admin only)
export async function createManagedDevice(data: CreateManagedDeviceRequest): Promise<{ activationCode: string }> {
  const response = await fetch(DEVICE_MANAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Update managed device status (admin only)
export async function updateManagedDevice(data: UpdateManagedDeviceRequest): Promise<ApiResponse<void>> {
  const response = await fetch(DEVICE_MANAGE_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Delete managed device (admin only)
export async function deleteManagedDevice(deviceId: string): Promise<ApiResponse<void>> {
  const response = await fetch(DEVICE_MANAGE_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ deviceId }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete device')
  }
  
  return response.json()
}

// Register device with authentication
export async function registerDeviceWithAuth(data: RegisterDeviceWithAuthRequest): Promise<{ success: boolean; deviceId: string }> {
  const response = await fetch(DEVICE_REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Get public locations (no auth required)
export async function getPublicLocations(): Promise<{ locations: DeviceLocation[]; count: number }> {
  const response = await fetch(PUBLIC_LOCATIONS_URL, {
    cache: 'no-cache',
  })
  return response.json()
}