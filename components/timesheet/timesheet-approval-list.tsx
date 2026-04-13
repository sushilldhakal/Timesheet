"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Lock,
  Loader2,
  FileText,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { format } from "date-fns"

interface TimesheetRow {
  _id: string
  tenantId: string
  employeeId: {
    _id: string
    name: string
    pin: string
    email?: string
  } | string
  payPeriodStart: string
  payPeriodEnd: string
  shiftIds: string[]
  totalShifts: number
  totalHours: number
  totalCost: number
  totalBreakMinutes: number
  status: "draft" | "submitted" | "approved" | "rejected" | "locked"
  submittedBy?: { email: string } | null
  submittedAt?: string | null
  approvedBy?: { email: string } | null
  approvedAt?: string | null
  rejectedBy?: { email: string } | null
  rejectedAt?: string | null
  rejectionReason?: string
  lockedBy?: { email: string } | null
  lockedAt?: string | null
  payRunId?: string | null
  notes?: string
  submissionNotes?: string
  createdAt: string
  updatedAt: string
}

interface TimesheetApprovalListProps {
  onViewTimesheet?: (id: string) => void
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  draft: { label: "Draft", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  submitted: { label: "Submitted", variant: "default", icon: <Send className="h-3 w-3" /> },
  approved: { label: "Approved", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  locked: { label: "Locked", variant: "outline", icon: <Lock className="h-3 w-3" /> },
}

export function TimesheetApprovalList({ onViewTimesheet }: TimesheetApprovalListProps) {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [employees, setEmployees] = useState<{ _id: string; name: string; pin: string }[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bulkSelected, setBulkSelected] = useState<string[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectTargetId, setRejectTargetId] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await fetch("/api/me")
        if (res.ok) {
          const json = await res.json()
          const data = json.data || json
          setTenantId(data.tenantId || "")
        }
      } catch (err) {
        console.error("Failed to fetch tenant:", err)
      }
    }
    fetchTenant()
  }, [])

  const fetchTimesheetApprovals = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ tenantId })
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/timesheets/approvals?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTimesheets(data.data?.timesheets || data.timesheets || [])
      }
    } catch (err) {
      console.error("Failed to fetch timesheet approvals:", err)
      setTimesheets([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, statusFilter])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/employees?limit=500")
      if (res.ok) {
        const json = await res.json()
        const data = json.data || json
        setEmployees(
          (data.employees || []).map((e: any) => ({
            _id: e._id || e.id,
            name: e.name,
            pin: e.pin,
          }))
        )
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err)
    }
  }, [])

  useEffect(() => {
    if (tenantId) {
      fetchTimesheetApprovals()
      fetchEmployees()
    }
  }, [tenantId, fetchTimesheetApprovals, fetchEmployees])

  const handleCreate = async () => {
    if (!selectedEmployeeId || !periodStart || !periodEnd || !tenantId) return
    setCreating(true)
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          employeeId: selectedEmployeeId,
          payPeriodStart: periodStart,
          payPeriodEnd: periodEnd,
        }),
      })
      if (res.ok) {
        setCreateDialogOpen(false)
        setSelectedEmployeeId("")
        setPeriodStart("")
        setPeriodEnd("")
        fetchTimesheetApprovals()
      } else {
        const err = await res.json()
        alert(err.data?.error || err.error || "Failed to create timesheet")
      }
    } catch (err) {
      console.error("Failed to create timesheet:", err)
    } finally {
      setCreating(false)
    }
  }

  const handleAction = async (
    timesheetId: string,
    action: "submit" | "approve" | "reject" | "lock",
    extraBody?: Record<string, string>
  ) => {
    setActionLoading(timesheetId)
    try {
      const res = await fetch(`/api/timesheets/${timesheetId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extraBody || {}),
      })
      if (res.ok) {
        fetchTimesheetApprovals()
      } else {
        const err = await res.json()
        alert(err.data?.error || err.error || `Failed to ${action} timesheet`)
      }
    } catch (err) {
      console.error(`Failed to ${action} timesheet:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkApprove = async () => {
    const submittedIds = bulkSelected.filter((id) => {
      const ts = timesheets.find((t) => t._id === id)
      return ts?.status === "submitted"
    })
    if (submittedIds.length === 0) return

    for (const id of submittedIds) {
      await handleAction(id, "approve")
    }
    setBulkSelected([])
  }

  const openRejectDialog = (id: string) => {
    setRejectTargetId(id)
    setRejectionReason("")
    setRejectDialogOpen(true)
  }

  const confirmReject = async () => {
    if (!rejectionReason.trim()) return
    await handleAction(rejectTargetId, "reject", {
      rejectionReason: rejectionReason.trim(),
    })
    setRejectDialogOpen(false)
    setRejectTargetId("")
    setRejectionReason("")
  }

  const getEmployeeName = (row: TimesheetRow): string => {
    if (typeof row.employeeId === "object" && row.employeeId !== null) {
      return row.employeeId.name
    }
    return "Unknown"
  }

  const formatDateShort = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy")
    } catch {
      return dateStr
    }
  }

  const stats = useMemo(() => {
    return {
      total: timesheets.length,
      pending: timesheets.filter((t) => t.status === "submitted").length,
      approved: timesheets.filter((t) => t.status === "approved").length,
      locked: timesheets.filter((t) => t.status === "locked").length,
      rejected: timesheets.filter((t) => t.status === "rejected").length,
    }
  }, [timesheets])

  const columns = useMemo<ColumnDef<TimesheetRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value)
              if (value) {
                setBulkSelected(timesheets.map((t) => t._id))
              } else {
                setBulkSelected([])
              }
            }}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={bulkSelected.includes(row.original._id)}
            onCheckedChange={(value) => {
              setBulkSelected((prev) =>
                value
                  ? [...prev, row.original._id]
                  : prev.filter((id) => id !== row.original._id)
              )
            }}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "employeeId",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Employee" />,
        cell: ({ row }) => (
          <div className="font-medium">{getEmployeeName(row.original)}</div>
        ),
      },
      {
        id: "payPeriod",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Pay Period" />,
        cell: ({ row }) => (
          <div className="text-sm">
            {formatDateShort(row.original.payPeriodStart)} –{" "}
            {formatDateShort(row.original.payPeriodEnd)}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const cfg = statusConfig[row.original.status]
          return (
            <Badge variant={cfg?.variant ?? "secondary"} className="gap-1">
              {cfg?.icon}
              {cfg?.label ?? row.original.status}
            </Badge>
          )
        },
      },
      {
        accessorKey: "totalShifts",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Shifts" />,
        cell: ({ row }) => <span>{row.original.totalShifts}</span>,
      },
      {
        accessorKey: "totalHours",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Hours" />,
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.totalHours.toFixed(1)}h
          </span>
        ),
      },
      {
        accessorKey: "totalCost",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Cost" />,
        cell: ({ row }) => (
          <span className="font-medium">
            ${row.original.totalCost.toFixed(2)}
          </span>
        ),
      },
      {
        id: "submitted",
        header: "Submitted",
        cell: ({ row }) =>
          row.original.submittedAt ? (
            <span className="text-xs text-muted-foreground">
              {formatDateShort(row.original.submittedAt)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "approved",
        header: "Approved",
        cell: ({ row }) =>
          row.original.approvedAt ? (
            <span className="text-xs text-muted-foreground">
              {formatDateShort(row.original.approvedAt)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const ts = row.original
          const isLoading = actionLoading === ts._id
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onViewTimesheet?.(ts._id)}
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </Button>

              {ts.status === "draft" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-600 hover:text-blue-700"
                  onClick={() => handleAction(ts._id, "submit")}
                  disabled={isLoading}
                  title="Submit for approval"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              )}

              {ts.status === "submitted" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:text-green-700"
                    onClick={() => handleAction(ts._id, "approve")}
                    disabled={isLoading}
                    title="Approve"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => openRejectDialog(ts._id)}
                    disabled={isLoading}
                    title="Reject"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}

              {ts.status === "approved" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-600 hover:text-amber-700"
                  onClick={() => {
                    const payRunId = prompt("Enter PayRun ID to lock this timesheet:")
                    if (payRunId) handleAction(ts._id, "lock", { payRunId })
                  }}
                  disabled={isLoading}
                  title="Lock for payrun"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [timesheets, bulkSelected, actionLoading, onViewTimesheet]
  )

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-xl font-bold text-blue-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Locked</p>
                <p className="text-xl font-bold text-amber-600">{stats.locked}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Rejected</p>
                <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Timesheet Approvals</CardTitle>
            <div className="flex items-center gap-2">
              {bulkSelected.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkApprove}
                  className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Bulk Approve ({bulkSelected.filter((id) => timesheets.find((t) => t._id === id)?.status === "submitted").length})
                </Button>
              )}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="locked">Locked</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New Timesheet
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : timesheets.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <Users className="mb-2 h-8 w-8" />
              <p>No timesheets found</p>
              <p className="text-xs">Create one to get started</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={timesheets}
              enableRowSelection
              onRowClick={(row) => onViewTimesheet?.(row._id)}
              emptyMessage="No timesheets match the current filter."
            />
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Timesheet</DialogTitle>
            <DialogDescription>
              Create a draft timesheet for an employee. All shifts within the pay period will be
              auto-linked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.name} ({emp.pin})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !selectedEmployeeId || !periodStart || !periodEnd}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this timesheet. The employee will be able to view the
              reason and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Missing clock-out for Tuesday shift, please correct and resubmit"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionReason.trim()}
            >
              Reject Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
