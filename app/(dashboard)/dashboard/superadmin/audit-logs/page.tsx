"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, FileText, Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface AuditLog {
  _id: string
  tenantId: {
    _id: string
    name: string
  } | null
  userId: {
    _id: string
    name: string
    email: string
  }
  action: string
  entityType: string
  entityId: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export default function AuditLogsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [entityTypeFilter, setEntityTypeFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchLogs()
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, router, page, actionFilter, entityTypeFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(actionFilter !== "all" && { action: actionFilter }),
        ...(entityTypeFilter !== "all" && { entityType: entityTypeFilter }),
      })

      const res = await fetch(`/api/superadmin/audit-logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setHasMore(data.hasMore || false)
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchLogs()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800"
      case "UPDATE":
        return "bg-blue-100 text-blue-800"
      case "DELETE":
        return "bg-red-100 text-red-800"
      case "APPROVE":
        return "bg-emerald-100 text-emerald-800"
      case "DENY":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      log.userId?.name?.toLowerCase().includes(searchLower) ||
      log.userId?.email?.toLowerCase().includes(searchLower) ||
      log.entityType.toLowerCase().includes(searchLower) ||
      log.entityId.toLowerCase().includes(searchLower) ||
      log.tenantId?.name?.toLowerCase().includes(searchLower)
    )
  })

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

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all system actions for accountability and debugging.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, entity, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="DENY">Deny</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Employer">Organization</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="QuotaRequest">Quota Request</SelectItem>
                <SelectItem value="OrgSignupRequest">Signup Request</SelectItem>
                <SelectItem value="SystemSettings">System Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Activity Log</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No audit logs found</p>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log._id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getActionColor(log.action))}>
                          {log.action}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          {log.entityType}
                        </span>
                        {log.tenantId && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                            {log.tenantId.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{log.userId?.name || "Unknown User"}</span>
                          <span className="text-muted-foreground"> ({log.userId?.email})</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Entity ID: <span className="font-mono text-xs">{log.entityId}</span>
                        </p>
                        {log.ipAddress && (
                          <p className="text-xs text-muted-foreground">
                            IP: {log.ipAddress}
                          </p>
                        )}
                        {(log.oldValue || log.newValue) && (
                          <details className="text-xs text-muted-foreground mt-2">
                            <summary className="cursor-pointer hover:text-foreground">View changes</summary>
                            <div className="mt-2 p-2 bg-muted rounded space-y-2">
                              {log.oldValue && (
                                <div>
                                  <span className="font-medium">Old:</span>
                                  <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(log.oldValue, null, 2)}</pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <span className="font-medium">New:</span>
                                  <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(log.newValue, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
