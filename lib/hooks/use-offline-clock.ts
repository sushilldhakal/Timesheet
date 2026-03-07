import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, set, keys, del } from 'idb-keyval'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import React from 'react'

// Types for offline punch data
export type PunchType = "in" | "break" | "endBreak" | "out"

export type OfflinePunch = {
  id: string
  employeeId: string
  type: PunchType
  timestamp: string
  date: string
  time: string
  imageUrl?: string
  lat?: string
  lng?: string
  noPhoto?: boolean
  synced: number // 0 = false, 1 = true
  createdAt: number
}

// Keys for IndexedDB storage
const OFFLINE_PUNCHES_KEY = 'offline-punches'
const SYNC_QUEUE_KEY = 'sync-queue'

// Helper functions for offline storage
export const offlineStorage = {
  // Get all offline punches
  async getOfflinePunches(): Promise<OfflinePunch[]> {
    try {
      const punches = await get(OFFLINE_PUNCHES_KEY)
      return punches || []
    } catch (error) {
      console.error('Error getting offline punches:', error)
      return []
    }
  },

  // Save punch offline
  async savePunchOffline(punch: OfflinePunch): Promise<void> {
    try {
      const existingPunches = await this.getOfflinePunches()
      const updatedPunches = [...existingPunches, punch]
      await set(OFFLINE_PUNCHES_KEY, updatedPunches)
      
      // Also add to sync queue
      await this.addToSyncQueue(punch)
    } catch (error) {
      console.error('Error saving punch offline:', error)
      throw error
    }
  },

  // Add punch to sync queue
  async addToSyncQueue(punch: OfflinePunch): Promise<void> {
    try {
      const queue = await get(SYNC_QUEUE_KEY) || []
      queue.push(punch)
      await set(SYNC_QUEUE_KEY, queue)
    } catch (error) {
      console.error('Error adding to sync queue:', error)
    }
  },

  // Get sync queue
  async getSyncQueue(): Promise<OfflinePunch[]> {
    try {
      return await get(SYNC_QUEUE_KEY) || []
    } catch (error) {
      console.error('Error getting sync queue:', error)
      return []
    }
  },

  // Remove from sync queue
  async removeFromSyncQueue(punchId: string): Promise<void> {
    try {
      const queue = await this.getSyncQueue()
      const updatedQueue = queue.filter(p => p.id !== punchId)
      await set(SYNC_QUEUE_KEY, updatedQueue)
    } catch (error) {
      console.error('Error removing from sync queue:', error)
    }
  },

  // Mark punch as synced
  async markPunchSynced(punchId: string): Promise<void> {
    try {
      const punches = await this.getOfflinePunches()
      const updatedPunches = punches.map(p => 
        p.id === punchId ? { ...p, synced: 1 } : p
      )
      await set(OFFLINE_PUNCHES_KEY, updatedPunches)
      await this.removeFromSyncQueue(punchId)
    } catch (error) {
      console.error('Error marking punch as synced:', error)
    }
  },

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    try {
      await del(OFFLINE_PUNCHES_KEY)
      await del(SYNC_QUEUE_KEY)
    } catch (error) {
      console.error('Error clearing offline data:', error)
    }
  }
}

// Check if online
export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Hook for offline clock operations
export function useOfflineClock(employeeId: string) {
  const queryClient = useQueryClient()

  // Query for offline punches
  const { data: offlinePunches = [] } = useQuery({
    queryKey: ['offline-punches', employeeId],
    queryFn: () => offlineStorage.getOfflinePunches(),
    refetchInterval: 5000, // Check every 5 seconds
  })

  // Query for sync queue
  const { data: syncQueue = [] } = useQuery({
    queryKey: ['sync-queue'],
    queryFn: () => offlineStorage.getSyncQueue(),
    refetchInterval: 10000, // Check every 10 seconds
  })

  // Mutation for creating offline punch
  const createOfflinePunch = useMutation({
    mutationFn: async (punchData: {
      type: PunchType
      imageUrl?: string
      lat?: string
      lng?: string
      noPhoto?: boolean
    }) => {
      const now = new Date()
      const punch: OfflinePunch = {
        id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        type: punchData.type,
        timestamp: now.toISOString(),
        date: format(now, "dd-MM-yyyy", { locale: enUS }),
        time: format(now, "EEEE, MMMM d, yyyy h:mm:ss a", { locale: enUS }),
        imageUrl: punchData.imageUrl,
        lat: punchData.lat,
        lng: punchData.lng,
        noPhoto: punchData.noPhoto,
        synced: 0,
        createdAt: Date.now(),
      }

      await offlineStorage.savePunchOffline(punch)
      return punch
    },
    onSuccess: () => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['offline-punches'] })
      queryClient.invalidateQueries({ queryKey: ['sync-queue'] })
    },
  })

  // Mutation for syncing punches to server
  const syncPunches = useMutation({
    mutationFn: async () => {
      const queue = await offlineStorage.getSyncQueue()
      const results = []

      for (const punch of queue) {
        try {
          const response = await fetch('/api/employee/clock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: punch.type,
              imageUrl: punch.imageUrl,
              date: punch.date,
              time: punch.time,
              lat: punch.lat,
              lng: punch.lng,
              noPhoto: punch.noPhoto,
              // Add offline flag to indicate this was an offline punch
              offline: true,
              offlineTimestamp: punch.timestamp,
            }),
          })

          if (response.ok) {
            await offlineStorage.markPunchSynced(punch.id)
            results.push({ punch, success: true })
          } else {
            results.push({ punch, success: false, error: await response.text() })
          }
        } catch (error) {
          results.push({ punch, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        }
      }

      return results
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['offline-punches'] })
      queryClient.invalidateQueries({ queryKey: ['sync-queue'] })
    },
  })

  // Auto-sync when online
  const { data: onlineStatus } = useQuery({
    queryKey: ['online-status'],
    queryFn: () => isOnline(),
    refetchInterval: 5000,
  })

  // Effect to auto-sync when coming back online
  React.useEffect(() => {
    if (onlineStatus && syncQueue.length > 0) {
      syncPunches.mutate()
    }
  }, [onlineStatus, syncQueue.length])

  return {
    // Data
    offlinePunches,
    syncQueue,
    isOnline: onlineStatus,
    
    // Mutations
    createOfflinePunch,
    syncPunches,
    
    // Utilities
    offlineStorage,
  }
}