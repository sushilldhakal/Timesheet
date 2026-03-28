import React from 'react'
import type { Block } from '@shadcn-scheduler/core'
import { isToday, getDIM, getFirst, MONTHS } from '@shadcn-scheduler/core'
import { useSchedulerContext } from '@shadcn-scheduler/shell'
import { cn } from '@/lib/utils/cn'

export interface YearViewProps {
  date: Date
  shifts: Block[]
  onMonthClick: (year: number, month: number) => void
}

function YearViewInner({ date, shifts, onMonthClick }: YearViewProps): React.ReactElement {
  const { slots } = useSchedulerContext()
  const year = date.getFullYear()

  if (shifts.length === 0 && slots.emptyState) {
    return (
      <div className="flex flex-1 items-center justify-center">
        {slots.emptyState({ view: 'year' })}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {MONTHS.map((mName, m) => {
          const days = getDIM(year, m)
          const first = getFirst(year, m)
          const ms = shifts.filter((s) => {
            const d = new Date(s.date + 'T12:00:00')
            return d.getFullYear() === year && d.getMonth() === m
          })

          const cells: (number | null)[] = []
          for (let i = 0; i < first; i++) cells.push(null)
          for (let d = 1; d <= days; d++) cells.push(d)

          return (
            <div
              key={m}
              onClick={() => onMonthClick(year, m)}
              className="cursor-pointer rounded-xl border border-border bg-background p-3 shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 text-[13px] font-bold text-foreground">{mName}</div>
              <div className="mb-0.5 grid grid-cols-7">
                {'MTWTFSS'.split('').map((ch, i) => (
                  <div key={i} className="text-center text-[8px] font-bold text-muted-foreground">
                    {ch}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />
                  const has = ms.some((s) => new Date(s.date + 'T12:00:00').getDate() === d)
                  const tod = isToday(new Date(year, m, d))
                  return (
                    <div
                      key={d}
                      className={cn(
                        'rounded-sm text-center text-[9px] leading-4',
                        tod || has
                          ? 'bg-primary font-bold text-primary-foreground'
                          : 'font-normal text-muted-foreground',
                      )}
                    >
                      {d}
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      ms.length > 0 ? 'bg-primary' : 'bg-muted-foreground',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px]',
                      ms.length > 0 ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {ms.length} shifts
                  </span>
                </div>
                {ms.filter((s) => s.status === 'draft').length > 0 && (
                  <span className="text-[9px] font-semibold text-accent-foreground">
                    {ms.filter((s) => s.status === 'draft').length} draft
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const YearView = React.memo(YearViewInner)
