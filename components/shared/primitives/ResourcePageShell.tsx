'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { PageIntro } from './PageIntro';
import { MetricStrip } from './MetricStrip';
import { PanelFrame } from './PanelFrame';

interface ResourcePageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: Array<{
    label: string;
    value: string | number;
    change?: {
      value: string;
      trend: 'up' | 'down' | 'neutral';
    };
    icon?: ReactNode;
  }>;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Resource Page Shell - Template for resource management pages
 * Combines PageIntro, optional MetricStrip, toolbar, and content area
 */
export function ResourcePageShell({
  title,
  description,
  actions,
  metrics,
  toolbar,
  children,
  className
}: ResourcePageShellProps) {
  return (
    <div
      data-resource-page-shell
      className={cn('space-y-[var(--spacing-section-gap)]', className)}
    >
      {/* Page Introduction */}
      <PageIntro
        title={title}
        description={description}
        actions={actions}
      />

      {/* Optional Metrics */}
      {metrics && metrics.length > 0 && (
        <MetricStrip metrics={metrics} />
      )}

      {/* Main Content Panel */}
      <PanelFrame className="p-0">
        {/* Optional Toolbar */}
        {toolbar && (
          <div className="border-b border-border-subtle p-[var(--spacing-panel-padding)]">
            {toolbar}
          </div>
        )}
        
        {/* Content Area */}
        <div className="p-[var(--spacing-panel-padding)]">
          {children}
        </div>
      </PanelFrame>
    </div>
  );
}