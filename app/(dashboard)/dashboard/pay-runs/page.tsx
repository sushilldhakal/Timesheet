"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, ArrowLeft, Download, Calculator, CheckCircle, Eye, Loader2, FileDown } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExportDialog } from "@/components/payroll/export-dialog"
import { PayrollExportStatus } from "@/components/payroll/payroll-export-status"

interface PayRun {
  _id: string
  tenantId: string
  startDate: string
  endDate: string
  status: 'draft' | 'calculated' | 'approved' | 'exported'
  totals: {
    gross: number
    tax: number
    super: number
    net: number
    totalHours: number
    employeeCount: number
  }
  notes?: string
  exportedAt?: string
  exportType?: string
  exportReference?: string
  createdAt: string
  updatedAt: string
}

interface PayItem {
  type: string
  name: string
  exportName: string
  from: string
  to: string
  hours: number
  rate: number
  multiplier: number
  amount: number
  awardLevel: string
  baseRate: number
}

interface PayRunExport {
  payRun: PayRun
  employees: Array<{
    employeeId: string
    employeeName: string
    totalHours: number
    totalAmount: number
    payItems: PayItem[]
  }>
}

interface JobStatus {
  status: string
  progress?: number
  result?: {
    success: boolean
    payRunId: string
    totalEmployees: number
    totalShifts: number
    totals: PayRun['totals']
  }
  error?: string
}

