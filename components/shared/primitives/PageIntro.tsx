'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface PageIntroProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Page Intro - Standardized page header with title, description, and actions
 * Uses typography tokens for consistent hierarchy
 */
export function PageIntro({ title, description, actions, className }: PageIntroProps) {
  return (
    <div
      data-page-intro
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="space-y-1">
        <h1 
          className="text-[length:var(--font-size-page-title)] leading-[var(--line-height-page-title)] font-semibold tracking-tight text-foreground"
        >
          {title}
        </h1>
        {description && (
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}