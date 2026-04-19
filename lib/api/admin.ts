import { apiFetch } from './fetch-client'
import type { ApiResponse } from '@/lib/utils/api/api-response'

const BASE_URL = '/api/admin'

export interface ActivityLog {
  id: string
  userId: string
  email: string
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

export interface EventHealthData {
  unprocessed: number
  retryExceeded: number
  total24h: number
  processed24h: number
  failureRate: number
  recentFailures: Array<{
    _id: string
    eventId: string
    eventType: string
    entityId: string
    entityType: string
    actorId?: string
    payload: Record<string, unknown>
    failedListeners: string[]
    retryCount: number
    occurredAt: string
    nextRetryAt?: string
  }>
}

export interface TriggerRetryResult {
  retried: number
  resolved: number
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
}): Promise<{ logs: ActivityLog[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.userId) searchParams.set('userId', params.userId)
  if (params?.action) searchParams.set('action', params.action)
  if (params?.resource) searchParams.set('resource', params.resource)
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  const qs = searchParams.toString()
  return apiFetch<{ logs: ActivityLog[]; total: number }>(`${BASE_URL}/activity-logs${qs ? `?${qs}` : ''}`)
}

// Get storage statistics
export async function getStorageStats(): Promise<StorageStats> {
  return apiFetch<StorageStats>(`${BASE_URL}/storage-stats`)
}

// Get storage settings
export async function getStorageSettings(): Promise<StorageSettings> {
  return apiFetch<StorageSettings>(`${BASE_URL}/storage-settings`)
}

// Update storage settings
export async function updateStorageSettings(data: Partial<StorageSettings>): Promise<StorageSettings> {
  return apiFetch<StorageSettings>(`${BASE_URL}/storage-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Get mail settings
export async function getMailSettings(): Promise<MailSettings> {
  return apiFetch<MailSettings>(`${BASE_URL}/mail-settings`)
}

// Update mail settings
export async function updateMailSettings(data: Partial<MailSettings>): Promise<MailSettings> {
  return apiFetch<MailSettings>(`${BASE_URL}/mail-settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Test mail settings
export async function testMailSettings(testEmail: string): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(`${BASE_URL}/mail-settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testEmail }),
  })
}

// Run cleanup
export async function runCleanup(params?: {
  olderThanDays?: number
  dryRun?: boolean
}): Promise<CleanupResult> {
  const searchParams = new URLSearchParams()
  if (params?.olderThanDays) searchParams.set('olderThanDays', params.olderThanDays.toString())
  if (params?.dryRun) searchParams.set('dryRun', 'true')
  const qs = searchParams.toString()
  return apiFetch<CleanupResult>(`${BASE_URL}/cleanup${qs ? `?${qs}` : ''}`, {
    method: 'POST',
  })
}

// Create test data
export async function createTestData(params?: {
  employeeCount?: number
  locationCount?: number
  shiftCount?: number
}): Promise<{ message: string; created: Record<string, number> }> {
  return apiFetch<{ message: string; created: Record<string, number> }>(`${BASE_URL}/create-test-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {}),
  })
}

// Get event health data
export async function getEventHealth(): Promise<EventHealthData> {
  return apiFetch<EventHealthData>(`${BASE_URL}/event-health`)
}

// Trigger event retry sweep
export async function triggerRetry(): Promise<TriggerRetryResult> {
  return apiFetch<TriggerRetryResult>(`${BASE_URL}/trigger-retry`, {
    method: 'POST',
  })
}

// API Keys management
export interface ApiKeyRecord {
  _id: string
  name: string
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  rateLimit: number
}

// Get API keys
export async function getApiKeys(): Promise<{ keys: ApiKeyRecord[] }> {
  return apiFetch<{ keys: ApiKeyRecord[] }>(`${BASE_URL}/api-keys`)
}

// Create API key
export async function createApiKey(params: {
  name: string
  scopes: string[]
  expiresAt?: string
}): Promise<{ key: string; record: ApiKeyRecord }> {
  return apiFetch<{ key: string; record: ApiKeyRecord }>(`${BASE_URL}/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
}

// Revoke API key
export async function revokeApiKey(keyId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`${BASE_URL}/api-keys/${keyId}`, {
    method: 'DELETE',
  })
}
