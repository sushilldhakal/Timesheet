"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

export default function SetupPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [employeeInfo, setEmployeeInfo] = useState<{ email: string; name: string; pin: string } | null>(null)

  useEffect(() => {
    if (!token) {
      toast.error("Invalid setup link")
      router.push("/")
      return
    }

    // Verify token on mount
    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/auth/setup-password?token=${token}`)
        const data = await res.json()

        if (res.ok && data.valid) {
          setTokenValid(true)
          setEmployeeInfo({ email: data.email, name: data.name, pin: data.pin })
        } else {
          toast.error(data.error || "Invalid or expired setup link")
          setTokenValid(false)
        }
      } catch (error) {
        toast.error("Failed to verify setup link")
        setTokenValid(false)
      } finally {
        setIsVerifying(false)
      }
    }

    verifyToken()
  }, [token, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success("Password set successfully! Redirecting...")
        
        // Auto-login and redirect to staff dashboard
        setTimeout(() => {
          router.push(data.redirect)
        }, 1500)
      } else {
        toast.error(data.error || "Failed to set password")
      }
    } catch (error) {
      toast.error("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying setup link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Invalid Setup Link
            </CardTitle>
            <CardDescription className="text-center">
              This password setup link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Setup links expire after 24 hours. Please contact your administrator for a new link.
            </p>

            <Link href="/" className="block">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to the Team!
          </CardTitle>
          <CardDescription className="text-center">
            {employeeInfo && `Hi ${employeeInfo.name}, set up your password to get started`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {employeeInfo && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Email:</p>
                  <p className="font-medium">{employeeInfo.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Your PIN for kiosk clock-in:</p>
                  <p className="font-mono font-bold text-lg">{employeeInfo.pin}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">Create Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              After setting your password, you'll be automatically signed in
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
