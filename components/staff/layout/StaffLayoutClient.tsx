"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StaffSidebar } from "./StaffSidebar"
import { StaffHeader } from "./StaffHeader"
import { cn } from "@/lib/utils/cn"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useEmployeeProfile, useEmployeeLogout } from "@/lib/queries/employee-clock"

export function StaffLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // TanStack Query hooks
  const { data: profileData, isLoading, error } = useEmployeeProfile()
  const logoutMutation = useEmployeeLogout()

  const employee = profileData?.data

  useEffect(() => {
    if (error && !isLoading) {
      toast.error("Session expired")
      router.push("/")
    }
  }, [error, isLoading, router])

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      toast.success("Logged out successfully")
      router.push("/")
    } catch (error) {
      toast.error("Logout failed")
    }
  }

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [mobileMenuOpen])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <StaffSidebar
        isCollapsed={sidebarCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        onToggle={toggleSidebar}
        employee={employee}
      />

      {/* Main Content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[280px]"
        )}
      >
        {/* Header */}
        <StaffHeader
          employee={employee}
          onToggleSidebar={toggleSidebar}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
