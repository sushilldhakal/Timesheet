import { ApiResponse } from '@/lib/utils/api/api-response'

const BASE_URL = '/api/admin'

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface StorageStats {
  totalSize: number
  usedSize: number
  availableSize: number
  fileCount: number
  breakdown: {
    images: { size: number; count: number }
    documents: { size: number; count: number }
    other: { size: number; count: number }
  }
}

export interface StorageSettings {
  maxFileSize: number
  allowedFileTypes: string[]
  compressionEnabled: boolean
  compressionQuality: number
  retentionDays: number
}

export interface MailSettings {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword?: string
  fromEmail: string
  fromName: string
  replyToEmail?: string
}

export interface CleanupResult {
  deletedFiles: number
  freedSpace: number
  errors: string[]
}

// Get activity logs
export async function getActivityLogs(params?: {
  userId?: string
  action?: string
  resource?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<{ logs: ActivityLog[]; total: number }>> {
  const searchParams = new URLSearchParams()
  if (params?.userId) searchParams.set('userId', params.userId)
  if (params?.action) searchParams.set('action', params.action)
  if (params?.resource) searchParams.set('resource', params.resource)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  
  const url = searchParams.toString() ? `${BASE_URL}/activity-logs?${searchParams}` : `${BASE_URL}/activity-logs`
  const response = await fetch(url, {
    credentials: 'include',
  })
  return response.json()
}

// Get storage statistics
export async function getStorageStats(): Promise<ApiResponse<StorageStats>> {
  const response = await fetch(`${BASE_URL}/storage-stats`, {
    credentials: 'include',
  })
  return response.json()
}

// Get storage settings
export async function getStorageSettings(): Promise<ApiResponse<StorageSettings>> {
  const response = await fetch(`${BASE_URL}/storage-settings`, {
    credentials: 'include',
  })
  return response.json()
}

// Update storage settings
export async function updateStorageSettings(data: Partial<StorageSettings>): Promise<ApiResponse<StorageSettings>> {
  const response = await fetch(`${BASE_URL}/storage-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Get mail settings
export async function getMailSettings(): Promise<ApiResponse<MailSettings>> {
  const response = await fetch(`${BASE_URL}/mail-settings`, {
    credentials: 'include',
  })
  return response.json()
}

// Update mail settings
export async function updateMailSettings(data: Partial<MailSettings>): Promise<ApiResponse<MailSettings>> {
  const response = await fetch(`${BASE_URL}/mail-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  return response.json()
}

// Test mail settings
export async function testMailSettings(testEmail: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/mail-settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ testEmail }),
  })
  return response.json()
}

// Run cleanup
export async function runCleanup(params?: {
  olderThanDays?: number
  dryRun?: boolean
}): Promise<ApiResponse<CleanupResult>> {
  const searchParams = new URLSearchParams()
  if (params?.olderThanDays) searchParams.set('olderThanDays', params.olderThanDays.toString())
  if (params?.dryRun) searchParams.set('dryRun', 'true')
  
  const url = searchParams.toString() ? `${BASE_URL}/cleanup?${searchParams}` : `${BASE_URL}/cleanup`
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  })
  return response.json()
}

// Create test data
export async function createTestData(params?: {
  employeeCount?: number
  locationCount?: number
  shiftCount?: number
}): Promise<ApiResponse<{ message: string; created: Record<string, number> }>> {
  const response = await fetch(`${BASE_URL}/create-test-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params || {}),
  })
  return response.json()
}