"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface CrudPageHeaderProps {
  title: string
  description: string
  addButtonText: string
  onAdd: () => void
  showAddButton?: boolean
}

export function CrudPageHeader({
  title,
  description,
  addButtonText,
  onAdd,
  showAddButton = true,
}: CrudPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {showAddButton && (
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {addButtonText}
        </Button>
      )}
    </div>
  )
}