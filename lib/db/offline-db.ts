import Dexie, { Table } from 'dexie'
import { logger } from '@/lib/utils/logger'

// Employee data structure for offline storage
export interface OfflineEmployee {
  id: string
  pin: string
  name: string
  role?: string
  location?: string
  detectedLocation?: string
  isBirthday?: boolean
  lastLogin: number
  // Punch data for today
  punches: {
    clockIn?: string
    breakIn?: string
    breakOut?: string
    clockOut?: string
  }
  // Cached for offline access
  cachedAt: number
}

// Offline punch records
export interface OfflinePunch {
  id: string
  employeeId: string
  type: 'in' | 'break' | 'endBreak' | 'out'
  timestamp: string
  date: string
  time: string
  imageUrl?: string
  lat?: string
  lng?: string
  noPhoto?: boolean
  synced: number // 0 = false, 1 = true (for IndexedDB compatibility)
  createdAt: number
  // Additional offline metadata
  offline: number // 0 = false, 1 = true
  syncAttempts: number
  lastSyncAttempt?: number
  // Device information
  deviceId?: string
  deviceName?: string
}

// Sync queue for failed operations
export interface SyncQueueItem {
  id: string
  type: 'punch' | 'employee-login'
  data: any
  createdAt: number
  attempts: number
  lastAttempt?: number
  error?: string
}

// Location data for offline device registration
export interface OfflineLocation {
  id: string
  name: string
  cachedAt: number
}

// Device settings for offline storage
export interface DeviceSettings {
  id: string
  deviceId: string
  deviceName?: string
  locationName?: string
  lastSync: number
  createdAt: number
}

// Device authorization cache for offline access
export interface DeviceAuthCache {
  deviceId: string
  authorized: boolean
  deviceInfo?: {
    id: string
    deviceId: string
    deviceName: string
    locationName: string
    lastActivity: string
  }
  cachedAt: number
  expiresAt: number
}

class OfflineDatabase extends Dexie {
  employees!: Table<OfflineEmployee>
  punches!: Table<OfflinePunch>
  syncQueue!: Table<SyncQueueItem>
  locations!: Table<OfflineLocation>
  deviceSettings!: Table<DeviceSettings>
  deviceAuthCache!: Table<DeviceAuthCache>

  constructor() {
    super('TimesheetOfflineDB')
    
    this.version(3).stores({
      employees: 'id, pin, lastLogin, cachedAt',
      punches: 'id, employeeId, date, timestamp, synced, createdAt',
      syncQueue: 'id, type, createdAt, attempts',
      locations: 'id, name, cachedAt',
      deviceSettings: 'id, deviceId, lastSync',
      deviceAuthCache: 'deviceId, authorized, cachedAt, expiresAt'
    })
  }

  // Employee methods
  async cacheEmployee(employee: OfflineEmployee): Promise<void> {
    await this.employees.put({
      ...employee,
      cachedAt: Date.now(),
      lastLogin: Date.now(),
    })
  }

  async getEmployeeByPin(pin: string): Promise<OfflineEmployee | undefined> {
    return await this.employees.where('pin').equals(pin).first()
  }

  async getEmployee(id: string): Promise<OfflineEmployee | undefined> {
    return await this.employees.get(id)
  }

  async getAllCachedEmployees(): Promise<OfflineEmployee[]> {
    return await this.employees.toArray()
  }

  async debugEmployeeCache(): Promise<void> {
    const employees = await this.getAllCachedEmployees()
  }

  async getCachedEmployeePins(): Promise<string[]> {
    const employees = await this.getAllCachedEmployees()
    return employees.map(emp => emp.pin).sort()
  }

  async updateEmployeePunches(employeeId: string, punches: OfflineEmployee['punches']): Promise<void> {
    await this.employees.update(employeeId, { punches })
  }

  // Punch methods
  async savePunch(punch: OfflinePunch): Promise<void> {
    await this.punches.add(punch)
    
    // Also add to sync queue if not synced
    if (punch.synced === 0) {
      await this.addToSyncQueue({
        id: `punch-${punch.id}`,
        type: 'punch',
        data: punch,
        createdAt: Date.now(),
        attempts: 0,
      })
    }
  }

  async getPunchesForEmployee(employeeId: string): Promise<OfflinePunch[]> {
    return await this.punches.where('employeeId').equals(employeeId).toArray()
  }

  async getUnsyncedPunches(): Promise<OfflinePunch[]> {
    // Only return punches that haven't exceeded max retry attempts (5 attempts)
    return await this.punches.where('synced').equals(0).and(p => (p.syncAttempts || 0) < 5).toArray()
  }

