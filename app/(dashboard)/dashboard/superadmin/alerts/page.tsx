"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertTriangle, AlertCircle, Info, HardDrive, Mail, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface Alert {
  id: string
  type: "storage" | "email" | "growth" | "system"
  severity: "critical" | "warning" | "info"
  title: string
  message: string
  orgId?: string
  orgName?: string
  value?: number
  threshold?: number
  createdAt: string
}

export default function AlertsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchAlerts()
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, router])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/superadmin/alerts")
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-200 bg-red-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "storage":
        return <HardDrive className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "growth":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdminUser) {
    return null
  }

  const criticalAlerts = alerts.filter((a) => a.severity === "critical")
  const warningAlerts = alerts.filter((a) => a.severity === "warning")
  const infoAlerts = alerts.filter((a) => a.severity === "info")

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">System Alerts</h1>
        <p className="text-muted-foreground">Proactive monitoring of system health and resource usage.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningAlerts.length}</div>
            <p className="text-xs text-muted-foreground">Monitor closely</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{infoAlerts.length}</div>
            <p className="text-xs text-muted-foreground">For your awareness</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">All systems operational</p>
              <p className="text-sm text-muted-foreground">No alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 border-2 rounded-lg transition-colors",
                    getSeverityColor(alert.severity)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{alert.title}</span>
                        <span className="text-xs px-2 py-0.5 bg-white/50 rounded-full flex items-center gap-1">
                          {getTypeIcon(alert.type)}
                          {alert.type}
                        </span>
                        {alert.orgName && (
                          <span className="text-xs px-2 py-0.5 bg-white/50 rounded-full">
                            {alert.orgName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mb-2">{alert.message}</p>
                      {alert.value !== undefined && alert.threshold !== undefined && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Current: {alert.value.toFixed(1)}%</span>
                          <span>•</span>
                          <span>Threshold: {alert.threshold}%</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
