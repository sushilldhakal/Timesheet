import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { HistogramBar } from './useHistogram'

const STATUS_BAR: Record<HistogramBar['status'], string> = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  over: 'bg-red-500',
}

export interface ResourceHistogramProps {
  bars: HistogramBar[]
  height?: number
  showLabels?: boolean
  className?: string
  style?: React.CSSProperties
}

export function ResourceHistogram({
  bars,
  height = 80,
  showLabels = true,
  className,
  style,
}: ResourceHistogramProps): React.ReactElement | null {
  if (!bars.length) return null

  return (
    <div
      className={cn(
        'flex items-end gap-1 overflow-x-auto border-t border-border px-3 py-2',
        className
      )}
      style={style}
    >
      {bars.map(({ resource, scheduledHours, capacityHours, utilizationPct, status }) => {
        const barH = Math.min((utilizationPct / 100) * height, height + 8)
        return (
          <div
            key={resource.id}
            title={`${resource.name}: ${scheduledHours.toFixed(1)}h / ${capacityHours}h (${Math.round(utilizationPct)}%)`}
            className="flex min-w-[28px] flex-col items-center gap-0.5"
          >
            <div
              className="relative w-5 overflow-hidden rounded-[3px] bg-border"
              style={{ height }}
            >
              <div
                className={cn(
                  'absolute right-0 bottom-0 left-0 rounded-[3px] transition-[height] duration-300 ease-out',
                  STATUS_BAR[status]
                )}
                style={{ height: barH }}
              />
            </div>
            {showLabels && (
              <span className="max-w-[36px] truncate text-center text-[9px] text-muted-foreground">
                {resource.name.split(' ')[0]}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
