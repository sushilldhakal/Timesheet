'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';

interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    width?: number;
    render?: (value: T[keyof T], item: T) => React.ReactNode;
  }>;
  height?: number;
  rowHeight?: number;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  rowHeight = 48,
  className,
  onRowClick
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="table-header-sticky bg-muted/50 border-b">
        <div className="flex">
          {columns.map((column, index) => (
            <div
              key={String(column.key)}
              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
              style={{ width: column.width || `${100 / columns.length}%` }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualItem) => {
            const item = data[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                className={cn(
                  "table-row absolute top-0 left-0 w-full flex items-center border-b cursor-pointer",
                  onRowClick && "hover:bg-muted/50"
                )}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <div
                    key={String(column.key)}
                    className="px-4 py-2 text-sm"
                    style={{ width: column.width || `${100 / columns.length}%` }}
                  >
                    {column.render 
                      ? column.render(item[column.key], item)
                      : String(item[column.key] || '')
                    }
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}