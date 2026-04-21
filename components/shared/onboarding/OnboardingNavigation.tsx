"use client";

import { ReactNode } from "react";

interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  className?: string;
}

export function OnboardingNavigation({
  currentStep,
  totalSteps,
  stepLabels,
  className = "",
}: OnboardingNavigationProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <div key={stepNumber} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${isActive 
                    ? "bg-primary text-primary-foreground" 
                    : isCompleted 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {stepNumber}
              </div>
              
              {stepLabels && stepLabels[index] && (
                <span className={`ml-2 text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                  {stepLabels[index]}
                </span>
              )}
              
              {stepNumber < totalSteps && (
                <div 
                  className={`
                    mx-4 h-0.5 w-12 
                    ${isCompleted ? "bg-primary/20" : "bg-muted"}
                  `} 
                />
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-2 text-center">
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
    </div>
  );
}