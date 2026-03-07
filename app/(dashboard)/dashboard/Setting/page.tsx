"use client"

import { useAuth } from "@/lib/hooks/useAuth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Cloud, Mail, Settings } from "lucide-react"

const settingsTabs = [
  {
    name: "Image Storage",
    href: "/dashboard/setting/image",
    icon: Cloud,
    description: "Configure cloud storage for employee photos",
  },
  {
    name: "Mail Settings",
    href: "/dashboard/setting/mail",
    icon: Mail,
    description: "Configure email notifications and SMTP settings",
  },
]

export default function SettingsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can access settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your application settings and configurations.
        </p>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Card
              key={tab.href}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                pathname === tab.href && "border-primary shadow-sm"
              )}
              onClick={() => router.push(tab.href)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tab.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tab.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
