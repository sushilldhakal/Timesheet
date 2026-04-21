import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { Employer } from "@/lib/db/schemas/employer"
import { User } from "@/lib/db/schemas/user"
import OrgStorageQuota from "@/lib/db/schemas/org-storage-quota"
import OrgEmailUsage from "@/lib/db/schemas/org-email-usage"

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthFromCookie()
    if (!session || !isSuperAdmin(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await connectDB()

    // Get total organizations
    const totalOrgs = await Employer.countDocuments()

    // Get total users
    const totalUsers = await User.countDocuments()

    // Get storage analytics
    const storageData = await OrgStorageQuota.aggregate([
      {
        $group: {
          _id: null,
          totalUsed: { $sum: "$usedBytes" },
          totalQuota: { $sum: "$quotaBytes" },
        },
      },
    ])

    const totalStorage = storageData[0] || { totalUsed: 0, totalQuota: 0 }
    const storagePercentage = totalStorage.totalQuota > 0 
      ? (totalStorage.totalUsed / totalStorage.totalQuota) * 100 
      : 0

    // Get email analytics
    const emailData = await OrgEmailUsage.aggregate([
      {
        $group: {
          _id: null,
          totalSent: { $sum: "$sentCount" },
          totalQuota: { $sum: "$quotaMonthly" },
        },
      },
    ])

    const totalEmails = emailData[0] || { totalSent: 0, totalQuota: 0 }
    const emailPercentage = totalEmails.totalQuota > 0 
      ? (totalEmails.totalSent / totalEmails.totalQuota) * 100 
      : 0

    // Get top orgs by storage
    const topOrgsByStorage = await OrgStorageQuota.aggregate([
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
      { $sort: { usedBytes: -1 } },
      { $limit: 10 },
    ])

    // Get top orgs by email usage
    const topOrgsByEmails = await OrgEmailUsage.aggregate([
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
      { $sort: { sentCount: -1 } },
      { $limit: 10 },
    ])

    // Get growth data (orgs and users created this month vs last month)
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const orgsThisMonth = await Employer.countDocuments({
      createdAt: { $gte: startOfThisMonth },
    })

    const orgsLastMonth = await Employer.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
    })

    // Convert Unix timestamps to Date for comparison
    const thisMonthTimestamp = Math.floor(startOfThisMonth.getTime() / 1000)
    const lastMonthTimestamp = Math.floor(startOfLastMonth.getTime() / 1000)

    const usersThisMonth = await User.countDocuments({
      createdAt: { $gte: thisMonthTimestamp },
    })

    const usersLastMonth = await User.countDocuments({
      createdAt: { $gte: lastMonthTimestamp, $lt: thisMonthTimestamp },
    })

    return NextResponse.json({
      totalOrgs,
      totalUsers,
      totalStorage: {
        used: totalStorage.totalUsed,
        quota: totalStorage.totalQuota,
        percentage: storagePercentage,
      },
      totalEmails: {
        sent: totalEmails.totalSent,
        quota: totalEmails.totalQuota,
        percentage: emailPercentage,
      },
      topOrgsByStorage: topOrgsByStorage.map((org) => ({
        orgId: org.orgId.toString(),
        orgName: org.orgName,
        usedBytes: org.usedBytes,
        quotaBytes: org.quotaBytes,
        percentage: org.percentage,
      })),
      topOrgsByEmails: topOrgsByEmails.map((org) => ({
        orgId: org.orgId.toString(),
        orgName: org.orgName,
        sentCount: org.sentCount,
        quotaMonthly: org.quotaMonthly,
        percentage: org.percentage,
      })),
      recentGrowth: {
        orgsThisMonth,
        orgsLastMonth,
        usersThisMonth,
        usersLastMonth,
      },
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
