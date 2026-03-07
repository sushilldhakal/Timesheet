"use client"

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { offlineDB, OfflineEmployee } from '@/lib/db/offline-db'
import { toast } from "sonner"
import { logger } from '@/lib/utils/logger'

export function useOfflinePinValidation() {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "verifying" | "error" | "success">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

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

  // Sync offline punches when online
  const syncOfflinePunches = useCallback(async () => {
    if (!isOnline) {
      logger.warn('[PinValidation] Cannot sync - device is offline')
      return 0
    }

    logger.log('[PinValidation] Starting sync process...')
    const unsynced = await offlineDB.getUnsyncedPunches()
    
    if (unsynced.length === 0) {
      logger.log('[PinValidation] No unsynced punches found')
      return 0
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
    
    logger.log(`[PinValidation] Found ${sortedPunches.length} unsynced punches, syncing in chronological order`)
    
    // Debug: Log all punches to understand the sync order
    logger.log(`[PinValidation] Punch sync order:`)
    sortedPunches.forEach((punch, index) => {
      logger.log(`  ${index + 1}. ${punch.id} - ${punch.type} - ${punch.date} ${punch.time} (${punch.timestamp})`)
    })
    
    let syncedCount = 0
    
    for (const punch of sortedPunches) {
      try {
        logger.log(`[PinValidation] Syncing punch: ${punch.id} (${punch.type})`)
        
        // Get the original employee data for this punch
        const originalEmployee = await offlineDB.getEmployee(punch.employeeId)
        if (!originalEmployee) {
          logger.error(`[PinValidation] ❌ Cannot find employee data for punch ${punch.id}`)
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
              logger.warn(`[PinValidation] ⚠️ No local clock-in found for ${punch.type} punch ${punch.id} on ${punch.date}`)
              logger.warn(`[PinValidation] Attempting sync anyway - server may have the clock-in record`)
              // Continue with sync attempt - the server might have the clock-in record
              // If it fails, we'll handle it in the error response
            } else {
              logger.log(`[PinValidation] Found synced clock-in for ${punch.date}, proceeding with ${punch.type} sync`)
            }
          } else {
            logger.log(`[PinValidation] Found unsynced clock-in in batch for ${punch.date}, proceeding with ${punch.type} sync`)
          }
        }
        
        logger.log(`[PinValidation] Syncing punch for employee ${originalEmployee.name} (PIN: ${originalEmployee.pin})`)
        
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
          logger.log(`[PinValidation] ✅ Synced punch: ${punch.id}`)
          
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
              logger.log(`[PinValidation] ✅ Cached employee ${employeeData.name} during sync`)
            }
          } catch (cacheError) {
            logger.warn("[PinValidation] Failed to cache employee data during sync:", cacheError)
          }
        } else {
          const errorText = await response.text()
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText }
          }
          
          logger.error(`[PinValidation] ❌ Failed to sync punch ${punch.id} (${punch.type}): ${response.status} ${JSON.stringify(errorData)}`)
          
          // If it's a business logic error (like "no clock-in found"), mark as failed but continue
          if (response.status === 400) {
            logger.warn(`[PinValidation] Business logic error for punch ${punch.id} - will retry later`)
            
            // Special handling for "No clock-in found" errors
            if (errorData.error && errorData.error.includes("No clock-in found")) {
              logger.warn(`[PinValidation] 🔍 Clock-in missing for ${punch.type} punch on ${punch.date}`)
              
              // Check if we have any clock-in punches for this employee on this date
              const allPunchesForDate = await offlineDB.getPunchesForDate(punch.date)
              const clockInPunches = allPunchesForDate.filter(p => 
                p.employeeId === punch.employeeId && p.type === 'in'
              )
              
              if (clockInPunches.length === 0) {
                logger.error(`[PinValidation] ❌ No clock-in punch found in offline DB for ${punch.date}`)
                logger.error(`[PinValidation] This ${punch.type} punch cannot be synced without a clock-in`)
                // Mark this punch as having too many attempts to prevent infinite retries
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id)
                await offlineDB.incrementSyncAttempts(punch.id) // 5 attempts = max
              } else {
                logger.log(`[PinValidation] Found ${clockInPunches.length} clock-in punch(es) in offline DB, will retry later`)
                await offlineDB.incrementSyncAttempts(punch.id)
              }
            } else {
              // Other business logic errors
              await offlineDB.incrementSyncAttempts(punch.id)
            }
          }
        }
      } catch (error) {
        logger.error(`[PinValidation] ❌ Sync error for punch ${punch.id}:`, error)
      }
    }

    if (syncedCount > 0) {
      logger.log(`[PinValidation] ✅ Successfully synced ${syncedCount} offline punches`)
      toast.success(`Synced ${syncedCount} offline punch${syncedCount > 1 ? 'es' : ''} - All offline data uploaded to server`)
    } else if (unsynced.length > 0) {
      logger.warn(`[PinValidation] ⚠️ No punches were synced (${unsynced.length} failed)`)
    }

    return syncedCount
  }, [isOnline])

  const verifyPin = useCallback(async (
    enteredPin: string, 
    userLocation?: { lat: number; lng: number }
  ) => {
    setStatus("verifying")
    setErrorMessage("")

    try {
      let employee: OfflineEmployee | null = null
      let punches = null
      let isBirthday = false
      let detectedLocation = ""
      let geofenceWarning = false

      if (isOnline) {
        // Try online first
        try {
          const payload: { pin: string; lat?: number; lng?: number } = { pin: enteredPin }
          
          if (userLocation) {
            payload.lat = userLocation.lat
            payload.lng = userLocation.lng
          }

          const res = await fetch("/api/employee/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          
          const data = await res.json()

          if (res.ok) {
            // Cache employee data for offline use
            const employeeData: OfflineEmployee = {
              id: data.employee.id,
              pin: enteredPin,
              name: data.employee.name,
              role: data.employee.role,
              location: data.employee.location,
              detectedLocation: data.detectedLocation,
              isBirthday: data.isBirthday ?? false,
              lastLogin: Date.now(),
              punches: data.punches ?? { clockIn: "", breakIn: "", breakOut: "", clockOut: "" },
              cachedAt: Date.now(),
            }

            await offlineDB.cacheEmployee(employeeData)

            employee = employeeData
            punches = data.punches
            isBirthday = data.isBirthday ?? false
            detectedLocation = data.detectedLocation
            geofenceWarning = data.geofenceWarning

          } else if (res.status === 403 && data.geofenceViolation) {
            // Handle geofence violation
            setStatus("error")
            setErrorMessage(data.error)
            toast.error(data.error)
            setTimeout(() => {
              setStatus("idle")
              setErrorMessage("")
            }, 4000)
            return
          } else {
            throw new Error(data.error ?? "Invalid PIN")
          }
        } catch (onlineError) {
          console.warn("Online PIN validation failed, trying offline:", onlineError)
          // Fall back to offline validation
        }
      }

      // If online failed or we're offline, try offline validation
      if (!employee) {
        // Debug: Check all cached employees
        await offlineDB.debugEmployeeCache()
        
        const cachedEmployee = await offlineDB.getEmployeeByPin(enteredPin)
        logger.log(`[PinValidation] Looking for PIN ${enteredPin}, found:`, cachedEmployee ? { pin: cachedEmployee.pin, name: cachedEmployee.name } : 'not found')
        
        if (cachedEmployee) {
          // Check if cache is not too old (7 days instead of 24 hours)
          const cacheAge = Date.now() - cachedEmployee.cachedAt
          const maxCacheAge = 7 * 24 * 60 * 60 * 1000 // 7 days
          
          if (cacheAge < maxCacheAge) {
            employee = cachedEmployee
            punches = cachedEmployee.punches
            isBirthday = cachedEmployee.isBirthday ?? false
            detectedLocation = cachedEmployee.detectedLocation ?? (isOnline ? "Location Unknown" : "Offline Mode")
            
            // Show offline mode notification
            toast.warning("Offline Mode - Using cached employee data. Will sync when online.")
          } else {
            throw new Error("Employee data expired. Please connect to internet to refresh your login.")
          }
        } else {
          throw new Error("PIN not recognized on this device. Please connect to internet or contact IT support.")
        }
      }

      if (!employee) {
        throw new Error("Invalid PIN. Please try again.")
      }

      // Store session data
      try {
        // Ensure we have location data - use cached location if userLocation is missing
        let locationToStore = userLocation
        if (!locationToStore && employee.location) {
          // Try to use a default location based on employee's assigned location
          // This is a fallback for offline mode
          locationToStore = { lat: -37.8136, lng: 144.9631 } // Melbourne CBD as fallback
          logger.log(`[PinValidation] Using fallback location for offline mode`)
        } else if (!locationToStore) {
          locationToStore = { lat: 0, lng: 0 } // Last resort fallback
        }
        
        const sessionData = {
          employee: {
            id: employee.id,
            name: employee.name,
            pin: employee.pin,
            role: employee.role,
          },
          punches: punches ?? { clockIn: "", breakIn: "", breakOut: "", clockOut: "" },
          location: locationToStore, // Store the GPS coordinates
          isBirthday: isBirthday,
          detectedLocation: detectedLocation || (isOnline ? "Location Unknown" : "Offline Mode"),
          offline: !isOnline, // Flag to indicate offline mode
        }
        
        logger.log(`[PinValidation] Storing session data:`, { 
          employeeName: sessionData.employee.name, 
          hasLocation: !!sessionData.location,
          location: sessionData.location,
          offline: sessionData.offline 
        })
        
        sessionStorage.setItem("clock_employee", JSON.stringify(sessionData))
        
        // Create server-side session cookie for middleware authentication
        // This is needed so the middleware allows access to /clock route
        if (!isOnline) {
          logger.log(`[PinValidation] Creating offline employee session cookie`)
          try {
            const response = await fetch('/api/employee/offline-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employeeId: employee.id,
                pin: employee.pin,
                offline: true
              })
            })
            
            if (!response.ok) {
              logger.warn(`[PinValidation] Failed to create offline session cookie: ${response.status}`)
              const errorText = await response.text()
              logger.error(`[PinValidation] Offline session error: ${errorText}`)
              throw new Error("Failed to create offline session")
            } else {
              const responseData = await response.json()
              logger.log(`[PinValidation] ✅ Offline session cookie created:`, responseData)
              // Wait a bit for the cookie to be set and propagated
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          } catch (sessionError) {
            logger.error(`[PinValidation] Error creating offline session:`, sessionError)
            throw new Error("Failed to create offline session")
          }
        }
      } catch (storageError) {
        console.warn("Failed to store session data:", storageError)
        logger.error("[PinValidation] Session storage failed:", storageError)
      }
      
      // Show warning toast if outside geofence but soft mode enabled
      if (geofenceWarning) {
        toast.warning("Location Warning - You are outside the designated work location. Your manager will be notified.")
      }
      
      // Sync offline punches if we're online and have any
      if (isOnline) {
        try {
          const syncedCount = await syncOfflinePunches()
          if (syncedCount > 0) {
            logger.log(`[PinValidation] Successfully synced ${syncedCount} offline punches during login`)
          }
        } catch (syncError) {
          logger.error('[PinValidation] Failed to sync offline punches during login:', syncError)
          // Don't block login if sync fails
        }
      }
      
      // Show success state for 1.5 seconds before navigating
      setStatus("success")
      logger.log(`[PinValidation] Setting success status, will navigate to /clock in 1.5s`)
      
      setTimeout(() => {
        logger.log(`[PinValidation] Navigating to /clock (client-side)`)
        // Use client-side navigation to avoid full page reload
        router.replace("/clock")
        
        // Reset status after navigation attempt in case it fails
        setTimeout(() => {
          setStatus("idle")
        }, 500)
      }, 1500)

    } catch (error) {
      setStatus("error")
      const message = error instanceof Error ? error.message : "Network error. Please try again."
      setErrorMessage(message)
      
      setTimeout(() => {
        setStatus("idle")
        setErrorMessage("")
      }, 800)
    }
  }, [router, isOnline, syncOfflinePunches])

  return {
    status,
    errorMessage,
    isOnline,
    verifyPin,
  }
}