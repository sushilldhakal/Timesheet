"use client"

import { useEffect, useState } from 'react'
import { useOfflineClock, PunchType } from '@/lib/hooks/use-offline-clock'
import { toast } from 'sonner'
import { Wifi, WifiOff, Upload, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { clockAction } from '@/lib/api/employee-clock'

type OfflineClockHandlerProps = {
  employeeId: string
  onPunchSuccess?: (type: PunchType) => void
  onPunchError?: (error: string) => void
}

export function OfflineClockHandler({ 
  employeeId, 
  onPunchSuccess, 
  onPunchError 
}: OfflineClockHandlerProps) {
  const {
    offlinePunches,
    syncQueue,
    isOnline,
    createOfflinePunch,
    syncPunches,
  } = useOfflineClock(employeeId)

  const [showOfflineStatus, setShowOfflineStatus] = useState(false)

  // Show offline status when going offline
  useEffect(() => {
    if (isOnline === false) {
      setShowOfflineStatus(true)
      toast.info('You are offline. Punches will be saved locally and synced when online.', {
        duration: 5000,
        icon: <WifiOff className="h-4 w-4" />,
      })
    } else if (isOnline === true && showOfflineStatus) {
      setShowOfflineStatus(false)
      toast.success('You are back online. Syncing offline punches...', {
        duration: 3000,
        icon: <Wifi className="h-4 w-4" />,
      })
    }
  }, [isOnline, showOfflineStatus])

  // Handle punch creation (works both online and offline)
  const handlePunch = async (punchData: {
    type: PunchType
    imageUrl?: string
    lat?: string
    lng?: string
    noPhoto?: boolean
  }) => {
    try {
      if (isOnline) {
        // Try online first
        await clockAction({
          type: punchData.type === 'in' ? 'in' : 'out',
          imageUrl: punchData.imageUrl,
          lat: punchData.lat,
          lng: punchData.lng,
          noPhoto: punchData.noPhoto,
        })

        onPunchSuccess?.(punchData.type)
        toast.success(`Successfully punched ${punchData.type}!`)
        return
      } else {
        throw new Error('Offline')
      }
    } catch (error) {
      // Save offline if online request fails or if offline
      try {
        await createOfflinePunch.mutateAsync(punchData)
        onPunchSuccess?.(punchData.type)
        toast.success(`Punch saved offline. Will sync when online.`, {
          icon: <Clock className="h-4 w-4" />,
        })
      } catch (offlineError) {
        const errorMessage = offlineError instanceof Error ? offlineError.message : 'Failed to save punch'
        onPunchError?.(errorMessage)
        toast.error(`Failed to save punch: ${errorMessage}`)
      }
    }
  }

  // Manual sync button
  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline')
      return
    }

    if (syncQueue.length === 0) {
      toast.info('No offline punches to sync')
      return
    }

    try {
      await syncPunches.mutateAsync()
      toast.success('Offline punches synced successfully!')
    } catch (error) {
      toast.error('Failed to sync offline punches')
    }
  }

  return (
    <div className="space-y-2">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400">Offline</span>
            </>
          )}
        </div>

        {/* Sync Status */}
        {syncQueue.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {syncQueue.length} pending
            </span>
            {isOnline && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={syncPunches.isPending}
                className="h-6 px-2 text-xs"
              >
                <Upload className="h-3 w-3 mr-1" />
                Sync
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Offline Punches Summary */}
      {offlinePunches.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded p-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {offlinePunches.filter(p => !p.synced).length} offline punches stored locally
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Export the punch handler function for use in the main clock component
export { useOfflineClock }
export type { PunchType }