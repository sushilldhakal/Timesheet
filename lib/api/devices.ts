import { apiFetch } from './fetch-client'
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
  return apiFetch<ApiResponse<DeviceCheckResponse>>(`${BASE_URL}/check`)
}

// Activate/register a device
export async function activateDevice(data: RegisterDeviceRequest): Promise<ApiResponse<Device>> {
  return apiFetch<ApiResponse<Device>>(`${BASE_URL}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
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
  return apiFetch<ApiResponse<Device[]>>(url)
}

// Get a specific device (admin only)
export async function getDevice(id: string): Promise<ApiResponse<Device>> {
  return apiFetch<ApiResponse<Device>>(`${BASE_URL}/${id}`)
}

// Update a device (admin only)
export async function updateDevice(
  id: string, 
  data: UpdateDeviceRequest
): Promise<ApiResponse<Device>> {
  return apiFetch<ApiResponse<Device>>(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete a device (admin only)
export async function deleteDevice(id: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(`${BASE_URL}/${id}`, { method: 'DELETE' })
}

// Get managed devices (admin only)
export async function getManagedDevices(): Promise<{ devices: ManagedDevice[] }> {
  return apiFetch<{ devices: ManagedDevice[] }>(DEVICE_MANAGE_URL)
}

// Create managed device (admin only)
export async function createManagedDevice(data: CreateManagedDeviceRequest): Promise<{ activationCode: string }> {
  return apiFetch<{ activationCode: string }>(DEVICE_MANAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Update managed device status (admin only)
export async function updateManagedDevice(data: UpdateManagedDeviceRequest): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(DEVICE_MANAGE_URL, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Delete managed device (admin only)
export async function deleteManagedDevice(deviceId: string): Promise<ApiResponse<void>> {
  return apiFetch<ApiResponse<void>>(DEVICE_MANAGE_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })
}

// Register device with authentication
export async function registerDeviceWithAuth(data: RegisterDeviceWithAuthRequest): Promise<{ success: boolean; deviceId: string }> {
  return apiFetch<{ success: boolean; deviceId: string }>(DEVICE_REGISTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Get public locations (no auth required)
export async function getPublicLocations(): Promise<{ locations: DeviceLocation[]; count: number }> {
  const response = await fetch(PUBLIC_LOCATIONS_URL, {
    cache: 'no-cache',
  })
  return response.json()
}