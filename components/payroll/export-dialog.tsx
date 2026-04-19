"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  FileDown,
  Eye,
} from "lucide-react"
import { getPayrollExportPreview, exportPayrollData } from "@/lib/api/payroll"
import type { PayrollSystemType } from "@/lib/api/payroll"
import { FormDialogShell } from "@/components/shared/forms"

interface ExportRow {
  employeeId: string
  employeeName: string
  pinNumber: string
  payPeriodStart: string
  payPeriodEnd: string
  payItemCode: string
  payItemDescription: string
  units: number
  cost: number
  lineReference: string
  source: string
}

interface ExportSummary {
  totalEmployees: number
  totalShifts: number
  totalHours: number
  totalCost: number
  includesBreaks: boolean
  includesLeaveAccruals: boolean
}

interface ExportDialogProps {
  payRunId: string
  tenantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onExportComplete?: () => void
  onConfigureMappings?: () => void
}

const SYSTEM_LABELS: Record<PayrollSystemType, string> = {
  xero: 'Xero',
  myob: 'MYOB',
  apa: 'APA (STP)',
  custom: 'Custom'
}

export function ExportDialog({
  payRunId,
  tenantId,
  open,
  onOpenChange,
  onExportComplete,
  onConfigureMappings
}: ExportDialogProps) {
  const [systemType, setSystemType] = useState<PayrollSystemType>('xero')
  const [includeBreaks, setIncludeBreaks] = useState(false)
  const [includeLeaveAccruals, setIncludeLeaveAccruals] = useState(false)
  const [customFileName, setCustomFileName] = useState('')

  const [preview, setPreview] = useState<{
    rows: ExportRow[]
    summary: ExportSummary
    errors: string[]
    rowCount: number
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const data = await getPayrollExportPreview(payRunId, systemType)
      setPreview(data)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load preview')
    } finally {
      setPreviewLoading(false)
    }
  }, [payRunId, systemType])

  useEffect(() => {
    if (open && payRunId) {
      setExported(false)
      fetchPreview()
    }
  }, [open, payRunId, systemType, fetchPreview])

  async function handleExport() {
    const blob = await exportPayrollData({
      payRunId,
      payrollSystemType: systemType,
      fileName: customFileName || undefined,
      options: {
        includeBreaks,
        includeLeaveAccruals,
      }
    })

    // Extract filename from response or use default
    const fileName = customFileName || `payroll-export-${payRunId}.csv`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExported(true)
    onExportComplete?.()
  }

  const sampleRows = preview?.rows.slice(0, 10) || []

  const customFooter = (
    <div className="flex items-center justify-between w-full">
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {exported ? 'Close' : 'Cancel'}
        </Button>
        {onConfigureMappings && (
          <Button variant="outline" onClick={onConfigureMappings}>
            <Settings className="h-4 w-4 mr-1" />
            Configure Mappings
          </Button>
        )}
      </div>
      <Button
        onClick={handleExport}
        disabled={exporting || !preview || preview.rowCount === 0}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        Export CSV
      </Button>
    </div>
  )

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Export to Payroll System"
      description="Generate a CSV file to import into your payroll system"
      size="xl"
      footer={customFooter}
    >
      <div className="space-y-6">
          {/* Configuration Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payroll System</Label>
              <Select
                value={systemType}
                onValueChange={(v) => setSystemType(v as PayrollSystemType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xero">Xero</SelectItem>
                  <SelectItem value="myob">MYOB</SelectItem>
                  <SelectItem value="apa">APA (STP)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File Name (optional)</Label>
              <Input
                placeholder={`payroll-export-${payRunId.slice(0, 8)}.csv`}
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeBreaks"
                checked={includeBreaks}
                onCheckedChange={(c) => setIncludeBreaks(c === true)}
              />
              <Label htmlFor="includeBreaks" className="text-sm font-normal">
                Include breaks
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeLeave"
                checked={includeLeaveAccruals}
                onCheckedChange={(c) => setIncludeLeaveAccruals(c === true)}
              />
              <Label htmlFor="includeLeave" className="text-sm font-normal">
                Include leave accruals
              </Label>
            </div>
          </div>

          {/* Preview Section */}
          {previewLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Loading preview...</span>
            </div>
          ) : previewError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Export Error</p>
                <p className="text-sm text-destructive/80 mt-1">{previewError}</p>
              </div>
            </div>
          ) : preview ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-xl font-semibold">{preview.summary.totalEmployees}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Shifts</p>
                  <p className="text-xl font-semibold">{preview.summary.totalShifts}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="text-xl font-semibold">{preview.summary.totalHours.toFixed(1)}h</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Cost</p>
                  <p className="text-xl font-semibold">${preview.summary.totalCost.toFixed(2)}</p>
                </div>
              </div>

              {/* Errors/Warnings */}
              {preview.errors && preview.errors.length > 0 && (
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 p-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-1">Warnings</p>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-500 space-y-0.5">
                    {preview.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {preview.errors.length > 5 && (
                      <li>...and {preview.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Sample Rows */}
              {sampleRows.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Preview ({preview.rowCount} total rows, showing first {sampleRows.length})
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Employee</TableHead>
                          <TableHead className="text-xs">Pay Code</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Hours</TableHead>
                          <TableHead className="text-xs text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sampleRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{row.employeeName}</TableCell>
                            <TableCell className="text-xs font-mono">{row.payItemCode}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.payItemDescription}</TableCell>
                            <TableCell className="text-xs text-right">{row.units.toFixed(2)}</TableCell>
                            <TableCell className="text-xs text-right">${row.cost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* Export Success */}
          {exported && (
            <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-400">
                  Exported to {SYSTEM_LABELS[systemType]}
                </p>
                <p className="text-xs text-green-700 dark:text-green-500">
                  CSV file has been downloaded. Pay run marked as exported.
                </p>
              </div>
            </div>
          )}
        </div>
    </FormDialogShell>
  )
}
