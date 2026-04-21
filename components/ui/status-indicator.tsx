'use client';

import { cn } from '@/lib/utils/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const statusVariants = cva(
  "inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        danger: "bg-danger/10 text-danger border border-danger/20",
        info: "bg-primary/10 text-primary border border-primary/20",
        neutral: "bg-muted text-muted-foreground border border-border",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      }
    },
    defaultVariants: {
      variant: "neutral",
      size: "default",
      pulse: false,
    },
  }
);

interface StatusIndicatorProps extends VariantProps<typeof statusVariants> {
  children: React.ReactNode;
  className?: string;
  showDot?: boolean;
}

export function StatusIndicator({
  children,
  variant,
  size,
  pulse,
  className,
  showDot = true,
}: StatusIndicatorProps) {
  return (
    <span className={cn(statusVariants({ variant, size, pulse }), className)}>
      {showDot && (
        <span 
          className={cn(
            "w-2 h-2 rounded-full",
            pulse && "status-pulse",
            variant === "success" && "bg-success",
            variant === "warning" && "bg-warning", 
            variant === "danger" && "bg-danger",
            variant === "info" && "bg-primary",
            variant === "neutral" && "bg-muted-foreground"
          )}
        />
      )}
      {children}
    </span>
  );
}

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
  variant?: 'default' | 'danger';
}

export function NotificationBadge({ 
  count, 
  max = 99, 
  className,
  variant = 'default' 
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span 
      className={cn(
        "notification-bounce absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white",
        variant === 'default' && "bg-primary",
        variant === 'danger' && "bg-danger",
        count > max && "px-1 w-auto min-w-[1.25rem]",
        className
      )}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </span>
  );
}