"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, HardDrive, Trash2, CalendarIcon, Loader2, Plus } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils/cn"

export default function StorageSettingsPage() {
  const { user, isHydrated } = useAuth()
  const router = useRouter()
  const [storageQuota, setStorageQuota] = useState<any>(null)
  const [mediaFiles, setMediaFiles] = useState<any[]>([])
  const [quotaRequests, setQuotaRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDate, setDeleteDate] = useState<Date>()
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestedQuota, setRequestedQuota] = useState("")
  const [requestNote, setRequestNote] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const isAdmin = isAdminOrSuperAdmin(user?.role ?? null)

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true)
      const [quotaRes, filesRes, requestsRes] = await Promise.all([
        fetch("/api/admin/storage-quota"),
        fetch(`/api/admin/media-files?page=${page}&limit=20`),
        fetch("/api/admin/quota-requests"),
      ])

      if (quotaRes.ok) {
        const data = await quotaRes.json()
        setStorageQuota(data)
      }

      if (filesRes.ok) {
        const data = await filesRes.json()
        setMediaFiles(data.files || [])
        setTotalPages(data.totalPages || 1)
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json()
        setQuotaRequests(data.requests?.filter((r: any) => r.requestType === "storage") || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    if (isHydrated && isAdmin) {
      fetchData()
    }
  })

  const handleDeleteBeforeDate = async () => {
    if (!deleteDate) return

    try {
      const res = await fetch("/api/admin/media-files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beforeDate: deleteDate.toISOString() }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Deleted ${data.deletedCount} files, freed ${(data.freedBytes / 1073741824).toFixed(2)} GB`)
        fetchData()
        setDeleteDate(undefined)
      } else {
        toast.error("Failed to delete files")
      }
    } catch (error) {
      toast.error("Error deleting files")
    }
  }

  const handleRequestQuota = async () => {
    if (!requestedQuota) {
      toast.error("Please enter requested quota")
      return
    }

    try {
      const quotaBytes = parseFloat(requestedQuota) * 1073741824 // Convert GB to bytes
      const res = await fetch("/api/admin/quota-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "storage",
          requestedQuota: quotaBytes,
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

  const usedGB = storageQuota ? (storageQuota.usedBytes / 1073741824).toFixed(2) : 0
  const quotaGB = storageQuota ? (storageQuota.quotaBytes / 1073741824).toFixed(2) : 0
  const usedPercent = storageQuota?.usedPercent || 0

  return (
    <div className="flex flex-col space-y-4 p-4 lg:p-8">
      <div className="mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/setting")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>
        <h1 className="text-2xl font-semibold">Storage Usage</h1>
        <p className="text-muted-foreground">Monitor your storage usage and manage files.</p>
      </div>

      <div className="grid gap-6">
        {/* Storage Usage Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <CardTitle>Storage Usage</CardTitle>
              </div>
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Request More Storage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Storage Increase</DialogTitle>
                    <DialogDescription>Submit a request to increase your storage quota.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Current Quota: {quotaGB} GB</Label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestedQuota">Requested Quota (GB)</Label>
                      <Input
                        id="requestedQuota"
                        type="number"
                        value={requestedQuota}
                        onChange={(e) => setRequestedQuota(e.target.value)}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestNote">Reason (Optional)</Label>
                      <Textarea
                        id="requestNote"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="Why do you need more storage?"
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
                    <span>{usedGB} GB used</span>
                    <span>{quotaGB} GB total</span>
                  </div>
                  <Progress value={usedPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">{usedPercent.toFixed(1)}% used</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Files List Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Files</CardTitle>
            <CardDescription>Your uploaded media files</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : mediaFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No files uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {mediaFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{file.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle>Danger Zone</CardTitle>
            </div>
            <CardDescription>Delete old files to free up storage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Delete files uploaded before</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !deleteDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deleteDate ? format(deleteDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={deleteDate} onSelect={setDeleteDate} disabled={(date) => date > new Date()} />
                  </PopoverContent>
                </Popover>
              </div>
              <Button variant="destructive" onClick={handleDeleteBeforeDate} disabled={!deleteDate}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Files
              </Button>
            </div>
          </CardContent>
        </Card>

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
                      <span className="text-sm font-medium">
                        {(req.requestedQuota / 1073741824).toFixed(2)} GB requested
                      </span>
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
