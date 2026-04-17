"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Loader2, LogIn, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/ui/mode-toggle"
import { toast } from "sonner"

interface Org {
  id: string
  name: string
  slug: string
}

export default function SelectOrgPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)

  // Fetch available orgs for the pre-auth'd user
  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/auth/orgs")
        if (res.status === 401) {
          // Pre-auth token missing or expired — send back to login
          router.replace("/")
          return
        }
        if (!res.ok) throw new Error("Failed to load organisations")
        const data = await res.json()
        const list: Org[] = data.orgs ?? []
        if (list.length === 0) {
          toast.error("No organisations found for your account")
          router.replace("/")
          return
        }
        // If only one org somehow ended up here, auto-select it
        if (list.length === 1) {
          await selectOrg(list[0].id)
          return
        }
        setOrgs(list)
      } catch {
        toast.error("Could not load your organisations. Please try again.")
        router.replace("/")
      } finally {
        setLoading(false)
      }
    }

    fetchOrgs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function selectOrg(tenantId: string) {
    setSelecting(tenantId)
    try {
      const res = await fetch("/api/auth/select-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to select organisation")
      }

      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong")
      setSelecting(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-xl">Timesheet</span>
        </div>
        <ModeToggle />
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Select Organisation</h1>
            <p className="text-muted-foreground">
              Your account belongs to multiple organisations. Choose one to continue.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {orgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => selectOrg(org.id)}
                  disabled={selecting !== null}
                  className="w-full flex items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
                  aria-label={`Select ${org.name}`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{org.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{org.slug}</p>
                  </div>
                  {selecting === org.id ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
                  ) : (
                    <LogIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.replace("/")}
              disabled={selecting !== null}
              className="text-muted-foreground"
            >
              Back to login
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground border-t">
        <p>© 2024 Timesheet. All rights reserved.</p>
      </footer>
    </div>
  )
}
