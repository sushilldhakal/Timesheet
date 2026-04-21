"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from "react"
import { useRouter } from "next/navigation"
import { useMe, useLogout } from "@/lib/queries/auth"
import type { AuthUser } from "@/lib/types/auth"

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  logout: () => void
  refetch: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: user, isLoading, error, refetch } = useMe()
  const logoutMutation = useLogout()

  // Redirect to home page on 401 error
  useEffect(() => {
    if (error && !isLoading) {
      router.push("/")
    }
  }, [error, isLoading, router])

  const logout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        router.push("/")
        router.refresh()
      }
    })
  }, [logoutMutation, router])

  // Always render children — auth state is provided via context.
  // Components that need auth gating (loading/redirect) consume useAuth() themselves.
  // This avoids hydration mismatches caused by the server rendering the full tree
  // while the client renders a loading spinner at this level.
  return (
    <AuthContext.Provider value={{ user: user?.user ?? null, isLoading, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return ctx
}