export default function PayRunsPage() {
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [payRuns, setPayRuns] = useState<PayRun[]>([])
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null)
  const [payRunDetail, setPayRunDetail] = useState<PayRunExport | null>(null)
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [calculatingJobs, setCalculatingJobs] = useState<Set<string>>(new Set())
  const [jobErrors, setJobErrors] = useState<Map<string, string>>(new Map())
  const [tenantId, setTenantId] = useState<string>("")
  const [loadingTenant, setLoadingTenant] = useState(true)

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportPayRunId, setExportPayRunId] = useState<string>("")

  // Create dialog form state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [creating, setCreating] = useState(false)

  // Fetch current user's tenant
  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const response = await fetch('/api/me')
        if (response.ok) {
          const json = await response.json()
          const data = json.data || json
          setTenantId(data.tenantId || "")
        } else {
          console.error('Failed to fetch tenant, status:', response.status)
        }
      } catch (error) {
        console.error('Failed to fetch tenant:', error)
      } finally {
        setLoadingTenant(false)
      }
    }
    fetchTenant()
  }, [])

  const fetchPayRuns = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/pay-runs?tenantId=${tenantId}`)
      if (response.ok) {
        const data = await response.json()
        setPayRuns(data.payRuns || [])
      }
    } catch (error) {
      console.error('Failed to fetch pay runs:', error)
      setPayRuns([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const fetchPayRunDetail = useCallback(async (payRunId: string) => {
    try {
      const response = await fetch(`/api/pay-runs/${payRunId}/export`)
      if (response.ok) {
        const data = await response.json()
        setPayRunDetail(data.data ?? data)
      }
    } catch (error) {
      console.error('Failed to fetch pay run detail:', error)
      setPayRunDetail(null)
    }
  }, [])

  useEffect(() => {
    if (!loadingTenant && tenantId) {
      fetchPayRuns()
    }
  }, [tenantId, loadingTenant, fetchPayRuns])

  const handleCreatePayRun = async () => {
    if (!startDate || !endDate || !tenantId) return

    setCreating(true)
    try {
      const response = await fetch('/api/pay-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          startDate,
          endDate,
          notes: notes || undefined
        })
      })
      
      if (response.ok) {
        setCreateDialogOpen(false)
        setStartDate("")
        setEndDate("")
        setNotes("")
        fetchPayRuns()
      }
    } catch (error) {
      console.error('Failed to create pay run:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleCalculate = async (payRun: PayRun) => {
    setCalculatingJobs(prev => new Set(prev).add(payRun._id))
    setJobErrors(prev => {
      const newMap = new Map(prev)
      newMap.delete(payRun._id)
      return newMap
    })

    try {
      const response = await fetch(`/api/pay-runs/${payRun._id}/calculate`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Start polling for job status
        pollJobStatus(payRun._id)
      } else {
        throw new Error('Failed to queue calculation')
      }
    } catch (error) {
      console.error('Failed to calculate pay run:', error)
      setCalculatingJobs(prev => {
        const newSet = new Set(prev)
        newSet.delete(payRun._id)
        return newSet
      })
      setJobErrors(prev => new Map(prev).set(payRun._id, 'Failed to start calculation'))
    }
  }

  const pollJobStatus = (payRunId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pay-runs/${payRunId}/status`)
        if (response.ok) {
          const status: JobStatus = await response.json()
          
          if (status.status === 'completed') {
            clearInterval(interval)
            setCalculatingJobs(prev => {
              const newSet = new Set(prev)
              newSet.delete(payRunId)
              return newSet
            })
            fetchPayRuns() // Refresh to show updated status
          } else if (status.status === 'failed') {
            clearInterval(interval)
            setCalculatingJobs(prev => {
              const newSet = new Set(prev)
              newSet.delete(payRunId)
              return newSet
            })
            setJobErrors(prev => new Map(prev).set(payRunId, status.error || 'Calculation failed'))
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error)
      }
    }, 2000)

    // Clean up interval after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000)
  }

  const handleApprove = async (payRun: PayRun) => {
    try {
      const response = await fetch(`/api/pay-runs/${payRun._id}/approve`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchPayRuns()
      }
    } catch (error) {
      console.error('Failed to approve pay run:', error)
    }
  }

  const handleOpenExportDialog = (payRun: PayRun) => {
    setExportPayRunId(payRun._id)
    setExportDialogOpen(true)
  }

  const handleViewDetail = (payRun: PayRun) => {
    setSelectedPayRun(payRun)
    setView('detail')
    fetchPayRunDetail(payRun._id)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: PayRun['status']) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-700',
      calculated: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      exported: 'bg-purple-100 text-purple-700'
    }
    
    return (
      <Badge className={variants[status]}>
        {status}
      </Badge>
    )
  }

  const columns = useMemo<ColumnDef<PayRun>[]>(() => [
    {
      accessorKey: "period",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Period" />
      ),
      cell: ({ row }) => {
        const payRun = row.original
        return `${formatDate(payRun.startDate)} – ${formatDate(payRun.endDate)}`
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => getStatusBadge(row.original.status),
      enableSorting: false,
    },
    {
      accessorKey: "gross",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Gross" />
      ),
      cell: ({ row }) => `$${row.original.totals.gross.toFixed(2)}`,
      enableSorting: false,
    },
    {
      accessorKey: "hours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hours" />
      ),
      cell: ({ row }) => row.original.totals.totalHours.toFixed(1),
      enableSorting: false,
    },
    {
      accessorKey: "employees",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employees" />
      ),
      cell: ({ row }) => row.original.totals.employeeCount,
      enableSorting: false,
    },
    {
      id: "exportStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Export Status" />
      ),
      cell: ({ row }) => {
        const payRun = row.original
        return (
          <PayrollExportStatus
            exportedAt={payRun.exportedAt}
            exportType={payRun.exportType}
            exportReference={payRun.exportReference}
            onReExport={() => handleOpenExportDialog(payRun)}
          />
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const payRun = row.original
        const isCalculating = calculatingJobs.has(payRun._id)
        const error = jobErrors.get(payRun._id)
        
        return (
          <div className="flex flex-col gap-1" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleViewDetail(payRun)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
              
              {payRun.status === 'draft' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCalculate(payRun)}
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1" />
                  )}
                  Calculate
                </Button>
              )}
              
              {payRun.status === 'calculated' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApprove(payRun)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              )}
              
              {(payRun.status === 'approved' || payRun.status === 'exported') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenExportDialog(payRun)}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Export to Payroll
                </Button>
              )}
            </div>
            
            {error && (
              <div className="text-xs text-red-600">{error}</div>
            )}
          </div>
        )
      },
    },
  ], [calculatingJobs, jobErrors])

  if (view === 'detail' && selectedPayRun) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('list')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pay Runs
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              Pay Run: {formatDate(selectedPayRun.startDate)} – {formatDate(selectedPayRun.endDate)}
            </h1>
          </div>
          {getStatusBadge(selectedPayRun.status)}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gross</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${selectedPayRun.totals.gross.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Super</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${selectedPayRun.totals.super.toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedPayRun.totals.totalHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedPayRun.totals.employeeCount}</div>
            </CardContent>
          </Card>
        </div>

        {payRunDetail && payRunDetail.employees && payRunDetail.employees.length > 0 && (
          <div className="space-y-6">
            {payRunDetail.employees.map((employee) => (
              <Card key={employee.employeeId}>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{employee.employeeName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Type</th>
                          <th className="text-left py-2">Export Code</th>
                          <th className="text-left py-2">From → To</th>
                          <th className="text-right py-2">Hours</th>
                          <th className="text-right py-2">Rate</th>
                          <th className="text-right py-2">×Multiplier</th>
                          <th className="text-right py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.payItems.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{item.type}</td>
                            <td className="py-2">{item.exportName}</td>
                            <td className="py-2">
                              {new Date(item.from).toLocaleTimeString('en-AU', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} → {new Date(item.to).toLocaleTimeString('en-AU', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </td>
                            <td className="text-right py-2">{item.hours.toFixed(2)}</td>
                            <td className="text-right py-2">${item.rate.toFixed(2)}</td>
                            <td className="text-right py-2">×{item.multiplier.toFixed(2)}</td>
                            <td className="text-right py-2">${item.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pay Runs</h1>
          <p className="text-muted-foreground">
            Manage payroll periods and export pay items
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          disabled={loadingTenant || !tenantId}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Pay Run
        </Button>
      </div>

      <Card className="border-none shadow-none ring-0">
        <CardContent>
          <DataTable
            columns={columns}
            data={payRuns}
            loading={loading}
            emptyMessage="No pay runs yet. Click New Pay Run to create one."
          />
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Pay Run</DialogTitle>
            <DialogDescription>
              Set the pay period dates and optional notes for this pay run.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this pay run..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePayRun}
              disabled={!startDate || !endDate || creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Pay Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {exportPayRunId && (
        <ExportDialog
          payRunId={exportPayRunId}
          tenantId={tenantId}
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExportComplete={() => fetchPayRuns()}
        />
      )}
    </div>
  )
}