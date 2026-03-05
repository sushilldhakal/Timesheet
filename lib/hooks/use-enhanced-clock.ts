"use client"

import React, { useState, useCallback } from 'react'
import { offlineDB, OfflinePunch } from '@/lib/db/offline-db'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { logger } from '@/lib/utils/logger'

export type PunchType = 'in' | 'break' | 'endBreak' | 'out'

type EnhancedClockProps = {
  employeeId: string
  location: { lat: number; lng: number } | null
  getLatestBlob: () => Promise<Blob | null>
  resetFace: () => void
  noPhoto: boolean
  onSuccess?: (type: PunchType, message: string) => void
  onError?: (error: string) => void
  onSyncComplete?: (syncedCount: number) => void
}

export function useEnhancedClock({
  employeeId,
  location,
  getLatestBlob,
  resetFace,
  noPhoto,
  onSuccess,
  onError,
  onSyncComplete,
}: EnhancedClockProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [syncQueue, setSyncQueue] = useState<OfflinePunch[]>([])

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync function - defined early to avoid dependency issues
  const syncPunches = useCallback(async () => {
    if (!isOnline) {
      logger.warn('[EnhancedClock] Cannot sync - device is offline')
      return
    }

    logger.log('[EnhancedClock] Starting sync process...')
    const unsynced = await offlineDB.getUnsyncedPunches()
    
    if (unsynced.length === 0) {
      logger.log('[EnhancedClock] No unsynced punches found')
      return
    }
    
    // Debug: Show all punches for the employees involved
    const employeeIds = [...new Set(unsynced.map(p => p.employeeId))]
    for (const employeeId of employeeIds) {
      await offlineDB.debugPunchesForEmployee(employeeId)
    }
    
    // Sort punches by timestamp to ensure correct order (clock-in before break, etc.)
    // Also ensure that for the same timestamp, clock-in comes first
    const sortedPunches = unsynced.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      
      // First sort by timestamp
      if (timeA !== timeB) {
        return timeA - timeB
      }
      
      // If timestamps are the same, prioritize by punch type
      const typeOrder = { 'in': 1, 'break': 2, 'endBreak': 3, 'out': 4 }
      const orderA = typeOrder[a.type as keyof typeof typeOrder] || 5
      const orderB = typeOrder[b.type as keyof typeof typeOrder] || 5
      
      return orderA - orderB
    })
    
    logger.log(`[EnhancedClock] Found ${sortedPunches.length} unsynced punches, syncing in chronological order`)
    
    // Debug: Log all punches to understand the sync order
    logger.log(`[EnhancedClock] Punch sync order:`)
    sortedPunches.forEach((punch, index) => {
      logger.log(`  ${index + 1}. ${punch.id} - ${punch.type} - ${punch.date} ${punch.time} (${punch.timestamp})`)
    })
    
    let syncedCount = 0
    
    for (const punch of sortedPunches) {
      try {
        logger.log(`[EnhancedClock] Syncing punch: ${punch.id} (${punch.type})`)
        
        // Get the original employee data for this punch
        const originalEmployee = await offlineDB.getEmployee(punch.employeeId)
        if (!originalEmployee) {
          logger.error(`[EnhancedClock] ❌ Cannot find employee data for punch ${punch.id}`)
          continue
        }
        
        // Check if this is a clock-out/break punch without a corresponding clock-in
        if (punch.type === 'out' || punch.type === 'break' || punch.type === 'endBreak') {
          // First check if there's an unsynced clock-in for the same date in our sync batch
          const unsyncedClockIn = sortedPunches.find(p => 
            p.employeeId === punch.employeeId && 
            p.date === punch.date && 
            p.type === 'in'
          )
          
          if (!unsyncedClockIn) {
            // Check if there's already a synced clock-in for this date in our offline DB
            const allPunchesForDate = await offlineDB.getPunchesForDate(punch.date)
            const syncedClockIn = allPunchesForDate.find(p => 
              p.employeeId === punch.employeeId && 
              p.type === 'in' && 
              p.synced === 1
            )
            
            if (!syncedClockIn) {
              logger.warn(`[EnhancedClock] ⚠️ No local clock-in found for ${punch.type} punch ${punch.id} on ${punch.date}`)
              logger.warn(`[EnhancedClock] Attempting sync anyway - server may have the clock-in record`)
              // Continue with sync attempt - the server might have the clock-in record
              // If it fails, we'll handle it in the error response
            } else {
              logger.log(`[EnhancedClock] Found synced clock-in for ${punch.date}, proceeding with ${punch.type} sync`)
            }
          } else {
            logger.log(`[EnhancedClock] Found unsynced clock-in in batch for ${punch.date}, proceeding with ${punch.type} sync`)
          }
        }
        
        logger.log(`[EnhancedClock] Syncing punch for employee ${originalEmployee.name} (PIN: ${originalEmployee.pin})`)
        
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
            offline: true,
            offlineTimestamp: punch.timestamp,
            employeePin: originalEmployee.pin, // Include original employee's PIN
          }),
        })

        if (response.ok) {
          await offlineDB.markPunchSynced(punch.id)
          syncedCount++
          logger.log(`[EnhancedClock] ✅ Synced punch: ${punch.id}`)
          
          // Cache employee data if provided in sync response
          try {
            const syncData = await response.json()
            if (syncData.employee) {
              const employeeData = {
                id: syncData.employee.id,
                pin: syncData.employee.pin,
                name: syncData.employee.name,
                role: syncData.employee.role || "",
                location: syncData.employee.location || "",
                detectedLocation: syncData.detectedLocation || "",
                isBirthday: false,
                lastLogin: Date.now(),
                punches: { clockIn: "", breakIn: "", breakOut: "", clockOut: "" },
                cachedAt: Date.now(),
              }
              
              await offlineDB.cacheEmployee(employeeData)
              logger.log(`[EnhancedClock] ✅ Cached employee ${employeeData.name} during sync`)
            }
          } catch (cacheError) {
            logger.warn("[EnhancedClock] Failed to cache employee data during sync:", cacheError)
          }
        } else {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText }
          }
          
          logger.error(`[EnhancedClock] ❌ Failed to sync punch ${punch.id} (${punch.type}): ${response.status} ${JSON.stringify(errorData)}`)
          
          // If it's a business logic error (like "no clock-in found"), mark as failed but continue
          if (response.status === 400) {
            logger.warn(`[EnhancedClock] Business logic error for punch ${punch.id} - will retry later`)
            
            // Special handling for "No clock-in found" errors
            if (errorData.error && errorData.error.includes("No clock-in found")) {
              logger.warn(`[EnhancedClock] 🔍 Clock-in missing for ${punch.type} punch on ${punch.date}`)
              
              // Check if we have any clock-in punches for this employee on this date
              const allPunchesForDate = await offlineDB.getPunchesForDate(punch.date)
              const clockInPunches = allPunchesForDate.filter(p => 
                p.employeeId === punch.employeeId && p.type === 'in'
              )
              
              if (clockInPunches.length === 0) {
                logger.error(`[EnhancedClock] ❌ No clock-in punch found in offline DB for ${punch.date}`)
                logger.error(`[EnhancedClock] This ${punch.type} punch cannot be synced without a clock-in`)
                // Mark this punch as having too many attempts to prevent infinite retries
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id) // 5 attempts = max
              } else {
                logger.log(`[EnhancedClock] Found ${clockInPunches.length} clock-in punch(es) in offline DB, will retry later`)
                await offlineDB.incrementSyncAttempts(punch.id)
              }
            } else {
              // Other business logic errors
              await offlineDB.incrementSyncAttempts(punch.id)
            }
          }
        }
      } catch (error) {
        logger.error(`[EnhancedClock] ❌ Sync error for punch ${punch.id}:`, error)
      }
    }

    // Show success notification if any punches were synced
    if (syncedCount > 0) {
      onSyncComplete?.(syncedCount)
      logger.log(`[EnhancedClock] ✅ Successfully synced ${syncedCount} offline punches`)
    } else {
      logger.warn(`[EnhancedClock] ⚠️ No punches were synced (${unsynced.length} failed)`)
    }

    // Refresh sync queue
    const remaining = await offlineDB.getUnsyncedPunches()
    setSyncQueue(remaining)
    logger.log(`[EnhancedClock] Sync complete. ${remaining.length} punches remaining`)
  }, [isOnline, onSyncComplete])

  // Load sync queue and trigger sync if needed
  React.useEffect(() => {
    const loadSyncQueue = async () => {
      const unsynced = await offlineDB.getUnsyncedPunches()
      setSyncQueue(unsynced)
      
      // If we're online and have unsynced punches, trigger sync immediately
      if (isOnline && unsynced.length > 0) {
        logger.log(`[EnhancedClock] Found ${unsynced.length} unsynced punches, triggering sync`)
        setTimeout(() => syncPunches(), 1000) // Small delay to ensure everything is ready
      }
    }
    loadSyncQueue()
  }, [isOnline, syncPunches])

  // Auto-sync when coming back online
  React.useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      logger.log(`[EnhancedClock] Auto-sync triggered: ${syncQueue.length} punches`)
      syncPunches()
    }
  }, [isOnline, syncQueue.length, syncPunches])

  // Periodic sync every 30 seconds when online and has data
  React.useEffect(() => {
    if (!isOnline || syncQueue.length === 0) return

    const interval = setInterval(() => {
      logger.log('[EnhancedClock] Periodic sync check')
      syncPunches()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isOnline, syncQueue.length, syncPunches])

  const handleClockAction = useCallback(async (type: PunchType) => {
    setLoading(true)
    setSuccess(false)

    const now = new Date()
    const localDate = format(now, "dd-MM-yyyy", { locale: enUS })
    const localTime = format(now, "EEEE, MMMM d, yyyy h:mm:ss a", { locale: enUS })
    const latLng = location ? { lat: String(location.lat), lng: String(location.lng) } : null

    try {
      // Get face photo
      const blob = await getLatestBlob()
      resetFace()
      let imageUrl = ""

      // Try to upload image if we have one and are online
      if (blob && isOnline) {
        const formData = new FormData()
        formData.append("file", blob, "clock.jpg")
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        
        try {
          const uploadRes = await fetch("/api/employee/upload/image", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          })
          clearTimeout(timeout)

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            imageUrl = uploadData.url ?? ""
            
            if (!imageUrl) {
              logger.warn("[EnhancedClock] ⚠️ Upload succeeded but no URL returned")
            } else {
              logger.log("[EnhancedClock] ✅ Image uploaded:", imageUrl)
            }
          } else {
            const errorText = await uploadRes.text()
            logger.error("[EnhancedClock] ❌ Upload failed:", uploadRes.status, errorText)
          }
        } catch (err: unknown) {
          clearTimeout(timeout)
          // Only log upload errors if they're not timeout-related
          if (err instanceof Error && err.name === 'AbortError') {
            logger.warn("[EnhancedClock] Image upload timed out after 8s - continuing without photo")
          } else {
            logger.error("[EnhancedClock] ❌ Upload exception:", err)
          }
        }
      } else if (blob && !isOnline) {
        // Store blob locally for later upload when online
        // For now, we'll skip image upload when offline
        logger.warn("[EnhancedClock] Offline - skipping image upload")
      } else {
        logger.warn("[EnhancedClock] No blob available to upload")
      }

      // Prepare punch data
      const punchData = {
        type,
        imageUrl,
        date: localDate,
        time: localTime,
        lat: latLng?.lat,
        lng: latLng?.lng,
        noPhoto: noPhoto,
      }

      if (isOnline) {
        // Try online punch first
        try {
          const res = await fetch("/api/employee/clock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(punchData),
          })
          
          // Check if response is JSON
          const contentType = res.headers.get("content-type")
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Session expired - please log in again")
          }
          
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? "Failed")

          // Cache employee data for offline use if provided in response
          if (data.employee) {
            try {
              const employeeData = {
                id: data.employee.id,
                pin: data.employee.pin,
                name: data.employee.name,
                role: data.employee.role || "",
                location: data.employee.location || "",
                detectedLocation: data.detectedLocation || "",
                isBirthday: false, // We don't have birthday info in clock response
                lastLogin: Date.now(),
                punches: { clockIn: "", breakIn: "", breakOut: "", clockOut: "" }, // Will be updated by session
                cachedAt: Date.now(),
              }
              
              await offlineDB.cacheEmployee(employeeData)
              logger.log(`[EnhancedClock] ✅ Cached employee ${employeeData.name} (PIN: ${employeeData.pin}) for offline use`)
            } catch (cacheError) {
              logger.warn("[EnhancedClock] Failed to cache employee data:", cacheError)
              // Don't fail the punch if caching fails
            }
          }

          // Online success
          const labels: Record<string, string> = {
            in: "Clocked In",
            break: "On Break",
            endBreak: "Break End",
            out: "Clocked Out",
          }

          setLoading(false)
          setSuccess(true)
          
          const successMessage = `${labels[type]} at ${format(now, "h:mm:ss a", { locale: enUS })}`
          onSuccess?.(type, successMessage)
          
          return
        } catch (error) {
          // If online request fails, fall back to offline
          logger.warn("[EnhancedClock] Online punch failed, saving offline:", error)
        }
      }

      // Save offline (either because we're offline or online request failed)
      const offlinePunch: OfflinePunch = {
        id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        employeeId,
        type,
        timestamp: now.toISOString(),
        date: localDate,
        time: localTime,
        imageUrl,
        lat: latLng?.lat,
        lng: latLng?.lng,
        noPhoto: noPhoto,
        synced: 0, // 0 = false
        createdAt: Date.now(),
        offline: 1, // 1 = true
        syncAttempts: 0,
      }

      await offlineDB.savePunch(offlinePunch)

      // Update sync queue
      const remaining = await offlineDB.getUnsyncedPunches()
      setSyncQueue(remaining)

      // Offline success
      const labels: Record<string, string> = {
        in: "Clocked In (Offline)",
        break: "On Break (Offline)",
        endBreak: "Break End (Offline)",
        out: "Clocked Out (Offline)",
      }

      setLoading(false)
      setSuccess(true)
      
      const successMessage = `${labels[type]} at ${format(now, "h:mm:ss a", { locale: enUS })} - Will sync when online`
      onSuccess?.(type, successMessage)

    } catch (err) {
      setLoading(false)
      setSuccess(false)
      const errorMessage = err instanceof Error ? err.message : "Failed to save punch"
      onError?.(errorMessage)
    }
  }, [
    employeeId,
    location,
    getLatestBlob,
    resetFace,
    noPhoto,
    isOnline,
    onSuccess,
    onError,
    onSyncComplete,
  ])

  return {
    // State
    loading,
    success,
    
    // Offline data
    syncQueue,
    isOnline,
    
    // Actions
    handleClockAction,
    syncPunches,
    
    // Utilities
    pendingCount: syncQueue.length,
    hasOfflineData: syncQueue.length > 0,
  }
}