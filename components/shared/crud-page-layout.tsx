"use client"

import { ReactNode } from "react"
import { CrudPageHeader } from "./crud-page-header"
import { CrudPageShell } from "./crud-page-shell"

interface CrudPageLayoutProps {
  // Header props
  title: string
  description: string
  addButtonText: string
  onAdd: () => void
  showAddButton?: boolean
  
  // Shell props
  cardTitle: string
  cardDescription: string
  isLoading?: boolean
  loadingText?: string
  
  // Content
  children: ReactNode
  
  // Additional content (dialogs, etc.)
  additionalContent?: ReactNode
}

export function CrudPageLayout({
  title,
  description,
  addButtonText,
  onAdd,
  showAddButton = true,
  cardTitle,
  cardDescription,
  isLoading = false,
  loadingText = "Loading...",
  children,
  additionalContent,
}: CrudPageLayoutProps) {
  return (
    <div className="space-y-6">
      <CrudPageHeader
        title={title}
        description={description}
        addButtonText={addButtonText}
        onAdd={onAdd}
        showAddButton={showAddButton}
      />
      
      <CrudPageShell
        title={cardTitle}
        description={cardDescription}
        isLoading={isLoading}
        loadingText={loadingText}
      >
        {children}
      </CrudPageShell>
      
      {additionalContent}
    </div>
  )
}