'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface AppSidebarProps {
  children: ReactNode;
  isCollapsed: boolean;
  mobileMenuOpen?: boolean;
  variant?: 'dashboard' | 'staff';
  className?: string;
}

/**
 * Unified App Sidebar - Base sidebar container
 * Provides consistent positioning and responsive behavior
 */
export function AppSidebar({ 
  children, 
  isCollapsed, 
  mobileMenuOpen = false, 
  variant = 'dashboard',
  className 
}: AppSidebarProps) {
  return (
    <aside
      data-app-sidebar={variant}
      className={cn(
        // Base positioning
        'fixed left-0 top-0 z-50 h-full transition-all duration-300',
        // Width states
        isCollapsed ? 'w-[70px]' : 'w-[280px]',
        // Mobile behavior
        'md:translate-x-0',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        // Surface styling
        'border-r border-border-subtle bg-sidebar',
        // Variant-specific styling
        variant === 'dashboard' && 'bg-sidebar/95 backdrop-blur-sm',
        variant === 'staff' && 'bg-sidebar',
        className
      )}
    >
      {children}
    </aside>
  );
}