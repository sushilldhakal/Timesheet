"use client"

import { useState, useEffect } from "react"
import { SetupDialog } from "./SetupDialog"

type SetupGuardProps = {
  children: React.ReactNode
}

export function SetupGuard({ children }: SetupGuardProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)

  useEffect(() => {
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => setNeedsSetup(data.needsSetup === true))
      .catch(() => setNeedsSetup(false))
  }, [])

  const handleSetupSuccess = () => {
    setNeedsSetup(false)
  }

  return (
    <>
      {children}
      {needsSetup === null && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {needsSetup === true && <SetupDialog onSuccess={handleSetupSuccess} />}
    </>
  )
}
