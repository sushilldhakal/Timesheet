"use client"

import { useState, useMemo } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdmin, isManager, UserRole } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, UserCheck, UserX } from "lucide-react"
import { ResourcePageShell } from "@/components/shared/primitives/ResourcePageShell"
import { ContentState } from "@/components/shared/primitives/ContentState"
import { UsersTable } from "../../../../components/users/UsersTable"
import { AddUserDialog } from "../../../../components/users/AddUserDialog"
import { EditUserDialog } from "../../../../components/users/EditUserDialog"
import { DeleteUserDialog } from "../../../../components/users/DeleteUserDialog"
import { useUsers } from "@/lib/queries/users"
import type { User } from "@/lib/types/user"

export default function UsersPage() {
  const { user, isHydrated } = useAuth()
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)

  const userIsAdmin = isAdmin(user?.role ?? null)
  const userIsManager = isManager(user?.role ?? null)
  const canAccessUsers = userIsAdmin || userIsManager

  // TanStack Query hooks
  const usersQuery = useUsers()

  const allUsers = usersQuery.data || []
  const loading = usersQuery.isLoading
  const error = usersQuery.error

  const allUsersFiltered = useMemo(() => {
    return allUsers.filter(u => u.role !== UserRole.SUPER_ADMIN)
  }, [allUsers])

  // Calculate metrics
  const metrics = useMemo(() => {
    const adminUsers = allUsersFiltered.filter(u => u.role === UserRole.ADMIN).length
    const managerUsers = allUsersFiltered.filter(u => u.role === UserRole.MANAGER).length
    const supervisorUsers = allUsersFiltered.filter(u => u.role === UserRole.SUPERVISOR).length
    
    return [
      {
        label: "Total Users",
        value: allUsersFiltered.length,
        icon: <Users className="h-4 w-4" />
      },
      {
        label: "Administrators",
        value: adminUsers,
        icon: <UserCheck className="h-4 w-4" />
      },
      {
        label: "Managers", 
        value: managerUsers,
        icon: <Users className="h-4 w-4" />
      },
      {
        label: "Supervisors",
        value: supervisorUsers,
        icon: <UserX className="h-4 w-4" />
      }
    ]
  }, [allUsersFiltered])

  const fetchUsers = () => {
    usersQuery.refetch()
  }

  if (!isHydrated) {
    return (
      <ContentState state="loading" loadingText="Loading user management..." />
    )
  }

  if (!canAccessUsers) {
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

  const contentState = loading ? 'loading' : error ? 'error' : allUsersFiltered.length === 0 ? 'empty' : 'ready'

  return (
    <>
      <ResourcePageShell
        title="User Management"
        description="Manage all system users and their permissions."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        }
        metrics={metrics}
      >
        <ContentState
          state={contentState}
          emptyTitle="No users found"
          emptyDescription="Get started by adding your first user to the system."
          emptyAction={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          }
          errorTitle="Failed to load users"
          errorDescription="There was an error loading the user list. Please try again."
          errorAction={
            <Button onClick={fetchUsers} variant="outline">
              Try Again
            </Button>
          }
          loadingText="Loading users..."
        >
          <UsersTable
            users={allUsersFiltered}
            currentUserId={user?.id}
            onEdit={setEditUser}
            onDelete={setDeleteUser}
            onRefresh={fetchUsers}
          />
        </ContentState>
      </ResourcePageShell>

      {/* Dialogs */}
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
    </>
  )
}
