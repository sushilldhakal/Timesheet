"use client"

import { SetupDialog } from "./SetupDialog"
import { useSetupStatus } from "@/lib/queries/setup"
import { useQueryClient } from '@tanstack/react-query'

type SetupGuardProps = {
  children: React.ReactNode
}

export function SetupGuard({ children }: SetupGuardProps) {
  const { data: setupStatus, isLoading } = useSetupStatus()
  const queryClient = useQueryClient()
  const needsSetup = setupStatus?.success === true && setupStatus.data.needsSetup === true

  const handleSetupSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['setup', 'status'] })
  }

  return (
    <>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {needsSetup && <SetupDialog onSuccess={handleSetupSuccess} />}
    </>
  )
}
