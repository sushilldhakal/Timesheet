"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RosterScheduler } from "@/components/Roster/RosterScheduler"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function RosterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    // Check if user has access to roster
    checkAccess()
  }, [])

  async function checkAccess() {
    try {
      const res = await fetch("/api/auth/me")
      if (!res.ok) {
        // Redirect to login
        router.push("/login")
        return
      }

      const { user } = await res.json()

      // Check if user has permission to access roster
      if (
        user.role !== "admin" &&
        user.role !== "super_admin" &&
        (!user.managedRoles || user.managedRoles.length === 0)
      ) {
        setError("You don't have permission to access the roster scheduler.")
        setLoading(false)
        return
      }

      setHasAccess(true)
      setLoading(false)
    } catch (err: any) {
      console.error("Access check error:", err)
      setError("Failed to verify permissions")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading roster...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="w-full">
      <RosterScheduler />
    </div>
  )
}
