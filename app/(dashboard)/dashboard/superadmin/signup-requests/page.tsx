"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle, Loader2, ClipboardList } from "lucide-react"
import { toast } from "sonner"

export default function OrgRequestsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; request: any; action: "approve" | "reject" | null }>({
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
      const res = await fetch(`/api/superadmin/org-requests?status=${status}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Error fetching org requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async () => {
    if (!reviewDialog.request || !reviewDialog.action) return

    if (reviewDialog.action === "reject" && !reviewNote.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    try {
      setProcessing(true)
      const res = await fetch(`/api/superadmin/org-requests/${reviewDialog.request._id}`, {
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
        const data = await res.json()
        toast.error(data.error || `Failed to ${reviewDialog.action} request`)
      }
    } catch {
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

  const pendingCount = activeTab === "pending" ? requests.length : 0

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">Org Requests</h1>
        <p className="text-muted-foreground">Review and approve new organisation signup requests.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle>Requests</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending{pendingCount > 0 && <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">{pendingCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No {activeTab} requests</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request._id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{request.orgName}</span>
                            {request.planInterest && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full capitalize">
                                {request.planInterest}
                              </span>
                            )}
                            {request.companySize && (
                              <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                                {request.companySize} employees
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{request.contactName}</p>
                          <p className="text-sm text-muted-foreground">{request.email}</p>
                          {request.phone && (
                            <p className="text-sm text-muted-foreground">{request.phone}</p>
                          )}
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-2 italic">"{request.message}"</p>
                          )}
                          {request.reviewNote && (
                            <p className="text-sm text-muted-foreground mt-1">Review note: {request.reviewNote}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex gap-2 shrink-0">
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
                              onClick={() => setReviewDialog({ open: true, request, action: "reject" })}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
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

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => !open && setReviewDialog({ open: false, request: null, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve Org Request" : "Reject Org Request"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === "approve"
                ? "This will create the organisation and its admin user account."
                : "Please provide a reason for rejecting this request."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note {reviewDialog.action === "reject" && "(Required)"}</Label>
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={reviewDialog.action === "approve" ? "Optional note..." : "Reason for rejection..."}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialog({ open: false, request: null, action: null })
                setReviewNote("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={processing || (reviewDialog.action === "reject" && !reviewNote.trim())}
              variant={reviewDialog.action === "approve" ? "default" : "destructive"}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : reviewDialog.action === "approve" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
