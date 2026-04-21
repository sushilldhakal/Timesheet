'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  className?: string;
}

export function CustomTooltip({ active, payload, label, className }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <Card className={cn(
      "rounded-lg border bg-popover p-3 shadow-lg backdrop-blur-sm",
      "animate-in fade-in-0 zoom-in-95 duration-150",
      className
    )}>
      {label && (
        <p className="text-sm font-medium text-popover-foreground mb-2">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground min-w-0 flex-1">
              {entry.name}:
            </span>
            <span className="text-xs font-mono font-medium text-popover-foreground">
              {typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    type: string;
  }>;
  className?: string;
}

export function CustomLegend({ payload, className }: CustomLegendProps) {
  if (!payload || !payload.length) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4 mt-4", className)}>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-muted-foreground">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}