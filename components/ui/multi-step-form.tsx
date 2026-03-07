"use client"

import { ReactNode } from "react"
import React from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  title: string
  description: string
  icon: ReactNode
}

interface MultiStepFormProps {
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
  children: ReactNode
  onPrevious?: () => void
  onNext?: () => void
  onSubmit?: () => void
  canGoNext?: boolean
  canGoPrevious?: boolean
  isLastStep?: boolean
  isSubmitting?: boolean
}

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  children,
  onPrevious,
  onNext,
  onSubmit,
  canGoNext = true,
  canGoPrevious = true,
  isLastStep = false,
  isSubmitting = false,
}: MultiStepFormProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Step Navigation */}
      <nav aria-label="Multi Steps">
        <ol className="flex items-center justify-between gap-x-2 gap-y-4 max-md:flex-col max-md:items-start">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <React.Fragment key={step.id}>
                <li>
                  <button
                    type="button"
                    onClick={() => onStepChange(index)}
                    className={cn(
                      "flex h-auto shrink-0 cursor-pointer items-center gap-2 rounded p-0 transition-all",
                      "hover:opacity-80 !bg-transparent",
                      !isActive && !isCompleted && "opacity-50"
                    )}
                  >
                    <Avatar className={cn(
                      "size-9.5",
                      isActive && "bg-primary text-primary-foreground shadow-sm",
                      isCompleted && "bg-primary text-primary-foreground shadow-sm",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}>
                      <AvatarFallback className="bg-transparent">
                        {step.icon}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className={cn(
                        "text-sm font-medium",
                        isActive && "text-foreground",
                        !isActive && "text-muted-foreground"
                      )}>
                        {step.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {step.description}
                      </span>
                    </div>
                  </button>
                </li>
                {index < steps.length - 1 && (
                  <li className="max-md:hidden">
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </li>
                )}
              </React.Fragment>
            )
          })}
        </ol>
      </nav>

      {/* Form Content */}
      <div className="flex flex-col gap-6">
        {children}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={onPrevious}
          disabled={!canGoPrevious || currentStep === 0}
          className="has-[>svg]:px-4"
        >
          <ArrowLeft className="size-4" />
          Previous
        </Button>
        
        {isLastStep ? (
          <Button
            type="button"
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Employee"}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={onNext}
            disabled={!canGoNext}
            className="has-[>svg]:px-4"
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
