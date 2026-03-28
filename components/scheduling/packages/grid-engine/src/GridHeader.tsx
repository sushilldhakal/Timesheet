// Grid Header - Time/date headers

import React from 'react'
import type { GridColumn } from './types'

export interface GridHeaderProps {
  columns: GridColumn[]
  className?: string
}

export function GridHeader({ columns, className = '' }: GridHeaderProps) {
  return (
    <div className={`grid-header ${className}`}>
      {columns.map(column => (
        <div
          key={column.id}
          className="grid-header-cell inline-block h-10 border border-border bg-muted p-2 text-center text-sm font-bold"
          style={{ width: column.width }}
        >
          {column.label}
        </div>
      ))}
    </div>
  )
}