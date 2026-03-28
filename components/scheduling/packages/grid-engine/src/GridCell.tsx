// Grid Cell - Individual cell rendering

import React from 'react'
import type { CellProps } from './types'

export function GridCell({ position, row, column, blocks, onCellClick }: CellProps) {
  return (
    <div
      className="grid-cell absolute border border-border bg-background"
      style={{
        width: position.width,
        height: position.height,
        left: position.x,
        top: position.y,
      }}
      onClick={() => onCellClick?.(position)}
    >
      {blocks.map(block => (
        <div
          key={block.id}
          className="m-0.5 overflow-hidden text-ellipsis whitespace-nowrap rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
        >
          {block.employee}
        </div>
      ))}
    </div>
  )
}