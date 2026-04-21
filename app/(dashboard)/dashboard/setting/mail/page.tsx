"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin, isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Mail, Loader2, Plus, Send } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils/cn"

export default function MailSettingsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [emailUsage, setEmailUsage] = useState<any>(null)
  const [quotaRequests, setQuotaRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestedQuota, setRequestedQuota] = useState("")
  const [requestNote, setRequestNote] = useState("")

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)
  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const [usageRes, requestsRes] = await Promise.all([
        fetch("/api/admin/email-usage"),
        fetch("/api/admin/quota-requests"),
      ])

      if (usageRes.ok) {
        const data = await usageRes.json()
        setEmailUsage(data)
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json()
        setQuotaRequests(data.requests?.filter((r: any) => r.requestType === "email") || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isHydrated && isAdmin) {
      fetchData()
    }
  }, [isHydrated, isAdmin])

  const handleRequestQuota = async () => {
    if (!requestedQuota) {
      toast.error("Please enter requested quota")
      return
    }

    try {
      const res = await fetch("/api/admin/quota-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "email",
          requestedQuota: parseInt(requestedQuota),
          requestNote,
        }),
      })

      if (res.ok) {
        toast.success("Quota request submitted")
        setRequestDialogOpen(false)
        setRequestedQuota("")
        setRequestNote("")
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to submit request")
      }
    } catch (error) {
      toast.error("Error submitting request")
    }
  }

  if (!isHydrated) {
    return <div className="flex items-center justify-center min-h-[200px]">Loading...</div>
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only administrators can access settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const usedPercent = emailUsage ? (emailUsage.sentCount / emailUsage.quotaMonthly) * 100 : 0

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/setting")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>
        <h1 className="text-2xl font-semibold">Email Usage</h1>
        <p className="text-muted-foreground">Monitor your email quota and manage settings.</p>
      </div>

      <div className="grid gap-6">
        {/* Email Usage Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Email Usage — {emailUsage && format(new Date(emailUsage.periodStart), "MMMM yyyy")}</CardTitle>
              </div>
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Request More Emails
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Email Quota Increase</DialogTitle>
                    <DialogDescription>Submit a request to increase your monthly email quota.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Current Quota: {emailUsage?.quotaMonthly || 0} emails/month</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestedQuota">Requested Quota (emails/month)</Label>
                      <Input
                        id="requestedQuota"
                        type="number"
                        value={requestedQuota}
                        onChange={(e) => setRequestedQuota(e.target.value)}
                        placeholder="e.g., 1000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestNote">Reason (Optional)</Label>
                      <Textarea
                        id="requestNote"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="Why do you need more emails?"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRequestQuota}>Submit Request</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{emailUsage?.sentCount || 0} sent</span>
                    <span>{emailUsage?.quotaMonthly || 0} total</span>
                  </div>
                  <Progress value={usedPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {emailUsage?.remaining || 0} emails remaining • Resets on{" "}
                    {emailUsage && format(new Date(emailUsage.periodEnd), "MMMM d, yyyy")}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Superadmin Note */}
        {isSuperAdminUser && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>Superadmin:</strong> To configure system-wide email settings, go to{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-primary"
                  onClick={() => router.push("/dashboard/superadmin/system-settings")}
                >
                  System Settings
                </Button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quota Requests History */}
        {quotaRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quota Request History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quotaRequests.map((req) => (
                  <div key={req.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{req.requestedQuota} emails/month requested</span>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          req.status === "pending" && "bg-yellow-100 text-yellow-800",
                          req.status === "approved" && "bg-green-100 text-green-800",
                          req.status === "denied" && "bg-red-100 text-red-800"
                        )}
                      >
                        {req.status}
                      </span>
                    </div>
                    {req.requestNote && <p className="text-xs text-muted-foreground mb-1">{req.requestNote}</p>}
                    {req.reviewNote && <p className="text-xs text-muted-foreground">Review: {req.reviewNote}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
