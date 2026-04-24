"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { type ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ArrowLeft, Calculator, CheckCircle, Eye, Loader2, FileDown, CalendarIcon, AlertCircle, Clock, FileText } from "lucide-react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"
import { FormDialogShell } from "@/components/shared/forms/FormDialogShell"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExportDialog } from "@/components/payroll/export-dialog"
import { PayrollExportStatus } from "@/components/payroll/payroll-export-status"
import { apiFetch } from "@/lib/api/fetch-client"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { format, addDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  getPayRuns,
  getPayRunDetail,
  createPayRun,
  calculatePayRun,
  getPayRunJobStatus,
  approvePayRun,
  type PayRun,
  type PayRunDetail,
  type PayRunJobStatusResponse,
} from "@/lib/api/pay-runs"

export default function PayRunsPage() {
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [payRuns, setPayRuns] = useState<PayRun[]>([])
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null)
  const [payRunDetail, setPayRunDetail] = useState<PayRunDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [creating, setCreating] = useState(false)

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && !range.to) {
      setDateRange({ from: range.from, to: addDays(range.from, 6) })
    } else {
      setDateRange(range)
    }
  }

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const json = await apiFetch<{ data?: { tenantId?: string }; tenantId?: string }>('/api/me')
        const data = (json as any).data || json
        setTenantId(data.tenantId || "")
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
      const data = await getPayRuns(tenantId)
      setPayRuns(data.payRuns || [])
    } catch (error) {
      console.error('Failed to fetch pay runs:', error)
      setPayRuns([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const fetchPayRunDetail = useCallback(async (payRunId: string) => {
    setDetailLoading(true)
    try {
      const data = await getPayRunDetail(payRunId)
      setPayRunDetail(data)
      // Update selectedPayRun with fresh data from detail response
      setSelectedPayRun(data.payRun as PayRun)
    } catch (error) {
      console.error('Failed to fetch pay run detail:', error)
      setPayRunDetail(null)
    } finally {
      setDetailLoading(false)
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
      await createPayRun({ tenantId, startDate, endDate, notes: notes || undefined })
      setCreateDialogOpen(false)
      setDateRange(undefined)
      setNotes("")
      fetchPayRuns()
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
      await calculatePayRun(payRun._id)
      pollJobStatus(payRun._id)
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
        const statusData: PayRunJobStatusResponse = await getPayRunJobStatus(payRunId)
        const { payRunStatus, job } = statusData
        const jobStatus = job?.status

        const isTerminal =
          payRunStatus === 'calculated' ||
          payRunStatus === 'approved' ||
          payRunStatus === 'exported' ||
          payRunStatus === 'failed' ||
          jobStatus === 'completed' ||
          jobStatus === 'failed'

        if (isTerminal) {
          clearInterval(interval)
          setCalculatingJobs(prev => {
            const next = new Set(prev)
            next.delete(payRunId)
            return next
          })
          if (payRunStatus === 'failed' || jobStatus === 'failed') {
            setJobErrors(prev => new Map(prev).set(payRunId, statusData.jobError || 'Calculation failed'))
          }
          fetchPayRuns()
        }
      } catch (error) {
        console.error('Failed to poll job status:', error)
      }
    }, 2000)

    setTimeout(() => clearInterval(interval), 5 * 60 * 1000)
  }

  const handleApprove = async (payRun: PayRun) => {
    try {
      await approvePayRun(payRun._id)
      fetchPayRuns()
      if (view === 'detail' && selectedPayRun?._id === payRun._id) {
        fetchPayRunDetail(payRun._id)
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: PayRun['status']) => {
    const variants: Record<PayRun['status'], string> = {
      draft: 'bg-gray-100 text-gray-700',
      calculated: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      exported: 'bg-purple-100 text-purple-700',
      failed: 'bg-red-100 text-red-700'
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
        const days = Math.round((new Date(payRun.endDate).getTime() - new Date(payRun.startDate).getTime()) / (1000 * 60 * 60 * 24) + 1)
        return (
          <div>
            <div className="font-medium">{formatDate(payRun.startDate)} – {formatDate(payRun.endDate)}</div>
            <div className="text-xs text-muted-foreground">{days} days</div>
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const payRun = row.original
        const error = jobErrors.get(payRun._id)
        return (
          <div className="space-y-1">
            {getStatusBadge(payRun.status)}
            {error && <div className="text-xs text-red-600 max-w-[200px] truncate" title={error}>{error}</div>}
          </div>
        )
      },
      enableSorting: false,
    },
    {
      accessorKey: "gross",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Gross / Net" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">${row.original.totals.gross.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">${row.original.totals.net.toFixed(2)} net</div>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "super",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Super" />
      ),
      cell: ({ row }) => `$${row.original.totals.super.toFixed(2)}`,
      enableSorting: false,
    },
    {
      accessorKey: "hours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hours / Emp" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.totals.totalHours.toFixed(1)}h</div>
          <div className="text-xs text-muted-foreground">{row.original.totals.employeeCount} emp</div>
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "exportStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Export" />
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

        return (
          <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => handleViewDetail(payRun)}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>

            {payRun.status === 'draft' && (
              <Button variant="ghost" size="sm" onClick={() => handleCalculate(payRun)} disabled={isCalculating}>
                {isCalculating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
                Calculate
              </Button>
            )}

            {payRun.status === 'calculated' && (
              <Button variant="ghost" size="sm" onClick={() => handleApprove(payRun)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}

            {(payRun.status === 'approved' || payRun.status === 'exported') && (
              <Button variant="ghost" size="sm" onClick={() => handleOpenExportDialog(payRun)}>
                <FileDown className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        )
      },
    },
  ], [calculatingJobs, jobErrors])

  // Detail View Render
  if (view === 'detail' && selectedPayRun) {
    const detail = payRunDetail
    // Use fresh detail data for pay run core fields if available, fallback to selectedPayRun
    const pr = detail?.payRun || selectedPayRun

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setView('list')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">
                {formatDate(pr.startDate)} – {formatDate(pr.endDate)}
              </h1>
              <p className="text-sm text-muted-foreground">
                Pay Run • {detail?.summary.periodDays || 0} days • {detail?.summary.lineItemCount || 0} line items
              </p>
            </div>
            {getStatusBadge(pr.status)}
          </div>
          <div className="flex gap-2">
            {pr.status === 'draft' && (
              <Button onClick={() => handleCalculate(pr)} disabled={calculatingJobs.has(pr._id)}>
                {calculatingJobs.has(pr._id) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                Calculate
              </Button>
            )}
            {pr.status === 'calculated' && (
              <Button onClick={() => handleApprove(pr)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
            {(pr.status === 'approved' || pr.status === 'exported') && (
              <Button onClick={() => handleOpenExportDialog(pr)}>
                <FileDown className="h-4 w-4 mr-2" />
                Export to Payroll
              </Button>
            )}
          </div>
        </div>

        {/* Error/Job State Alert */}
        {pr.jobError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Calculation Error:</strong> {pr.jobError}
            </AlertDescription>
          </Alert>
        )}

        {detailLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : detail ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Gross Pay</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${pr.totals.gross.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${detail.summary.averageEmployeeCost.toFixed(2)} avg/emp
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Net Pay</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${pr.totals.net.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tax ${pr.totals.tax.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Superannuation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${pr.totals.super.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pr.totals.gross > 0 ? ((pr.totals.super / pr.totals.gross) * 100).toFixed(1) : 0}% of gross
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pr.totals.totalHours.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${detail.summary.averageHourlyCost.toFixed(2)}/hr avg
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Metadata & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pay Run Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">{formatDateTime(pr.createdAt)}</p>
                  </div>
                  {pr.approvedAt && (
                    <div>
                      <p className="text-muted-foreground">Approved</p>
                      <p className="font-medium">{formatDateTime(pr.approvedAt)}</p>
                    </div>
                  )}
                  {pr.exportedAt && (
                    <div>
                      <p className="text-muted-foreground">Exported</p>
                      <p className="font-medium">{formatDateTime(pr.exportedAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Employees</p>
                    <p className="font-medium">{pr.totals.employeeCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Line Items</p>
                    <p className="font-medium">{detail.summary.lineItemCount}</p>
                  </div>
                </div>
                {pr.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{pr.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabs: Breakdown, Employees, Export History */}
            <Tabs defaultValue="employees" className="w-full">
              <TabsList>
                <TabsTrigger value="employees">Employees ({detail.employees.length})</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown by Type</TabsTrigger>
                <TabsTrigger value="exports">Export History ({detail.exports.length})</TabsTrigger>
              </TabsList>

              {/* Employees Tab */}
              <TabsContent value="employees" className="space-y-4 mt-4">
                {detail.employees.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No employees in this pay run
                    </CardContent>
                  </Card>
                ) : (
                  <Accordion type="single" collapsible className="space-y-2">
                    {detail.employees.map((emp) => (
                      <AccordionItem key={emp.employeeId} value={emp.employeeId} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="text-left">
                              <div className="font-semibold">{emp.employeeName}</div>
                              <div className="text-xs text-muted-foreground">
                                {emp.payItemCount} items • {emp.totalHours.toFixed(1)}h @ ${emp.averageRate.toFixed(2)}/hr avg
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">${emp.totalAmount.toFixed(2)}</div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 font-medium">Type</th>
                                    <th className="text-left py-2 font-medium">Export Code</th>
                                    <th className="text-left py-2 font-medium">Period</th>
                                    <th className="text-right py-2 font-medium">Hours</th>
                                    <th className="text-right py-2 font-medium">Rate</th>
                                    <th className="text-right py-2 font-medium">Mult.</th>
                                    <th className="text-right py-2 font-medium">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emp.payItems.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                      <td className="py-2 capitalize">{item.type.replace('_', ' ')}</td>
                                      <td className="py-2 font-mono text-xs">{item.exportName}</td>
                                      <td className="py-2 text-xs text-muted-foreground">
                                        {new Date(item.from).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                        {' → '}
                                        {new Date(item.to).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="text-right py-2">{item.hours.toFixed(2)}</td>
                                      <td className="text-right py-2">${item.rate.toFixed(2)}</td>
                                      <td className="text-right py-2">×{item.multiplier.toFixed(2)}</td>
                                      <td className="text-right py-2 font-medium">${item.amount.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsContent>

              {/* Breakdown Tab */}
              <TabsContent value="breakdown" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {detail.breakdown.byType.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No breakdown data available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detail.breakdown.byType.map((typeData) => (
                          <div key={typeData.type} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium capitalize">{typeData.type.replace('_', ' ')}</div>
                              <div className="text-xs text-muted-foreground">
                                {typeData.lineCount} lines • {typeData.hours.toFixed(1)}h
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">${typeData.amount.toFixed(2)}</div>
                              <div className="text-xs text-muted-foreground">
                                ${typeData.hours > 0 ? (typeData.amount / typeData.hours).toFixed(2) : '0.00'}/hr
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Export History Tab */}
              <TabsContent value="exports" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    {detail.exports.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No export history yet</p>
                        <p className="text-xs mt-1">Export this pay run to create a record</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detail.exports.map((exp) => (
                          <div key={exp._id} className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{exp.exportSystem}</span>
                                <Badge variant={exp.status === 'success' ? 'default' : exp.status === 'failed' ? 'destructive' : 'secondary'}>
                                  {exp.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {exp.exportedAt ? formatDateTime(exp.exportedAt) : 'Not exported yet'}
                                {' • '}
                                {exp.rowCount} rows
                                {exp.retryCount > 0 && ` • ${exp.retryCount} retries`}
                              </div>
                              {exp.externalRef && (
                                <div className="text-xs font-mono text-muted-foreground">
                                  Ref: {exp.externalRef}
                                </div>
                              )}
                              {exp.errorLog && (
                                <div className="text-xs text-red-600 mt-1 max-w-md">
                                  {exp.errorLog}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Failed to load pay run details
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // List View Render
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

      <FormDialogShell
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="Create New Pay Run"
        description="Set the pay period dates and optional notes for this pay run."
        onSubmit={(e) => {
          e.preventDefault();
          handleCreatePayRun();
        }}
        submitLabel={creating ? "Creating..." : "Create Pay Run"}
        loading={creating}
        disabled={!startDate || !endDate}
      >
        <div className="space-y-4">
          <div>
            <Label>Pay Period (Week)</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-1"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd MMM yyyy")} – {format(dateRange.to, "dd MMM yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd MMM yyyy")
                    )
                  ) : (
                    <span className="text-muted-foreground">Select a week</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  initialFocus
                />
                {dateRange?.from && dateRange?.to && (
                  <div className="px-3 pb-3 text-xs text-muted-foreground text-center">
                    {Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24) + 1)} days selected
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
      </FormDialogShell>

      {exportPayRunId && (
        <ExportDialog
          payRunId={exportPayRunId}
          tenantId={tenantId}
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExportComplete={() => {
            fetchPayRuns()
            if (view === 'detail' && selectedPayRun?._id === exportPayRunId) {
              fetchPayRunDetail(exportPayRunId)
            }
          }}
        />
      )}
    </div>
  )
}
