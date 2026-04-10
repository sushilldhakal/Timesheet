"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdmin, isAdminOrSuperAdmin, UserRole } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Users, DollarSign } from "lucide-react"
import { UsersTable } from "./UsersTable"
import { AddUserDialog } from "./AddUserDialog"
import { EditUserDialog } from "./EditUserDialog"
import { DeleteUserDialog } from "./DeleteUserDialog"
import { useUsers } from "@/lib/queries/users"
import { Badge } from "@/components/ui/badge"

export type UserRow = {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin" | "employee"
  location: string[]
  rights: string[]
  managedRoles?: string[]
  createdAt?: string
}

type TabType = 'all' | 'operational' | 'financial'

export default function UsersPage() {
  const { user, isHydrated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)

  const userIsAdmin = isAdmin(user?.role ?? null)
  const userIsAdminOrSuperAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  // TanStack Query hooks
  const usersQuery = useUsers()
  
  const allUsers = usersQuery.data?.users || []
  const loading = usersQuery.isLoading

  // Filter all users (ADMIN only)
  const allUsersFiltered = useMemo(() => {
    return allUsers.filter(u => 
      u.role !== UserRole.SUPER_ADMIN // Hide super_admin from list
    )
  }, [allUsers])

  // Filter operational staff (MANAGER and SUPERVISOR)
  const operationalUsers = useMemo(() => {
    return allUsers.filter(u => 
      u.role === UserRole.MANAGER || u.role === UserRole.SUPERVISOR
    )
  }, [allUsers])

  // Filter financial staff (ACCOUNTS)
  const financialUsers = useMemo(() => {
    return allUsers.filter(u => 
      u.role === UserRole.ACCOUNTS
    )
  }, [allUsers])

  const fetchUsers = () => {
    usersQuery.refetch()
  }

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!userIsAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            Only administrators can access user management.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">User Management</h1>
            <Badge variant="outline">
              {activeTab === 'all' && 'All Users'}
              {activeTab === 'operational' && 'Managers & Supervisors'}
              {activeTab === 'financial' && 'Accounts'}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'all' && 'Manage all system users and their permissions.'}
            {activeTab === 'operational' && 'Operational staff who handle timesheets, scheduling, and shift approvals.'}
            {activeTab === 'financial' && 'Financial staff who handle awards, payroll processing, and financial reports.'}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          {userIsAdminOrSuperAdmin && (
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Users
            </TabsTrigger>
          )}
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Operational
          </TabsTrigger>
          {userIsAdminOrSuperAdmin && (
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial
            </TabsTrigger>
          )}
        </TabsList>

        {userIsAdminOrSuperAdmin && (
          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Complete list of all system users across all roles and departments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground py-8 text-center">Loading users...</p>
                ) : (
                  <UsersTable
                    users={allUsersFiltered}
                    currentUserId={user?.id}
                    onEdit={setEditUser}
                    onDelete={setDeleteUser}
                    onRefresh={fetchUsers}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="operational" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Operational Staff</CardTitle>
              <CardDescription>
                Managers can approve shifts and lock timesheets. Supervisors can approve shifts within their assigned locations and roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground py-8 text-center">Loading users...</p>
              ) : (
                <UsersTable
                  users={operationalUsers}
                  currentUserId={user?.id}
                  onEdit={setEditUser}
                  onDelete={setDeleteUser}
                  onRefresh={fetchUsers}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {userIsAdminOrSuperAdmin && (
          <TabsContent value="financial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Staff</CardTitle>
                <CardDescription>
                  Accounts staff can manage awards, process payroll, and generate financial reports. They have access to sensitive financial data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground py-8 text-center">Loading users...</p>
                ) : (
                  <UsersTable
                    users={financialUsers}
                    currentUserId={user?.id}
                    onEdit={setEditUser}
                    onDelete={setDeleteUser}
                    onRefresh={fetchUsers}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          setAddOpen(false)
          fetchUsers()
        }}
        currentUserRole={user?.role ?? null}
      />

      {editUser && (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          onSuccess={() => {
            setEditUser(null)
            fetchUsers()
          }}
          isSelf={user?.id === editUser.id}
          currentUserRole={user?.role ?? null}
        />
      )}

      {deleteUser && (
        <DeleteUserDialog
          user={deleteUser}
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
          onSuccess={() => {
            setDeleteUser(null)
            fetchUsers()
          }}
        />
      )}
    </div>
  )
}
