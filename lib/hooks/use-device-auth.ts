"use client"

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/utils/logger'
import { getOrCreateDeviceId, updateDeviceInfo } from '@/lib/utils/storage/device-storage'
import { offlineDB } from '@/lib/db/offline-db'

interface DeviceInfo {
  id: string
  deviceId: string
  deviceName: string
  locationName: string
  lastActivity: string
}

interface DeviceAuthState {
  isChecking: boolean
  isAuthorized: boolean | null
  deviceInfo: DeviceInfo | null
  error: string | null
  needsActivation: boolean
}

export function useDeviceAuth() {
  const [state, setState] = useState<DeviceAuthState>({
    isChecking: true,
    isAuthorized: null,
    deviceInfo: null,
    error: null,
    needsActivation: false,
  })
  const [deviceId, setDeviceId] = useState<string>('')

  // Initialize device ID
  useEffect(() => {
    const initDeviceId = async () => {
      try {
        const id = await getOrCreateDeviceId()
        setDeviceId(id)
        logger.log('[DeviceAuth] Device ID initialized:', id)
      } catch (error) {
        logger.error('[DeviceAuth] Failed to initialize device ID:', error)
        // Set a fallback ID
        setDeviceId(`fallback_${Date.now()}`)
      }
    }
    
    initDeviceId()
  }, [])

  const checkDeviceAuth = useCallback(async () => {
    if (!deviceId) return // Wait for device ID to be initialized
    
    setState(prev => ({ ...prev, isChecking: true, error: null }))
    
    try {
      // First, try to get cached authorization (for offline support)
      const cachedAuth = await offlineDB.getCachedDeviceAuth(deviceId)
      
      if (cachedAuth) {
        logger.log('[DeviceAuth] Using cached authorization:', cachedAuth.authorized)
        
        if (cachedAuth.authorized) {
          setState({
            isChecking: false,
            isAuthorized: true,
            deviceInfo: cachedAuth.deviceInfo || null,
            error: null,
            needsActivation: false,
          })
          
          // Try to refresh in background if online
          if (navigator.onLine) {
            refreshAuthInBackground()
          }
          return
        }
      }
      
      // If no valid cache or not authorized, try online check
      const response = await fetch('/api/devices/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
      
      const data = await response.json()
      
      if (data.authorized) {
        // Cache the successful authorization
        await offlineDB.cacheDeviceAuth(deviceId, true, data.device)
        
        setState({
          isChecking: false,
          isAuthorized: true,
          deviceInfo: data.device,
          error: null,
          needsActivation: false,
        })
        logger.log('[DeviceAuth] Device authorized (online):', data.device.deviceName)
      } else {
        // Cache the failed authorization (but with shorter expiry)
        await offlineDB.cacheDeviceAuth(deviceId, false)
        
        setState({
          isChecking: false,
          isAuthorized: false,
          deviceInfo: null,
          error: data.error || 'Device not authorized',
          needsActivation: true,
        })
        logger.warn('[DeviceAuth] Device not authorized:', data.reason)
      }
    } catch (error) {
      logger.error('[DeviceAuth] Online check failed:', error)
      
      // If online check fails, try cached authorization as fallback
      const cachedAuth = await offlineDB.getCachedDeviceAuth(deviceId)
      
      if (cachedAuth && cachedAuth.authorized) {
        logger.log('[DeviceAuth] Using cached authorization due to network error')
        setState({
          isChecking: false,
          isAuthorized: true,
          deviceInfo: cachedAuth.deviceInfo || null,
          error: null,
          needsActivation: false,
        })
      } else {
        setState({
          isChecking: false,
          isAuthorized: false,
          deviceInfo: null,
          error: 'Failed to check device authorization (offline)',
          needsActivation: false,
        })
      }
    }
  }, [deviceId])

  // Background refresh for cached authorization
  const refreshAuthInBackground = useCallback(async () => {
    if (!deviceId || !navigator.onLine) return
    
    try {
      const response = await fetch('/api/devices/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
      
      const data = await response.json()
      
      // Update cache with fresh data
      await offlineDB.cacheDeviceAuth(deviceId, data.authorized, data.device)
      
      logger.log('[DeviceAuth] Background refresh completed:', data.authorized)
    } catch (error) {
      logger.warn('[DeviceAuth] Background refresh failed:', error)
    }
  }, [deviceId])

  const activateDevice = useCallback(async (activationCode: string) => {
    if (!deviceId) return { success: false, error: 'Device ID not initialized' }
    
    setState(prev => ({ ...prev, isChecking: true, error: null }))
    
    try {
      const response = await fetch('/api/devices/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, activationCode }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Update device info in local storage
        await updateDeviceInfo(
          deviceId, 
          data.device.deviceName, 
          data.device.locationName
        )
        
        // Cache the successful authorization
        await offlineDB.cacheDeviceAuth(deviceId, true, data.device)
        
        setState({
          isChecking: false,
          isAuthorized: true,
          deviceInfo: data.device,
          error: null,
          needsActivation: false,
        })
        logger.log('[DeviceAuth] Device activated and cached:', data.device.deviceName)
        return { success: true }
      } else {
        setState(prev => ({
          ...prev,
          isChecking: false,
          error: data.error || 'Activation failed',
        }))
        return { success: false, error: data.error }
      }
    } catch (error) {
      const errorMessage = 'Failed to activate device'
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage,
      }))
      logger.error('[DeviceAuth] Activation failed:', error)
      return { success: false, error: errorMessage }
    }
  }, [deviceId])

  // Check device auth when device ID is ready
  useEffect(() => {
    if (deviceId) {
      checkDeviceAuth()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]) // Only re-run when deviceId changes, not when checkDeviceAuth changes

  return {
    ...state,
    deviceId,
    checkDeviceAuth,
    activateDevice,
  }
}