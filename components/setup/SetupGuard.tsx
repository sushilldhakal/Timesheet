"use client"

import { SetupDialog } from "./SetupDialog"
import { useSetupStatus } from "@/lib/queries/setup"
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

type SetupGuardProps = {
  children: React.ReactNode
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { data: setupStatus, isLoading, isError } = useSetupStatus()
  const queryClient = useQueryClient()
  const [showLoading, setShowLoading] = useState(false)
  
  const needsSetup = setupStatus?.success === true && setupStatus.data.needsSetup === true

  const handleSetupSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['setup', 'status'] })
  }

  // Only show loading spinner for the first 2 seconds, then hide it to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      setShowLoading(true)
      const timeout = setTimeout(() => {
        setShowLoading(false)
      }, 2000) // Hide after 2 seconds max
      
      return () => clearTimeout(timeout)
    } else {
      setShowLoading(false)
    }
  }, [isLoading])

  // If there's an error, don't block the app - just log it
  useEffect(() => {
    if (isError) {
      console.warn('[SetupGuard] Failed to check setup status, allowing app to continue')
      setShowLoading(false)
    }
  }, [isError])

  return (
    <>
      {children}
      {showLoading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {needsSetup && <SetupDialog onSuccess={handleSetupSuccess} />}
    </>
  )
}
