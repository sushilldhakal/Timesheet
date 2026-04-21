import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import OrgStorageQuota from "@/lib/db/schemas/org-storage-quota"
import OrgEmailUsage from "@/lib/db/schemas/org-email-usage"
import { Employer } from "@/lib/db/schemas/employer"

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

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await connectDB()

    const alerts: Alert[] = []
    const now = new Date()

    // Check storage quota alerts (90%+ = critical, 75%+ = warning)
    const storageAlerts = await OrgStorageQuota.aggregate([
      {
        $lookup: {
          from: "employers",
          localField: "orgId",
          foreignField: "_id",
          as: "org",
        },
      },
      { $unwind: "$org" },
      {
        $project: {
          orgId: "$orgId",
          orgName: "$org.name",
          usedBytes: 1,
          quotaBytes: 1,
          percentage: {
            $cond: [
              { $gt: ["$quotaBytes", 0] },
              { $multiply: [{ $divide: ["$usedBytes", "$quotaBytes"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $match: {
          percentage: { $gte: 75 },
        },
      },
      { $sort: { percentage: -1 } },
    ])

    for (const alert of storageAlerts) {
      const severity = alert.percentage >= 90 ? "critical" : "warning"
      alerts.push({
        id: `storage-${alert.orgId}`,
        type: "storage",
        severity,
        title: `Storage quota ${severity === "critical" ? "critical" : "warning"}`,
        message: `${alert.orgName} is using ${alert.percentage.toFixed(1)}% of their storage quota`,
        orgId: alert.orgId.toString(),
        orgName: alert.orgName,
        value: alert.percentage,
        threshold: severity === "critical" ? 90 : 75,
        createdAt: now.toISOString(),
      })
    }

    // Check email quota alerts (90%+ = critical, 75%+ = warning)
    const emailAlerts = await OrgEmailUsage.aggregate([
      {
        $lookup: {
          from: "employers",
          localField: "orgId",
          foreignField: "_id",
          as: "org",
        },
      },
      { $unwind: "$org" },
      {
        $project: {
          orgId: "$orgId",
          orgName: "$org.name",
          sentCount: 1,
          quotaMonthly: 1,
          percentage: {
            $cond: [
              { $gt: ["$quotaMonthly", 0] },
              { $multiply: [{ $divide: ["$sentCount", "$quotaMonthly"] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $match: {
          percentage: { $gte: 75 },
        },
      },
      { $sort: { percentage: -1 } },
    ])

    for (const alert of emailAlerts) {
      const severity = alert.percentage >= 90 ? "critical" : "warning"
      alerts.push({
        id: `email-${alert.orgId}`,
        type: "email",
        severity,
        title: `Email quota ${severity === "critical" ? "critical" : "warning"}`,
        message: `${alert.orgName} has used ${alert.percentage.toFixed(1)}% of their monthly email quota`,
        orgId: alert.orgId.toString(),
        orgName: alert.orgName,
        value: alert.percentage,
        threshold: severity === "critical" ? 90 : 75,
        createdAt: now.toISOString(),
      })
    }

    // Check for rapid growth (orgs created in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentOrgs = await Employer.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    })

    if (recentOrgs >= 5) {
      alerts.push({
        id: "growth-recent-orgs",
        type: "growth",
        severity: "info",
        title: "Rapid organization growth",
        message: `${recentOrgs} new organizations created in the last 7 days`,
        value: recentOrgs,
        createdAt: now.toISOString(),
      })
    }

    // Sort alerts by severity (critical > warning > info)
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      alerts,
      summary: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
      },
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
