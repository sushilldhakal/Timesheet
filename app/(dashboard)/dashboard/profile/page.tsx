"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function ProfilePage() {
  const { user, isHydrated, refetch } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username)
    }
  }, [user])

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
    setLoading(true)
    try {
      const body: { username: string; password?: string } = {
        username: username.trim().toLowerCase(),
      }
      if (password) body.password = password

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to update profile")
        return
      }
      setPassword("")
      setSuccess(true)
      refetch()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-muted-foreground">
          Edit your username and password. Other details are managed by your administrator.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Name, locations, and rights can only be changed by an administrator.
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
                <FieldLabel htmlFor="profile-username">Username *</FieldLabel>
                <Input
                  id="profile-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
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
    </div>
  )
}
