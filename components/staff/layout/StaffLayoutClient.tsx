"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { StaffSidebar } from "./StaffSidebar"
import { StaffHeader } from "./StaffHeader"
import { StaffShell } from "@/components/shared/shells/StaffShell"
import { PageContent } from "@/components/shared/shells/PageContent"
import { ContentState } from "@/components/shared/primitives/ContentState"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useEmployeeProfile, useEmployeeLogout } from "@/lib/queries/employee-clock"

export function StaffLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // TanStack Query hooks
  const { data: profileData, isLoading, error } = useEmployeeProfile()
  const logoutMutation = useEmployeeLogout()

  const employee = profileData?.data?.employee

  const [mounted, setMounted] = useState(false)

  // Handle client-side mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (error && !isLoading) {
      toast.error("Session expired")
      router.push("/")
    }
  }, [error, isLoading, router])

  useEffect(() => {
    if (isLoading) return
    if (!employee) return

    const onboardingComplete = employee.onboardingCompleted === true
    const isOnboardingRoute = pathname === "/staff/onboarding" || pathname?.startsWith("/staff/onboarding/")

    if (!onboardingComplete && !isOnboardingRoute) {
      router.replace("/staff/onboarding")
    }
  }, [employee, isLoading, pathname, router])

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
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [mobileMenuOpen, isMobile])

  // Don't render anything until mounted on client
  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Mobile overlay component
  const mobileOverlay = mobileMenuOpen ? (
    <div
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={() => setMobileMenuOpen(false)}
    />
  ) : null;

  return (
    <StaffShell
      sidebarCollapsed={sidebarCollapsed}
      mobileMenuOpen={mobileMenuOpen}
      mobileOverlay={mobileOverlay}
      sidebar={
        <StaffSidebar
          isCollapsed={sidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          onToggle={toggleSidebar}
          employee={employee}
        />
      }
      header={
        <StaffHeader
          employee={employee}
          onToggleSidebar={toggleSidebar}
          onLogout={handleLogout}
        />
      }
    >
      <PageContent variant="default">
        {children}
      </PageContent>
    </StaffShell>
  )
}
