'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageContentProps {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'workspace';
  className?: string;
}

/**
 * Page Content - Main content wrapper with surface elevation
 * Implements elevated focus panel from surface model
 */
export function PageContent({ children, variant = 'default', className }: PageContentProps) {
  return (
    <div
      data-page-content={variant}
      className={cn(
        // Base layout
        'relative w-full min-w-0 flex-1 pt-4 px-4',
        // Surface model implementation
        variant === 'default' && [
          'rounded-[var(--radius-panel)] bg-panel border border-border-subtle',
          'p-[var(--spacing-panel-padding)]',
          'shadow-[var(--shadow-subtle-diffusion)]'
        ],
        variant === 'elevated' && [
          'rounded-[var(--radius-panel)] bg-panel-elevated border border-border-subtle',
          'p-[var(--spacing-panel-padding)]',
          'shadow-[var(--shadow-elevated)]'
        ],
        variant === 'workspace' && [
          'rounded-[var(--radius-panel)] bg-panel border border-border-subtle',
           // Workspace manages its own padding
          'shadow-[var(--shadow-subtle-diffusion)]'
        ],
        className
      )}
    >
      {children}
    </div>
  );
}