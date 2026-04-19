'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface MetricItem {
  label: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
}

interface MetricStripProps {
  metrics: MetricItem[];
  className?: string;
}

/**
 * Metric Strip - Displays key metrics in a horizontal layout
 * Uses mono font for operational numbers as specified in design system
 */
export function MetricStrip({ metrics, className }: MetricStripProps) {
  return (
    <div
      data-metric-strip
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-panel)] border border-border-subtle bg-panel p-[var(--spacing-panel-padding)] shadow-[var(--shadow-subtle-diffusion)]"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[length:var(--font-size-label)] leading-[var(--line-height-label)] font-medium text-muted-foreground uppercase tracking-wide">
                {metric.label}
              </p>
              <p className="text-[length:var(--font-size-display)] leading-[var(--line-height-display)] font-mono font-semibold text-foreground">
                {metric.value}
              </p>
              {metric.change && (
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'text-[length:var(--font-size-microcopy)] leading-[var(--line-height-microcopy)] font-medium',
                      metric.change.trend === 'up' && 'text-success',
                      metric.change.trend === 'down' && 'text-danger',
                      metric.change.trend === 'neutral' && 'text-muted-foreground'
                    )}
                  >
                    {metric.change.value}
                  </span>
                </div>
              )}
            </div>
            {metric.icon && (
              <div className="text-muted-foreground">
                {metric.icon}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}