"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface OnboardingStepShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  nextDisabled?: boolean;
  centered?: boolean;
  className?: string;
}

export function OnboardingStepShell({
  title,
  description,
  children,
  onNext,
  onPrevious,
  nextLabel = "Next Step",
  previousLabel = "Previous",
  isFirstStep = false,
  isLastStep = false,
  nextDisabled = false,
  centered = false,
  className = "",
}: OnboardingStepShellProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className={centered ? "text-center space-y-2" : ""}>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {children}

      <div className="flex justify-between gap-3 pt-6 border-t">
        {!isFirstStep && onPrevious ? (
          <Button type="button" variant="outline" onClick={onPrevious}>
            &larr; {previousLabel}
          </Button>
        ) : (
          <div />
        )}
        
        {onNext && (
          <Button 
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            size={isLastStep ? "lg" : "default"}
          >
            {isLastStep ? "Complete" : nextLabel} {!isLastStep && " →"}
          </Button>
        )}
      </div>
    </div>
  );
}