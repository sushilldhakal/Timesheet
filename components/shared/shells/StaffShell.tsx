'use client';

import { ReactNode } from 'react';
import { AppShell } from './AppShell';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { PageContainer } from './PageContainer';

interface StaffShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  sidebarCollapsed: boolean;
  mobileMenuOpen?: boolean;
  mobileOverlay?: ReactNode;
}

/**
 * Staff Shell - Lighter, simpler, calmer layout for staff users
 * Implements staff variant with reduced density and calmer styling
 */
export function StaffShell({
  children,
  sidebar,
  header,
  sidebarCollapsed,
  mobileMenuOpen = false,
  mobileOverlay
}: StaffShellProps) {
  return (
    <AppShell variant="staff">
      {/* Mobile Overlay */}
      {mobileOverlay}

      {/* Sidebar */}
      <AppSidebar
        isCollapsed={sidebarCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        variant="staff"
      >
        {sidebar}
      </AppSidebar>

      {/* Main Content Area */}
      <div className={`
        flex flex-1 flex-col transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[280px]'}
      `}>
        {/* Header */}
        <AppHeader variant="staff">
          {header}
        </AppHeader>

        {/* Page Container - Staff uses simpler spacing */}
        <PageContainer variant="staff">
          {children}
        </PageContainer>
      </div>
    </AppShell>
  );
}