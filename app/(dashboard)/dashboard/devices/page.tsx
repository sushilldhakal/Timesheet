"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { isAdmin } from "@/lib/config/roles"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Smartphone, Ban, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

type DeviceStatus = "active" | "disabled" | "revoked"

type DeviceRow = {
  _id: string
  deviceId: string
  locationName: string
  locationAddress?: string
  status: DeviceStatus
  registeredBy: {
    _id: string
    name: string
    username: string
  }
  registeredAt: string
  lastActivity: string
  revokedAt?: string
  revokedBy?: {
    _id: string
    name: string
    username: string
  }
  revocationReason?: string
}

type ActionType = "disable" | "enable" | "revoke"

export default function DevicesPage() {
  const { user, isHydrated } = useAuth()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionDevice, setActionDevice] = useState<DeviceRow | null>(null)
  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [revocationReason, setRevocationReason] = useState("")
  const [processing, setProcessing] = useState(false)

  const userIsAdmin = isAdmin(user?.role ?? null)

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/device/manage")
      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices ?? [])
      } else {
        setDevices([])
        if (res.status === 401) {
          toast.error("Unauthorized access")
        }
      }
    } catch {
      setDevices([])
      toast.error("Failed to fetch devices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isHydrated && userIsAdmin) {
      fetchDevices()
    } else {
      setLoading(false)
    }
  }, [isHydrated, userIsAdmin])

  const handleAction = async () => {
    if (!actionDevice || !actionType) return

    setProcessing(true)
    try {
      const res = await fetch("/api/device/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: actionDevice.deviceId,
          action: actionType,
          reason: actionType === "revoke" ? revocationReason : undefined,
        }),
      })

      if (res.ok) {
        toast.success(`Device ${actionType}d successfully`)
        fetchDevices()
        closeDialog()
      } else {
        const data = await res.json()
        toast.error(data.error || `Failed to ${actionType} device`)
      }
    } catch {
      toast.error(`Failed to ${actionType} device`)
    } finally {
      setProcessing(false)
    }
  }

  const openDialog = (device: DeviceRow, action: ActionType) => {
    setActionDevice(device)
    setActionType(action)
    setRevocationReason("")
  }

  const closeDialog = () => {
    setActionDevice(null)
    setActionType(null)
    setRevocationReason("")
  }

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case "disabled":
        return (
          <Badge variant="secondary">
            <Ban className="h-3 w-3 mr-1" />
            Disabled
          </Badge>
        )
      case "revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Revoked
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

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
            Only administrators can access device management.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Devices</h1>
          <p className="text-muted-foreground">
            Manage registered tablet devices and their locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {devices.length} device{devices.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
          <CardDescription>
            View and manage device status. Revoked devices require complete re-registration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Loading devices...</p>
          ) : devices.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No devices registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Registered By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device._id}>
                      <TableCell className="font-medium">{device.locationName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {device.locationAddress || "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(device.registeredAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(device.lastActivity)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {device.registeredBy?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {device.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog(device, "disable")}
                              >
                                Disable
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDialog(device, "revoke")}
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                          {device.status === "disabled" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openDialog(device, "enable")}
                              >
                                Enable
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDialog(device, "revoke")}
                              >
                                Revoke
                              </Button>
                            </>
                          )}
                          {device.status === "revoked" && (
                            <div className="text-sm text-muted-foreground">
                              <div>Revoked: {formatDate(device.revokedAt!)}</div>
                              {device.revokedBy && (
                                <div>By: {device.revokedBy.name}</div>
                              )}
                              {device.revocationReason && (
                                <div className="italic">"{device.revocationReason}"</div>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionDevice} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "revoke" && "Revoke Device"}
              {actionType === "disable" && "Disable Device"}
              {actionType === "enable" && "Enable Device"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "revoke" && (
                <>
                  <p className="mb-4">
                    Are you sure you want to revoke this device? This action will:
                  </p>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li>Immediately invalidate the device token</li>
                    <li>Require complete re-registration</li>
                    <li>Cannot be undone</li>
                  </ul>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for revocation (optional)</Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Device lost or stolen"
                      value={revocationReason}
                      onChange={(e) => setRevocationReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
              {actionType === "disable" && (
                <p>
                  This will temporarily disable the device. The device can be re-enabled later.
                </p>
              )}
              {actionType === "enable" && (
                <p>
                  This will re-enable the device, allowing it to access the system again.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={processing}
              className={actionType === "revoke" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {processing ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
