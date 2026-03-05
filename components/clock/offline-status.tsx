"use client"

import { Wifi, WifiOff, Upload, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineStatusProps {
  isOnline: boolean
  pendingCount: number
  hasOfflineData: boolean
  onSyncNow?: () => void
  className?: string
}

export function OfflineStatus({ 
  isOnline, 
  pendingCount, 
  hasOfflineData, 
  onSyncNow,
  className 
}: OfflineStatusProps) {
  // Only show when offline or has pending data
  if (isOnline && !hasOfflineData) return null

  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      {/* Offline Status - only show when offline */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 bg-orange-500/20 text-orange-400 border border-orange-500/30">
          <WifiOff className="h-3 w-3" />
          Offline
        </div>
      )}
      
      {/* Sync Queue Status - only show when has pending data */}
      {hasOfflineData && (
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer",
            isOnline 
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30" 
              : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
          )}
          onClick={isOnline ? onSyncNow : undefined}
          title={isOnline ? "Click to sync now" : "Will sync when online"}
        >
          {isOnline ? (
            <>
              <Upload className="h-3 w-3" />
              {pendingCount} pending
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              {pendingCount} queued
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for smaller spaces
export function OfflineStatusCompact({ 
  isOnline, 
  pendingCount, 
  hasOfflineData,
  className 
}: Omit<OfflineStatusProps, 'onSyncNow'>) {
  // Only show when offline or has pending data
  if (isOnline && !hasOfflineData) return null
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Connection Status Icon */}
      {!isOnline && <WifiOff className="h-3 w-3 text-orange-400" />}
      
      {/* Pending Count */}
      {hasOfflineData && (
        <span className="text-xs text-white/70">
          {pendingCount}
        </span>
      )}
    </div>
  )
}