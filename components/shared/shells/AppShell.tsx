'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface AppShellProps {
  children: ReactNode;
  variant?: 'dashboard' | 'staff' | 'auth' | 'kiosk';
  className?: string;
}

/**
 * Unified App Shell - Base container for all app layouts
 * Provides consistent surface model and ambient styling
 */
export function AppShell({ children, variant = 'dashboard', className }: AppShellProps) {
  return (
    <div
      data-app-shell={variant}
      className={cn(
        'relative flex min-h-screen w-full min-w-0',
        // Surface model: background canvas
        'bg-background',
        // Variant-specific styling
        variant === 'dashboard' && 'bg-gradient-to-br from-background via-background to-muted/20',
        variant === 'staff' && 'bg-background',
        variant === 'auth' && 'bg-gradient-to-br from-background to-muted/30',
        variant === 'kiosk' && 'bg-background',
        className
      )}
    >
      {/* Ambient accents for dashboard */}
      {variant === 'dashboard' && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-8 top-8 z-0 h-44 w-44 rounded-full bg-primary/8 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 right-0 z-0 h-52 w-52 rounded-full bg-primary/6 blur-3xl"
          />
        </>
      )}
      
      {children}
    </div>
  );
}