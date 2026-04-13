import { ApiResponse } from '@/lib/utils/api/api-response'

// Mail Settings
export interface MailSettings {
  fromEmail: string
  fromName: string
  apiKey: string
  hasApiKey: boolean
}

export interface UpdateMailSettingsRequest {
  fromEmail: string
  fromName: string
  apiKey?: string
}

export interface TestMailRequest {
  testEmail: string
}

// Storage Settings
export interface StorageSettings {
  provider: 'cloudinary' | 'r2'
  isActive: boolean
  cloudinary?: {
    cloudName: string
    apiKey: string
    apiSecret: string
    hasSecret: boolean
  }
  r2?: {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    publicUrl: string
    hasSecret: boolean
  }
}

export interface UpdateStorageSettingsRequest {
  provider: 'cloudinary' | 'r2'
  cloudinary?: {
    cloudName: string
    apiKey: string
    apiSecret?: string
  }
  r2?: {
    accountId: string
    accessKeyId: string
    secretAccessKey?: string
    bucketName: string
    publicUrl: string
  }
}

export interface TestStorageConnectionRequest {
  provider: 'cloudinary' | 'r2'
  credentials: any
}

export interface StorageStats {
  storageUsedMB: number
  storageLimitMB: number | null
  assets: number
  bandwidth: number | null
  images?: number
  videos?: number
  transformations?: number
  transformationsLimit?: number
  bandwidthLimit?: number
  lastSync?: Date
  other?: number
}

export interface ActivityLog {
  _id: string
  action: string
  createdAt: string
  details: string
  status: 'success' | 'error' | 'warning'
}

export interface ActivityLogsResponse {
  logs: ActivityLog[]
  total: number
}

export interface CleanupRequest {
  beforeDate: string
}

export interface CleanupResponse {
  deleted: number
}

// Mail Settings API
export async function getMailSettings(): Promise<{ settings: MailSettings }> {
  const response = await fetch('/api/admin/mail-settings', {
    credentials: 'include',
  })
  return response.json()
}

export async function updateMailSettings(data: UpdateMailSettingsRequest): Promise<ApiResponse<void>> {
  const response = await fetch('/api/admin/mail-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function testMailSettings(data: TestMailRequest): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch('/api/admin/mail-settings/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Storage Settings API
export async function getStorageSettings(): Promise<{ settings: StorageSettings }> {
  const response = await fetch('/api/admin/storage-settings', {
    credentials: 'include',
  })
  return response.json()
}

export async function updateStorageSettings(data: UpdateStorageSettingsRequest): Promise<ApiResponse<void>> {
  const response = await fetch('/api/admin/storage-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

export async function testStorageConnection(data: TestStorageConnectionRequest): Promise<ApiResponse<{ message: string }>> {
  const response = await fetch('/api/admin/storage-settings/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Storage Stats API
export async function getStorageStats(): Promise<{ stats: StorageStats }> {
  const response = await fetch(`/api/admin/storage-stats?t=${Date.now()}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  return response.json()
}

// Activity Logs API
export async function getActivityLogs(category: string, limit = 10, page = 1): Promise<ActivityLogsResponse> {
  const response = await fetch(`/api/admin/activity-logs?category=${category}&limit=${limit}&page=${page}`, {
    credentials: 'include',
  })
  return response.json()
}

export async function createActivityLog(data: { action: string; details: string; status: string; category: string }): Promise<ApiResponse<void>> {
  const response = await fetch('/api/admin/activity-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Cleanup API
export async function cleanupCloudinary(data: CleanupRequest): Promise<CleanupResponse> {
  const response = await fetch('/api/admin/cleanup/cloudinary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}
