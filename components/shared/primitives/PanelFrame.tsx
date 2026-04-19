'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PanelFrameProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  variant?: 'default' | 'elevated' | 'subtle';
  className?: string;
}

/**
 * Panel Frame - Reusable panel container with optional header
 * Implements grouped sections from surface model
 */
export function PanelFrame({ 
  children, 
  title, 
  description, 
  actions, 
  variant = 'default',
  className 
}: PanelFrameProps) {
  const hasHeader = title || description || actions;

  return (
    <div
      data-panel-frame={variant}
      className={cn(
        // Base styling
        'rounded-[var(--radius-panel)] border',
        // Variant styling
        variant === 'default' && 'bg-panel border-border-subtle shadow-[var(--shadow-subtle-diffusion)]',
        variant === 'elevated' && 'bg-panel-elevated border-border-subtle shadow-[var(--shadow-elevated)]',
        variant === 'subtle' && 'bg-muted border-border-subtle',
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between p-[var(--spacing-panel-padding)] border-b border-border-subtle">
          <div className="space-y-1">
            {title && (
              <h3 className="text-[length:var(--font-size-section-title)] leading-[var(--line-height-section-title)] font-medium text-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={cn(
        hasHeader ? 'p-[var(--spacing-panel-padding)]' : 'p-[var(--spacing-panel-padding)]'
      )}>
        {children}
      </div>
    </div>
  );
}