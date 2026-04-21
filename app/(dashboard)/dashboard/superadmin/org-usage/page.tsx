"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Building2, Loader2, Search } from "lucide-react"

export default function OrgUsagePage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchOrganizations()
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, router])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/superadmin/org-usage")
      if (res.ok) {
        const data = await res.json()
        setOrganizations(data.organizations || [])
      }
    } catch (error) {
      console.error("Error fetching organizations:", error)
    } finally {
      setLoading(false)
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

  const filteredOrgs = organizations.filter((org) =>
    org.orgName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Organization Usage</h1>
        <p className="text-muted-foreground">Monitor storage and email usage across all organizations.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>All Organizations</CardTitle>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrgs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No organizations found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Organization</th>
                    <th className="text-left p-3 font-medium">Storage Used</th>
                    <th className="text-left p-3 font-medium">Storage Quota</th>
                    <th className="text-left p-3 font-medium">Email Sent</th>
                    <th className="text-left p-3 font-medium">Email Quota</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr key={org.orgId} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{org.orgName}</td>
                      <td className="p-3">{(org.storageUsedBytes / 1073741824).toFixed(2)} GB</td>
                      <td className="p-3">{(org.storageQuotaBytes / 1073741824).toFixed(2)} GB</td>
                      <td className="p-3">{org.emailSentCount}</td>
                      <td className="p-3">{org.emailQuota}/month</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
