'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface AppHeaderProps {
  children: ReactNode;
  variant?: 'dashboard' | 'staff' | 'kiosk';
  className?: string;
}

/**
 * Unified App Header - Base header container
 * Provides consistent height and surface styling with proper spacing
 */
export function AppHeader({ children, variant = 'dashboard', className }: AppHeaderProps) {
  return (
    <header
      data-app-header={variant}
      className={cn(
        // Base layout
        'sticky top-0 z-40 w-full',
        // Height using touch target token with proper padding
        'h-16 min-h-16',
        // Surface styling
        'border-b border-border-subtle bg-header/95 backdrop-blur-sm',
        // Variant-specific styling
        variant === 'dashboard' && 'bg-header/95',
        variant === 'staff' && 'bg-header',
        variant === 'kiosk' && 'bg-header border-border-strong',
        className
      )}
    >
      {children}
    </header>
  );
}