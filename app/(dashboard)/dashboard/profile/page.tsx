"use client"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Shield, MapPin, Briefcase, CheckCircle2 } from "lucide-react"
import { RIGHT_LABELS, type Right } from "@/lib/config/rights"
import { useUpdateUser } from "@/lib/queries/users"
import { ChangePasswordCard } from "@/components/profile/change-password-card"
import { useMutation } from "@tanstack/react-query"
import { changePassword } from "@/lib/api/auth"
import { toast } from "sonner"
import { NotificationPreferencesCard } from "@/components/notifications/NotificationPreferencesCard"
function ProfilePage() {
  const { user, isHydrated, refetch } = useAuth()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const updateUserMutation = useUpdateUser()
  
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password changed successfully")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    }
  })

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    await changePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
    })
  }

  if (!isHydrated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    try {
      const body: { password?: string } = {}
      if (password) body.password = password

      await updateUserMutation.mutateAsync({ id: user.id, data: body })
      setPassword("")
      setSuccess(true)
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    }
  }

  const loading = updateUserMutation.isPending

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-500 hover:bg-purple-600"
      case "admin":
        return "bg-blue-500 hover:bg-blue-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground">
          View your account details, permissions, and managed locations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Update your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input value={user.name || "—"} disabled className="bg-muted" />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input value={user.email || "—"} disabled className="bg-muted" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-password">New Password</FieldLabel>
                  <Input
                    id="profile-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    minLength={password ? 6 : undefined}
                  />
                </Field>
                {error && <FieldError>{error}</FieldError>}
                {success && (
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    Profile updated successfully.
                  </p>
                )}
              </FieldGroup>
              <Button type="submit" className="mt-4" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Role & Permissions</CardTitle>
            </div>
            <CardDescription>
              Your system role and access rights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">System Role</p>
              <Badge className={getRoleBadgeColor(user.role)}>
                {user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "User"}
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Access Rights</p>
              {user.rights && user.rights.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.rights.map((right) => (
                    <Badge key={right} variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {RIGHT_LABELS[right as Right] || right}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No specific rights assigned</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Managed Locations</CardTitle>
            </div>
            <CardDescription>
              Locations you have access to manage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.location && user.location.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.location.map((loc) => (
                  <Badge key={loc} variant="outline">
                    {loc}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {user.role === "admin" || user.role === "super_admin"
                  ? "Access to all locations"
                  : "No locations assigned"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Managed Roles</CardTitle>
            </div>
            <CardDescription>
              Employee roles you can supervise.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user.managedRoles && user.managedRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.managedRoles.map((role) => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {user.role === "admin" || user.role === "super_admin"
                  ? "Access to all roles"
                  : "No roles assigned"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ChangePasswordCard 
        onSubmit={handlePasswordChange}
        isLoading={changePasswordMutation.isPending}
      />

      <div id="notification-preferences">
        <NotificationPreferencesCard />
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>PWA Installation</CardTitle>
          <CardDescription>
            Install the app on your home screen for quick access. Use Share → Add to Home Screen on
            iOS, or the install prompt in Chrome.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

export default ProfilePage
