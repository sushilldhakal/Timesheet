"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdmin, UserRole } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { UsersTable } from "./UsersTable"
import { AddUserDialog } from "./AddUserDialog"
import { EditUserDialog } from "./EditUserDialog"
import { DeleteUserDialog } from "./DeleteUserDialog"
import { useUsers } from "@/lib/queries/users"

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

export default function UsersPage() {
  const { user, isHydrated } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)

  const userIsAdmin = isAdmin(user?.role ?? null)

  // TanStack Query hooks
  const usersQuery = useUsers()

  const allUsers = usersQuery.data?.users || []
  const loading = usersQuery.isLoading

  const allUsersFiltered = useMemo(() => {
    return allUsers.filter(u => u.role !== UserRole.SUPER_ADMIN)
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
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage all system users and their permissions.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

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
