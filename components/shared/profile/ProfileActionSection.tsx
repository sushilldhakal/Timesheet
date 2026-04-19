"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ProfileActionSectionProps {
  title?: string;
  description?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
    disabled?: boolean;
    icon?: ReactNode;
  }>;
  className?: string;
}

export function ProfileActionSection({
  title,
  description,
  actions,
  className = "",
}: ProfileActionSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "outline"}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}