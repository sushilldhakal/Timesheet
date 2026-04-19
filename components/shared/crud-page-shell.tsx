"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CrudPageShellProps {
  title: string
  description: string
  children: ReactNode
  isLoading?: boolean
  loadingText?: string
}

export function CrudPageShell({
  title,
  description,
  children,
  isLoading = false,
  loadingText = "Loading...",
}: CrudPageShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">{loadingText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}