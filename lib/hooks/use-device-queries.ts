/**
 * TanStack Query hooks for device management
 * Leverages existing query infrastructure with offline persistence
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrCreateDeviceId, getStorageInfo } from '@/lib/utils/storage/device-storage'
import { logger } from '@/lib/utils/logger'

// Query keys
export const deviceKeys = {
  all: ['devices'] as const,
  check: (deviceId: string) => [...deviceKeys.all, 'check', deviceId] as const,
  info: () => [...deviceKeys.all, 'info'] as const,
  storage: () => [...deviceKeys.all, 'storage'] as const,
}

// Device check query with offline support
export function useDeviceCheck(deviceId: string) {
  return useQuery({
    queryKey: deviceKeys.check(deviceId),
    queryFn: async () => {
      if (!deviceId) throw new Error('Device ID required')
      
      const response = await fetch('/api/devices/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Device check failed')
      }
      
      return data
    },
    enabled: !!deviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: (failureCount, error: any) => {
      // Don't retry if device is not authorized
      if (error?.message?.includes('not authorized')) {
        return false
      }
      return failureCount < 3
    },
  })
}

// Device activation mutation
export function useDeviceActivation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ deviceId, activationCode }: { deviceId: string; activationCode: string }) => {
      const response = await fetch('/api/devices/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, activationCode }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Activation failed')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate device check query
      queryClient.invalidateQueries({ queryKey: deviceKeys.check(variables.deviceId) })
      
      // Update cache with successful activation
      queryClient.setQueryData(deviceKeys.check(variables.deviceId), {
        authorized: true,
        device: data.device,
      })
      
      logger.log('[DeviceQueries] Device activation successful:', data.device.deviceName)
    },
    onError: (error) => {
      logger.error('[DeviceQueries] Device activation failed:', error)
    },
  })
}

// Device ID query with IndexedDB persistence
export function useDeviceId() {
  return useQuery({
    queryKey: deviceKeys.info(),
    queryFn: getOrCreateDeviceId,
    staleTime: Infinity, // Device ID never goes stale
    gcTime: Infinity, // Keep in cache forever
    retry: 3,
  })
}

// Storage info query for debugging
export function useStorageInfo() {
  return useQuery({
    queryKey: deviceKeys.storage(),
    queryFn: getStorageInfo,
    staleTime: 30 * 1000, // 30 seconds
    enabled: process.env.NODE_ENV === 'development', // Only in development
  })
}

// Combined device auth hook using TanStack Query
export function useDeviceAuthQuery() {
  const { data: deviceId, isLoading: deviceIdLoading } = useDeviceId()
  const { 
    data: checkResult, 
    isLoading: checkLoading, 
    error: checkError,
    refetch: recheckDevice 
  } = useDeviceCheck(deviceId || '')
  
  const activationMutation = useDeviceActivation()
  
  const isLoading = deviceIdLoading || checkLoading
  const isAuthorized = checkResult?.authorized || false
  const deviceInfo = checkResult?.device || null
  const needsActivation = !isAuthorized && !checkLoading && !checkError
  const error = checkError?.message || activationMutation.error?.message || null
  
  const activateDevice = async (activationCode: string) => {
    if (!deviceId) {
      throw new Error('Device ID not available')
    }
    
    try {
      await activationMutation.mutateAsync({ deviceId, activationCode })
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Activation failed' 
      }
    }
  }
  
  return {
    // State
    isLoading,
    isAuthorized,
    deviceInfo,
    needsActivation,
    error,
    deviceId: deviceId || '',
    
    // Actions
    activateDevice,
    recheckDevice,
    
    // Mutation state
    isActivating: activationMutation.isPending,
  }
}