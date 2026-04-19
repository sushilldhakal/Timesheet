"use client";

import { ReactNode } from "react";

interface ProfileInfoGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

interface ProfileInfoFieldProps {
  label: string;
  value: ReactNode;
  span?: 1 | 2 | 3 | 4;
  mono?: boolean;
  className?: string;
}

export function ProfileInfoGrid({
  children,
  columns = 2,
  className = "",
}: ProfileInfoGridProps) {
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

export function ProfileInfoField({
  label,
  value,
  span = 1,
  mono = false,
  className = "",
}: ProfileInfoFieldProps) {
  const spanClasses = {
    1: "",
    2: "md:col-span-2",
    3: "lg:col-span-3",
    4: "lg:col-span-4",
  };

  return (
    <div className={`flex flex-col gap-0.5 ${spanClasses[span]} ${className}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <div className={`text-sm ${mono ? "font-mono" : ""} font-semibold mt-1`}>
        {value || <span className="text-muted-foreground font-normal">—</span>}
      </div>
    </div>
  );
}