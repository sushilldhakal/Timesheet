import { AuthProvider } from "@/components/auth/AuthProvider"
import { DashboardLayoutClient } from "@/components/dashboard/layout/DashboardLayoutClient"
import { LayoutProvider } from "@/components/providers/LayoutProvider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <LayoutProvider>
        <DashboardLayoutClient>{children}</DashboardLayoutClient>
      </LayoutProvider>
    </AuthProvider>
  )
}