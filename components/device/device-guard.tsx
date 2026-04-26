"use client"

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DeviceAuthProvider, useDeviceAuthContext } from '@/lib/context/device-auth-context'
import { DeviceActivation } from './device-activation'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface DeviceGuardProps {
  children: React.ReactNode
}

export function DeviceGuard({ children }: DeviceGuardProps) {
  return (
    <DeviceAuthProvider>
      <DeviceGuardInner>{children}</DeviceGuardInner>
    </DeviceAuthProvider>
  )
}

function DeviceGuardInner({ children }: DeviceGuardProps) {
  const searchParams = useSearchParams()
  const {
    isChecking,
    isAuthorized,
    error,
    needsActivation,
    deviceId,
    activateDevice,
  } = useDeviceAuthContext()

  // Check for activation code in URL
  useEffect(() => {
    const activateParam = searchParams?.get('activate')
    if (activateParam && needsActivation) {
      activateDevice(activateParam)
    }
  }, [searchParams, needsActivation, activateDevice])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
          <p className="text-gray-300">Checking device authorization...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized || needsActivation) {
    return (
      <DeviceActivation
        onActivate={activateDevice}
        isLoading={isChecking}
        error={error}
        deviceId={deviceId}
      />
    )
  }

  if (error && !needsActivation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white/10 backdrop-blur-sm border-white/20">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Device Access Denied</h1>
              <p className="text-gray-300 text-sm mb-4">
                This device is not authorized to access the timesheet system.
              </p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <div className="text-xs text-gray-400 space-y-2">
              <p><strong>Device ID:</strong></p>
              <p className="font-mono break-all text-gray-300">{deviceId}</p>
              <p className="mt-4">Contact your administrator if you believe this is an error.</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
