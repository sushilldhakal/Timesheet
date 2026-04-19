"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";

interface TableEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  type?: "no-data" | "no-results" | "error";
  className?: string;
}

const defaultIcons = {
  "no-data": <Plus className="h-12 w-12 text-muted-foreground" />,
  "no-results": <Search className="h-12 w-12 text-muted-foreground" />,
  "error": <Filter className="h-12 w-12 text-muted-foreground" />,
};

export function TableEmptyState({
  icon,
  title,
  description,
  action,
  type = "no-data",
  className = "",
}: TableEmptyStateProps) {
  const displayIcon = icon || defaultIcons[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="mb-4">{displayIcon}</div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick}>
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </Button>
      )}
    </div>
  );
}