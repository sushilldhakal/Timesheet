"use client"

import { createContext, useContext } from 'react'
import { useDeviceAuth } from '@/lib/hooks/use-device-auth'

type DeviceAuthContextValue = ReturnType<typeof useDeviceAuth>

const DeviceAuthContext = createContext<DeviceAuthContextValue | null>(null)

export function DeviceAuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useDeviceAuth()
  return <DeviceAuthContext.Provider value={auth}>{children}</DeviceAuthContext.Provider>
}

export function useDeviceAuthContext(): DeviceAuthContextValue {
  const ctx = useContext(DeviceAuthContext)
  if (!ctx) throw new Error('useDeviceAuthContext must be used within DeviceAuthProvider')
  return ctx
}
