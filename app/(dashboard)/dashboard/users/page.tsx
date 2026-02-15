"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { isAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { UsersTable } from "./UsersTable"
import { AddUserDialog } from "./AddUserDialog"
import { EditUserDialog } from "./EditUserDialog"
import { DeleteUserDialog } from "./DeleteUserDialog"

export type UserRow = {
  id: string
  name: string
  username: string
  role: "admin" | "user"
  location: string[]
  rights: string[]
  createdAt?: string
}

export default function UsersPage() {
  const { user, isHydrated } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)

  const userIsAdmin = isAdmin(user?.role ?? null)

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users ?? [])
      } else {
        setUsers([])
      }
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isHydrated && userIsAdmin) {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [isHydrated, userIsAdmin])

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
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts, locations, and rights.
          </p>
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
            Create, edit, and delete users. Users can only edit their own username and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading users...</p>
          ) : (
            <UsersTable
              users={users}
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
