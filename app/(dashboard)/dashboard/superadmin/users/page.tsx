"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Users as UsersIcon, Search, UserX, UserCheck, Shield } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils/cn"

interface User {
  _id: string
  name: string
  email: string
  role: string
  tenantId: {
    _id: string
    name: string
  } | null
  createdAt: number
  isActive: boolean
}

export default function UsersPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    user: User | null
    action: "deactivate" | "activate" | null
  }>({
    open: false,
    user: null,
    action: null,
  })
  const [processing, setProcessing] = useState(false)

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchUsers()
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, router, page, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(roleFilter !== "all" && { role: roleFilter }),
      })

      const res = await fetch(`/api/superadmin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setHasMore(data.hasMore || false)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserAction = async () => {
    if (!actionDialog.user || !actionDialog.action) return

    try {
      setProcessing(true)
      const res = await fetch(`/api/superadmin/users/${actionDialog.user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionDialog.action,
        }),
      })

      if (res.ok) {
        toast.success(`User ${actionDialog.action}d successfully`)
        setActionDialog({ open: false, user: null, action: null })
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || `Failed to ${actionDialog.action} user`)
      }
    } catch {
      toast.error("Error processing request")
    } finally {
      setProcessing(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800"
      case "admin":
        return "bg-blue-100 text-blue-800"
      case "manager":
        return "bg-green-100 text-green-800"
      case "supervisor":
        return "bg-yellow-100 text-yellow-800"
      case "accounts":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      u.name?.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.tenantId?.name?.toLowerCase().includes(searchLower)
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
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground">Manage users across all organizations.</p>
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
                  placeholder="Search by name, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="accounts">Accounts</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" />
            <CardTitle>All Users</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u._id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-medium">{u.name || "Unnamed User"}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getRoleBadgeColor(u.role))}>
                          {u.role.replace("_", " ")}
                        </span>
                        {!u.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded-full">
                            Inactive
                          </span>
                        )}
                        {u.tenantId && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                            {u.tenantId.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(u.createdAt * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {u.role !== "super_admin" && (
                        <>
                          {u.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setActionDialog({ open: true, user: u, action: "deactivate" })}
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => setActionDialog({ open: true, user: u, action: "activate" })}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Activate
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && (
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

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !open && setActionDialog({ open: false, user: null, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "deactivate" ? "Deactivate User" : "Activate User"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "deactivate"
                ? "This will prevent the user from logging in. You can reactivate them later."
                : "This will allow the user to log in again."}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.user && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-medium">User:</span> {actionDialog.user.name}
              </p>
              <p className="text-sm text-muted-foreground">{actionDialog.user.email}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, user: null, action: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUserAction}
              disabled={processing}
              variant={actionDialog.action === "deactivate" ? "destructive" : "default"}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionDialog.action === "deactivate" ? (
                "Deactivate"
              ) : (
                "Activate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
