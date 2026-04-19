"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Copy, Archive } from "lucide-react";

interface EntityAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

interface EntityTableActionsProps {
  actions?: EntityAction[];
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
}

export function EntityTableActions({
  actions = [],
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  disabled = false,
  size = "sm",
}: EntityTableActionsProps) {
  // Build default actions based on provided handlers
  const defaultActions: EntityAction[] = [];

  if (onView) {
    defaultActions.push({
      label: "View",
      icon: <Eye className="h-4 w-4" />,
      onClick: onView,
    });
  }

  if (onEdit) {
    defaultActions.push({
      label: "Edit",
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit,
    });
  }

  if (onDuplicate) {
    defaultActions.push({
      label: "Duplicate",
      icon: <Copy className="h-4 w-4" />,
      onClick: onDuplicate,
    });
  }

  if (onArchive) {
    defaultActions.push({
      label: "Archive",
      icon: <Archive className="h-4 w-4" />,
      onClick: onArchive,
    });
  }

  if (onDelete) {
    if (defaultActions.length > 0) {
      defaultActions.push({ label: "separator", onClick: () => {} } as any);
    }
    defaultActions.push({
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: "destructive",
    });
  }

  const allActions = [...defaultActions, ...actions];

  if (allActions.length === 0) {
    return null;
  }

  // If only one action and it's edit, show as button
  if (allActions.length === 1 && onEdit && !onView && !onDelete && actions.length === 0) {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={onEdit}
        disabled={disabled}
      >
        <Edit className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className="h-8 w-8 p-0"
          disabled={disabled}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {allActions.map((action, index) => {
          if (action.label === "separator") {
            return <DropdownMenuSeparator key={index} />;
          }

          return (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                action.variant === "destructive"
                  ? "text-destructive focus:text-destructive"
                  : ""
              }
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}