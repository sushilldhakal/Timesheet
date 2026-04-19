"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InfoCardProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
}

interface InfoCardHeaderProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}

interface InfoGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

interface KeyValueListProps {
  items: Array<{
    key: string;
    value: ReactNode;
    className?: string;
  }>;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function InfoCard({
  title,
  description,
  icon,
  actions,
  children,
  variant = "default",
  className = "",
}: InfoCardProps) {
  const cardVariants = {
    default: "",
    outline: "border-2",
    secondary: "bg-secondary",
  };

  return (
    <Card className={`${cardVariants[variant]} ${className}`}>
      {(title || description || icon || actions) && (
        <InfoCardHeader
          title={title}
          description={description}
          icon={icon}
          actions={actions}
        />
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function InfoCardHeader({
  title,
  description,
  icon,
  actions,
  badge,
}: InfoCardHeaderProps) {
  return (
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {icon && <div className="mt-1">{icon}</div>}
          <div className="space-y-1">
            {title && (
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                {badge}
              </div>
            )}
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </CardHeader>
  );
}

export function InfoGrid({
  children,
  columns = 2,
  className = "",
}: InfoGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid gap-4 ${gridClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}

export function KeyValueList({
  items,
  orientation = "horizontal",
  className = "",
}: KeyValueListProps) {
  if (orientation === "vertical") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((item, index) => (
          <div key={index} className={`space-y-1 ${item.className || ""}`}>
            <div className="text-sm font-medium text-muted-foreground">
              {item.key}
            </div>
            <div className="text-sm">{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex justify-between items-start gap-4 ${item.className || ""}`}
        >
          <div className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
            {item.key}
          </div>
          <div className="text-sm text-right min-w-0">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// Convenience component for status displays
interface StatusSummaryCardProps {
  title: string;
  status: "active" | "inactive" | "pending" | "error" | "success";
  statusLabel?: string;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function StatusSummaryCard({
  title,
  status,
  statusLabel,
  description,
  children,
  actions,
}: StatusSummaryCardProps) {
  const statusVariants = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  };

  const badge = (
    <Badge variant="secondary" className={statusVariants[status]}>
      {statusLabel || status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );

  return (
    <InfoCard
      title={title}
      description={description}
      actions={actions}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          {badge}
        </div>
        {children}
      </div>
    </InfoCard>
  );
}