  async getAllUnsyncedPunches(): Promise<OfflinePunch[]> {
    // Get all unsynced punches regardless of retry count
    return await this.punches.where('synced').equals(0).toArray()
  }

  async getPunchesForDate(date: string): Promise<OfflinePunch[]> {
    return await this.punches.where('date').equals(date).toArray()
  }

  async hasClockInForDate(employeeId: string, date: string): Promise<boolean> {
    const clockInPunch = await this.punches
      .where('employeeId').equals(employeeId)
      .and(p => p.date === date && p.type === 'in')
      .first()
    return !!clockInPunch
  }

  async debugPunchesForEmployee(employeeId: string): Promise<void> {
    const punches = await this.punches.where('employeeId').equals(employeeId).toArray()
  }

  async markPunchSynced(punchId: string): Promise<void> {
    await this.punches.update(punchId, { synced: 1 })
    await this.removeFromSyncQueue(`punch-${punchId}`)
  }

  async incrementSyncAttempts(punchId: string): Promise<void> {
    const punch = await this.punches.get(punchId)
    if (punch) {
      await this.punches.update(punchId, { 
        syncAttempts: (punch.syncAttempts || 0) + 1,
        lastSyncAttempt: Date.now()
      })
    }
  }

  // Sync queue methods
  async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    await this.syncQueue.put(item)
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.syncQueue.orderBy('createdAt').toArray()
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    await this.syncQueue.delete(id)
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    await this.syncQueue.update(id, updates)
  }

  // Location methods
  async cacheLocations(locations: OfflineLocation[]): Promise<void> {
    const locationsWithTimestamp = locations.map(loc => ({
      ...loc,
      cachedAt: Date.now(),
    }))
    await this.locations.bulkPut(locationsWithTimestamp)
  }

  async getCachedLocations(): Promise<OfflineLocation[]> {
    return await this.locations.toArray()
  }

  // Device settings methods
  async saveDeviceSettings(settings: DeviceSettings): Promise<void> {
    await this.deviceSettings.put(settings)
  }

  async getDeviceSettings(deviceId: string): Promise<DeviceSettings | undefined> {
    return await this.deviceSettings.where('deviceId').equals(deviceId).first()
  }

  async updateDeviceLastSync(deviceId: string): Promise<void> {
    await this.deviceSettings.where('deviceId').equals(deviceId).modify({
      lastSync: Date.now()
    })
  }

  // Device authorization cache methods
  async cacheDeviceAuth(deviceId: string, authorized: boolean, deviceInfo?: any): Promise<void> {
    const now = Date.now()
    const cache: DeviceAuthCache = {
      deviceId,
      authorized,
      deviceInfo,
      cachedAt: now,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7 days (matches employee cache)
    }
    await this.deviceAuthCache.put(cache)
  }

  async getCachedDeviceAuth(deviceId: string): Promise<DeviceAuthCache | undefined> {
    const cache = await this.deviceAuthCache.get(deviceId)
    
    // Check if cache is expired
    if (cache && cache.expiresAt < Date.now()) {
      await this.deviceAuthCache.delete(deviceId)
      return undefined
    }
    
    return cache
  }

  async clearDeviceAuthCache(deviceId?: string): Promise<void> {
    if (deviceId) {
      await this.deviceAuthCache.delete(deviceId)
    } else {
      await this.deviceAuthCache.clear()
    }
  }

  // Cleanup methods
  async clearExpiredCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge
    
    // Clear old employees
    await this.employees.where('cachedAt').below(cutoff).delete()
    
    // Clear old synced punches
    await this.punches.where('createdAt').below(cutoff).and(p => p.synced === 1).delete()
    
    // Clear old locations
    await this.locations.where('cachedAt').below(cutoff).delete()
    
    // Clear expired device auth cache
    await this.deviceAuthCache.where('expiresAt').below(Date.now()).delete()
  }

  async clearAllData(): Promise<void> {
    await this.employees.clear()
    await this.punches.clear()
    await this.syncQueue.clear()
    await this.locations.clear()
    await this.deviceAuthCache.clear()
  }
}

// Create singleton instance
export const offlineDB = new OfflineDatabase()

// Initialize database and setup cleanup
if (typeof window !== 'undefined') {
  // Clean up expired cache on startup
  offlineDB.clearExpiredCache().catch(console.error)
  
  // Setup periodic cleanup (every hour)
  setInterval(() => {
    offlineDB.clearExpiredCache().catch(console.error)
  }, 60 * 60 * 1000)
}