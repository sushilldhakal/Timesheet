"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils/cn"

export default function QuotaRequestsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; request: any; action: "approve" | "deny" | null }>({
    open: false,
    request: null,
    action: null,
  })
  const [reviewNote, setReviewNote] = useState("")
  const [processing, setProcessing] = useState(false)

  const isSuperAdminUser = isSuperAdmin(user?.role ?? null)

  useEffect(() => {
    if (isHydrated && isSuperAdminUser) {
      fetchRequests(activeTab)
    } else if (isHydrated && !isSuperAdminUser) {
      router.push("/dashboard")
    }
  }, [isHydrated, isSuperAdminUser, activeTab, router])

  const fetchRequests = async (status: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/superadmin/quota-requests?status=${status}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async () => {
    if (!reviewDialog.request || !reviewDialog.action) return

    if (reviewDialog.action === "deny" && !reviewNote.trim()) {
      toast.error("Please provide a reason for denial")
      return
    }

    try {
      setProcessing(true)
      const res = await fetch(`/api/superadmin/quota-requests/${reviewDialog.request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewDialog.action,
          reviewNote: reviewNote.trim() || undefined,
        }),
      })

      if (res.ok) {
        toast.success(`Request ${reviewDialog.action}d successfully`)
        setReviewDialog({ open: false, request: null, action: null })
        setReviewNote("")
        fetchRequests(activeTab)
      } else {
        toast.error(`Failed to ${reviewDialog.action} request`)
      }
    } catch (error) {
      toast.error("Error processing request")
    } finally {
      setProcessing(false)
    }
  }

  if (!isHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdminUser) {
    return null
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Quota Requests</h1>
        <p className="text-muted-foreground">Review and manage organization quota requests.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">{pendingCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="denied">Denied</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No {activeTab} requests</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request._id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{(request.orgId as any)?.name || "Unknown Org"}</span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                              {request.requestType}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Current: {request.requestType === "storage" ? `${(request.currentQuota / 1073741824).toFixed(2)} GB` : `${request.currentQuota} emails/month`}
                            {" → "}
                            Requested: {request.requestType === "storage" ? `${(request.requestedQuota / 1073741824).toFixed(2)} GB` : `${request.requestedQuota} emails/month`}
                          </p>
                          {request.requestNote && (
                            <p className="text-sm text-muted-foreground mt-1">Note: {request.requestNote}</p>
                          )}
                          {request.reviewNote && (
                            <p className="text-sm text-muted-foreground mt-1 italic">Review: {request.reviewNote}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => setReviewDialog({ open: true, request, action: "approve" })}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setReviewDialog({ open: true, request, action: "deny" })}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Deny
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && setReviewDialog({ open: false, request: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve" : "Deny"} Quota Request
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === "approve"
                ? "This will update the organization's quota immediately."
                : "Please provide a reason for denying this request."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note {reviewDialog.action === "deny" && "(Required)"}</Label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={reviewDialog.action === "approve" ? "Optional note..." : "Reason for denial..."}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, request: null, action: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={processing || (reviewDialog.action === "deny" && !reviewNote.trim())}
              variant={reviewDialog.action === "approve" ? "default" : "destructive"}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                reviewDialog.action === "approve" ? "Approve" : "Deny"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
