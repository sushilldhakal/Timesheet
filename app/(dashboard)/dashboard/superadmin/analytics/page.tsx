"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, TrendingUp, Database, Mail, Building2, Users, HardDrive } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface AnalyticsData {
  totalOrgs: number
  totalUsers: number
  totalStorage: {
    used: number
    quota: number
    percentage: number
  }
  totalEmails: {
    sent: number
    quota: number
    percentage: number
  }
  topOrgsByStorage: Array<{
    orgId: string
    orgName: string
    usedBytes: number
    quotaBytes: number
    percentage: number
  }>
  topOrgsByEmails: Array<{
    orgId: string
    orgName: string
    sentCount: number
    quotaMonthly: number
    percentage: number
  }>
  recentGrowth: {
    orgsThisMonth: number
    orgsLastMonth: number
    usersThisMonth: number
    usersLastMonth: number
  }
}

export default function AnalyticsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchAnalytics()
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, router])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/superadmin/analytics")
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdminUser || !analytics) {
    return null
  }

  const storageGrowth = analytics.recentGrowth.orgsThisMonth - analytics.recentGrowth.orgsLastMonth
  const userGrowth = analytics.recentGrowth.usersThisMonth - analytics.recentGrowth.usersLastMonth

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Platform Analytics</h1>
        <p className="text-muted-foreground">Monitor system usage, growth, and resource consumption.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalOrgs}</div>
            <p className="text-xs text-muted-foreground">
              {storageGrowth > 0 ? "+" : ""}{storageGrowth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userGrowth > 0 ? "+" : ""}{userGrowth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalStorage.percentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(analytics.totalStorage.used)} / {formatBytes(analytics.totalStorage.quota)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Usage</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalEmails.percentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalEmails.sent.toLocaleString()} / {analytics.totalEmails.quota.toLocaleString()} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Usage Breakdown</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Growth Trends</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Organizations</span>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{analytics.recentGrowth.orgsThisMonth}</div>
                    <p className="text-xs text-muted-foreground">
                      vs {analytics.recentGrowth.orgsLastMonth} last month
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Users</span>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{analytics.recentGrowth.usersThisMonth}</div>
                    <p className="text-xs text-muted-foreground">
                      vs {analytics.recentGrowth.usersLastMonth} last month
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="storage" className="mt-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Top Organizations by Storage</h3>
                {analytics.topOrgsByStorage.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No storage data available</p>
                ) : (
                  analytics.topOrgsByStorage.map((org, index) => (
                    <div key={org.orgId} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-muted rounded-full">#{index + 1}</span>
                            <span className="font-medium">{org.orgName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatBytes(org.usedBytes)} / {formatBytes(org.quotaBytes)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-bold",
                            org.percentage >= 90 ? "text-red-600" : org.percentage >= 75 ? "text-yellow-600" : "text-green-600"
                          )}>
                            {org.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            org.percentage >= 90 ? "bg-red-600" : org.percentage >= 75 ? "bg-yellow-600" : "bg-green-600"
                          )}
                          style={{ width: `${Math.min(org.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="emails" className="mt-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Top Organizations by Email Usage</h3>
                {analytics.topOrgsByEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No email data available</p>
                ) : (
                  analytics.topOrgsByEmails.map((org, index) => (
                    <div key={org.orgId} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-muted rounded-full">#{index + 1}</span>
                            <span className="font-medium">{org.orgName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {org.sentCount.toLocaleString()} / {org.quotaMonthly.toLocaleString()} emails
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-bold",
                            org.percentage >= 90 ? "text-red-600" : org.percentage >= 75 ? "text-yellow-600" : "text-green-600"
                          )}>
                            {org.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            org.percentage >= 90 ? "bg-red-600" : org.percentage >= 75 ? "bg-yellow-600" : "bg-green-600"
                          )}
                          style={{ width: `${Math.min(org.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
