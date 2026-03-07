"use client"

import {
  createContext,
  useCallback,
  useContext,
} from "react"
import { useRouter } from "next/navigation"
import { useMe, useLogout } from "@/lib/queries/auth"

export type AuthUser = {
  id: string
  name?: string
  username: string
  role: "admin" | "user" | "super_admin"
  location?: string[]
  rights?: string[]
  managedRoles?: string[]
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  logout: () => void
  refetch: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: user, isLoading, refetch } = useMe()
  const logoutMutation = useLogout()

  const logout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        router.push("/")
        router.refresh()
      }
    })
  }, [logoutMutation, router])

  return (
    <AuthContext.Provider value={{ user: user?.user || null, isLoading, logout, refetch }}>
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
