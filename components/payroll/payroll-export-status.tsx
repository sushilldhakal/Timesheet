"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Download, FileCheck, Clock } from "lucide-react"

interface PayrollExportStatusProps {
  exportedAt?: string | Date | null
  exportType?: string | null
  exportReference?: string | null
  onReExport?: () => void
}

const SYSTEM_LABELS: Record<string, string> = {
  xero: 'Xero',
  myob: 'MYOB',
  apa: 'APA',
  custom: 'Custom'
}

export function PayrollExportStatus({
  exportedAt,
  exportType,
  exportReference,
  onReExport
}: PayrollExportStatusProps) {
  if (!exportedAt) {
    return (
      <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        Not Exported
      </Badge>
    )
  }

  const exportDate = new Date(exportedAt)
  const systemLabel = exportType ? SYSTEM_LABELS[exportType] || exportType : 'Unknown'

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className="text-xs gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200">
              <FileCheck className="h-3 w-3" />
              Exported to {systemLabel}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <p>Exported: {exportDate.toLocaleDateString('en-AU', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p>System: {systemLabel}</p>
              {exportReference && <p>File: {exportReference}</p>}
            </div>
          </TooltipContent>
        </Tooltip>

        {onReExport && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onReExport()
                }}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-export to different system</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
