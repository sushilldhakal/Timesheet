"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type SetupDialogProps = {
  onSuccess: () => void
}

export function SetupDialog({ onSuccess }: SetupDialogProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      setLoading(true)

      try {
        const res = await fetch("/api/setup/create-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error ?? "Failed to create admin")
          setLoading(false)
          return
        }

        onSuccess()
      } catch {
        setError("Network error")
      } finally {
        setLoading(false)
      }
    },
    [username, password, onSuccess]
  )

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        <h2 className="text-lg font-semibold">Create Admin Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is a one-time setup. Create your admin username and password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-username">Username</Label>
            <Input
              id="setup-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-password">Password</Label>
            <Input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create Admin"}
          </Button>
        </form>
      </div>
    </div>
  )
}
