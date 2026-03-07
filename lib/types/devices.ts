export interface Device {
  id: string
  deviceId: string
  deviceName: string
  locationName: string
  isActive: boolean
  lastActivity: string
  createdAt: string
  updatedAt: string
}

export interface ManagedDevice {
  _id: string
  deviceId?: string
  deviceName: string
  locationName: string
  locationAddress?: string
  status: 'active' | 'disabled' | 'revoked'
  registeredBy: { name: string; username: string }
  registeredAt: string
  lastActivity: string
  lastUsedBy?: { name: string }
  totalPunches: number
  activationCode?: string
  activationCodeExpiry?: string
  revokedBy?: { name: string; username: string }
  revokedAt?: string
  revocationReason?: string
}

export interface Location {
  _id: string
  id: string
  name: string
  address?: string
}

export interface RegisterDeviceRequest {
  deviceName: string
  locationName: string
}

export interface CreateManagedDeviceRequest {
  deviceName: string
  locationName: string
  locationAddress: string
}

export interface RegisterDeviceWithAuthRequest {
  email: string
  password: string
  locationName: string
  locationAddress: string
}

export interface UpdateDeviceRequest {
  deviceName?: string
  locationName?: string
  isActive?: boolean
}

export interface UpdateManagedDeviceRequest {
  deviceId: string
  action: string
  reason?: string
}

export interface DeviceCheckResponse {
  authorized: boolean
  deviceInfo?: {
    id: string
    deviceId: string
    deviceName: string
    locationName: string
    lastActivity: string
  }
}