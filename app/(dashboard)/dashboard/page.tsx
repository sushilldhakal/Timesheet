"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/use-auth"
import { useDashboardMetrics, useRecentActivities, useChartData } from "@/lib/hooks/use-dashboard-data"
import { MetricCard } from "@/components/dashboard/widgets/MetricCard"
import { ActivityFeed } from "@/components/dashboard/widgets/ActivityFeed"
import { QuickActionsPanel } from "@/components/dashboard/widgets/QuickActionsPanel"
import { TrendChart } from "@/components/dashboard/widgets/TrendChart"
import { ProgressRing } from "@/components/dashboard/widgets/ProgressRing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SkeletonMetricCard, SkeletonCard } from "@/components/ui/skeleton"
import { Users, Clock, AlertTriangle, CheckCircle, Target, Calendar } from "lucide-react"
import { Suspense } from "react"

const DashboardContent = dynamic(
  () => import("@/components/dashboard/DashboardContent").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <SkeletonCard className="h-64" />
    ),
  }
)

const EnhancedAreaChart = dynamic(
  () => import("@/components/dashboard/charts/EnhancedAreaChart").then((m) => m.EnhancedAreaChart),
  {
    ssr: false,
    loading: () => <SkeletonCard className="h-80" />
  }
)

export default function DashboardPage() {
  const { user, isHydrated } = useAuth()
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics()
  const { data: weeklyData, isLoading: weeklyLoading } = useChartData('weekly')
  const { data: hoursData, isLoading: hoursLoading } = useChartData('hours')

  // Prevent hydration mismatch by showing loading state until client hydrates
  const showMetrics = isHydrated && !metricsLoading

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Operational view and analytics</p>
        </div>
      </div>

      {/* Hero KPI Strip with Real Data */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!showMetrics ? (
          <>
            <SkeletonMetricCard className="stagger-item" />
            <SkeletonMetricCard className="stagger-item" />
            <SkeletonMetricCard className="stagger-item" />
            <SkeletonMetricCard className="stagger-item" />
          </>
        ) : (
          <>
            <MetricCard
              value={metrics?.activeToday.toString() || "127"}
              label="Active Today"
              trend={metrics?.trends.activeToday || "+5%"}
              trendDirection="positive"
              icon={<Users className="h-4 w-4" />}
              variant="success"
              className="stagger-item card-hover-lift"
            />
            <MetricCard
              value={metrics?.hoursThisWeek.toLocaleString() || "1,024"}
              label="Hours This Week"
              trend={metrics?.trends.hoursThisWeek || "+12%"}
              trendDirection="positive"
              icon={<Clock className="h-4 w-4" />}
              className="stagger-item card-hover-lift"
            />
            <MetricCard
              value={metrics?.pendingApprovals.toString() || "8"}
              label="Pending Approvals"
              trend={metrics?.trends.pendingApprovals}
              icon={<CheckCircle className="h-4 w-4" />}
              variant="warning"
              className="stagger-item card-hover-lift"
            />
            <MetricCard
              value={metrics?.flaggedPunches.toString() || "2"}
              label="Flagged Punches"
              trend={metrics?.trends.flaggedPunches || "-3 from yesterday"}
              trendDirection="positive"
              icon={<AlertTriangle className="h-4 w-4" />}
              variant="danger"
              className="stagger-item card-hover-lift"
            />
          </>
        )}
      </div>

      {/* Enhanced Charts and Progress Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weekly Trend Chart */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<SkeletonCard className="h-80" />}>
            {!isHydrated || weeklyLoading ? (
              <SkeletonCard className="h-80" />
            ) : (
              <TrendChart
                data={weeklyData || []}
                title="Weekly Activity Trend"
                description="Employee activity over the past week"
                trend="up"
                trendValue="+12%"
                target={140}
                className="stagger-item"
              />
            )}
          </Suspense>

          <Suspense fallback={<SkeletonCard className="h-80" />}>
            {!isHydrated || hoursLoading ? (
              <SkeletonCard className="h-80" />
            ) : (
              <EnhancedAreaChart
                data={hoursData || []}
                title="Hours Logged"
                description="Total hours logged by employees"
                color="hsl(var(--color-success))"
                className="stagger-item"
              />
            )}
          </Suspense>
        </div>

        {/* Progress Rings and Goals */}
        <div className="space-y-6">
          <ProgressRing
            value={85}
            max={100}
            title="Weekly Goal"
            description="Hours target completion"
            color="success"
            className="stagger-item"
          />
          
          <ProgressRing
            value={67}
            max={100}
            title="Attendance Rate"
            description="This month's attendance"
            color="primary"
            size="sm"
            className="stagger-item"
          />

          <Card elevation="elevated" className="stagger-item card-hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Monthly Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Hours Logged</span>
                <span className="text-sm font-medium">4,200 / 5,000</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '84%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Attendance</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enhanced Activity Feed */}
        <Card elevation="elevated" className="lg:col-span-2 stagger-item card-hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<SkeletonCard />}>
              <ActivityFeed />
            </Suspense>
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <div className="stagger-item">
          <QuickActionsPanel />
        </div>
      </div>

      {/* Enhanced Legacy Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/employees"
          className="interactive-element button-press rounded-lg border p-4 transition-all duration-200 hover:bg-muted/50 card-subtle desktop-hover-effects mobile-touch-target keyboard-nav-indicator"
          aria-label="Navigate to Staff and Employees management"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-primary icon-scale" />
            <h2 className="font-medium">Staff / Employees</h2>
          </div>
          <p className="text-sm text-muted-foreground">Add, edit, and manage employees</p>
        </Link>
        <Link
          href="/dashboard/timesheet"
          className="interactive-element button-press rounded-lg border p-4 transition-all duration-200 hover:bg-muted/50 card-subtle desktop-hover-effects mobile-touch-target keyboard-nav-indicator"
          aria-label="Navigate to Timesheet management"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-primary icon-scale" />
            <h2 className="font-medium">Timesheet</h2>
          </div>
          <p className="text-sm text-muted-foreground">View and generate timesheets</p>
        </Link>
        <Link
          href="/dashboard/flag"
          className="interactive-element button-press rounded-lg border p-4 transition-all duration-200 hover:bg-muted/50 card-subtle desktop-hover-effects mobile-touch-target keyboard-nav-indicator"
          aria-label="Navigate to Flagged punches"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-5 w-5 text-warning icon-scale" />
            <h2 className="font-medium">Flagged punches</h2>
          </div>
          <p className="text-sm text-muted-foreground">No image or location (last 30 days)</p>
        </Link>
        {isHydrated && (user?.role === "admin" || user?.role === "super_admin") && (
          <Link
            href="/dashboard/users"
            className="interactive-element button-press rounded-lg border p-4 transition-all duration-200 hover:bg-muted/50 card-subtle desktop-hover-effects mobile-touch-target keyboard-nav-indicator"
            aria-label="Navigate to User management"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-5 w-5 text-primary icon-scale" />
              <h2 className="font-medium">Users</h2>
            </div>
            <p className="text-sm text-muted-foreground">Manage admin and user accounts</p>
          </Link>
        )}
      </div>

      <Suspense fallback={<SkeletonCard className="h-64" />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
