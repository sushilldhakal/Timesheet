'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2, AlertCircle, FileX } from 'lucide-react';

interface ContentStateProps {
  state: 'loading' | 'empty' | 'error' | 'ready';
  children?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  errorAction?: ReactNode;
  loadingText?: string;
  className?: string;
}

/**
 * Content State - Unified loading, empty, error, and ready states
 * Provides consistent messaging and actions across the app
 */
export function ContentState({
  state,
  children,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no items to display.',
  emptyAction,
  errorTitle = 'Something went wrong',
  errorDescription = 'An error occurred while loading the data.',
  errorAction,
  loadingText = 'Loading...',
  className
}: ContentStateProps) {
  if (state === 'ready') {
    return <>{children}</>;
  }

  return (
    <div
      data-content-state={state}
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {state === 'loading' && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-muted-foreground">
            {loadingText}
          </p>
        </>
      )}

      {state === 'empty' && (
        <>
          <FileX className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-[length:var(--font-size-section-title)] leading-[var(--line-height-section-title)] font-medium text-foreground mb-2">
            {emptyTitle}
          </h3>
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-muted-foreground mb-4 max-w-sm">
            {emptyDescription}
          </p>
          {emptyAction}
        </>
      )}

      {state === 'error' && (
        <>
          <AlertCircle className="h-12 w-12 text-danger mb-4" />
          <h3 className="text-[length:var(--font-size-section-title)] leading-[var(--line-height-section-title)] font-medium text-foreground mb-2">
            {errorTitle}
          </h3>
          <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-muted-foreground mb-4 max-w-sm">
            {errorDescription}
          </p>
          {errorAction}
        </>
      )}
    </div>
  );
}