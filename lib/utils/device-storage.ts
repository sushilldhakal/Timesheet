/**
 * Device ID Storage using existing Dexie database for iOS PWA persistence
 * 
 * Uses the existing offline database infrastructure with TanStack Query
 * IndexedDB is much more reliable than localStorage on iOS PWAs
 */

import { offlineDB } from '@/lib/db/offline-db'
import { logger } from '@/lib/utils/logger'

// Generate a new device ID
function generateDeviceId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `kiosk_${timestamp}_${random}`
}

// Get or create device ID using Dexie
export async function getOrCreateDeviceId(): Promise<string> {
  if (typeof window === 'undefined') {
    return '' // Server-side, return empty string
  }
  
  try {
    // Check if we have device settings in Dexie
    const allSettings = await offlineDB.deviceSettings.toArray()
    const existingSettings = allSettings[0] // Should only be one device per tablet
    
    if (existingSettings?.deviceId) {
      logger.log('[DeviceStorage] Retrieved device ID from Dexie:', existingSettings.deviceId)
      return existingSettings.deviceId
    }
    
    // Fallback: Check localStorage for migration
    const legacyDeviceId = localStorage.getItem('kiosk_device_id')
    if (legacyDeviceId) {
      logger.log('[DeviceStorage] Migrating device ID from localStorage to Dexie')
      
      // Save to Dexie
      await offlineDB.saveDeviceSettings({
        id: 'primary',
        deviceId: legacyDeviceId,
        lastSync: Date.now(),
        createdAt: Date.now(),
      })
      
      // Clean up localStorage
      try {
        localStorage.removeItem('kiosk_device_id')
      } catch (e) {
        logger.warn('[DeviceStorage] Could not remove legacy localStorage item')
      }
      
      return legacyDeviceId
    }
    
    // Generate new device ID
    const newDeviceId = generateDeviceId()
    
    // Save to Dexie
    await offlineDB.saveDeviceSettings({
      id: 'primary',
      deviceId: newDeviceId,
      lastSync: Date.now(),
      createdAt: Date.now(),
    })
    
    logger.log('[DeviceStorage] Generated and saved new device ID:', newDeviceId)
    return newDeviceId
    
  } catch (error) {
    logger.error('[DeviceStorage] Error in getOrCreateDeviceId:', error)
    
    // Ultimate fallback: use localStorage (better than nothing)
    logger.warn('[DeviceStorage] Falling back to localStorage due to Dexie error')
    const fallbackId = localStorage.getItem('kiosk_device_id') || generateDeviceId()
    
    try {
      localStorage.setItem('kiosk_device_id', fallbackId)
    } catch (e) {
      logger.error('[DeviceStorage] Even localStorage failed:', e)
    }
    
    return fallbackId
  }
}

// Update device info when activated
export async function updateDeviceInfo(deviceId: string, deviceName?: string, locationName?: string): Promise<void> {
  try {
    const existing = await offlineDB.deviceSettings.where('deviceId').equals(deviceId).first()
    
    if (existing) {
      await offlineDB.deviceSettings.update(existing.id, {
        deviceName,
        locationName,
        lastSync: Date.now(),
      })
    } else {
      await offlineDB.saveDeviceSettings({
        id: 'primary',
        deviceId,
        deviceName,
        locationName,
        lastSync: Date.now(),
        createdAt: Date.now(),
      })
    }
    
    logger.log('[DeviceStorage] Updated device info in Dexie')
  } catch (error) {
    logger.error('[DeviceStorage] Error updating device info:', error)
  }
}

// Clear device ID (for testing/debugging)
export async function clearDeviceId(): Promise<void> {
  try {
    await offlineDB.deviceSettings.clear()
    logger.log('[DeviceStorage] Device settings cleared from Dexie')
    
    // Also clear localStorage fallback
    try {
      localStorage.removeItem('kiosk_device_id')
    } catch (e) {
      logger.warn('[DeviceStorage] Could not clear localStorage fallback')
    }
  } catch (error) {
    logger.error('[DeviceStorage] Error clearing device ID:', error)
    throw error
  }
}

// Get storage info for debugging
export async function getStorageInfo(): Promise<{
  dexieSupported: boolean
  dexieDeviceId: string | null
  localStorageDeviceId: string | null
  deviceSettings: any
}> {
  let dexieDeviceId: string | null = null
  let localStorageDeviceId: string | null = null
  let deviceSettings: any = null
  
  const dexieSupported = typeof window !== 'undefined' && 'indexedDB' in window
  
  if (dexieSupported) {
    try {
      const settings = await offlineDB.deviceSettings.toArray()
      deviceSettings = settings[0] || null
      dexieDeviceId = deviceSettings?.deviceId || null
    } catch (e) {
      logger.error('[DeviceStorage] Error checking Dexie:', e)
    }
  }
  
  if (typeof window !== 'undefined') {
    try {
      localStorageDeviceId = localStorage.getItem('kiosk_device_id')
    } catch (e) {
      logger.error('[DeviceStorage] Error checking localStorage:', e)
    }
  }
  
  return {
    dexieSupported,
    dexieDeviceId,
    localStorageDeviceId,
    deviceSettings,
  }
}