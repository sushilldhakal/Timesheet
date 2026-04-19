'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageContainerProps {
  children: ReactNode;
  variant?: 'dashboard' | 'staff' | 'workspace';
  fullWidth?: boolean;
  className?: string;
}

/**
 * Page Container - Controls page width and spacing
 * Implements the surface model for main content areas
 */
export function PageContainer({ 
  children, 
  variant = 'dashboard', 
  fullWidth = false,
  className 
}: PageContainerProps) {
  return (
    <main className="flex flex-1 min-w-0">
      <div
        data-page-container={variant}
        className={cn(
          // Base layout
          'flex flex-1 flex-col min-w-0 transition-[max-width] duration-300',
          // Spacing using tokens
          'gap-[var(--spacing-section-gap)] p-[var(--spacing-page-gutter)]',
          // Width control
          fullWidth ? 'w-full max-w-none' : 'max-w-7xl mx-auto',
          // Variant-specific spacing
          variant === 'dashboard' && 'lg:gap-[calc(var(--spacing-section-gap)*1.5)] lg:p-[calc(var(--spacing-page-gutter)*1.5)]',
          variant === 'staff' && 'gap-[var(--spacing-section-gap)] p-[var(--spacing-page-gutter)]',
          variant === 'workspace' && 'gap-[var(--spacing-section-gap)] p-[var(--spacing-page-gutter)]',
          className
        )}
      >
        {children}
      </div>
    </main>
  );
}