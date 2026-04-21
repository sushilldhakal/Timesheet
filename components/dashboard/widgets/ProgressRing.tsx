'use client';

import { cn } from '@/lib/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressRingProps {
  value: number;
  max: number;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  className?: string;
}

export function ProgressRing({
  value,
  max,
  title,
  description,
  size = 'md',
  color = 'primary',
  showValue = true,
  className
}: ProgressRingProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizes = {
    sm: { ring: 60, stroke: 4, text: 'text-lg' },
    md: { ring: 80, stroke: 6, text: 'text-xl' },
    lg: { ring: 100, stroke: 8, text: 'text-2xl' }
  };
  
  const colors = {
    primary: 'hsl(var(--primary))',
    success: 'hsl(var(--color-success))',
    warning: 'hsl(var(--color-warning))',
    danger: 'hsl(var(--color-danger))'
  };

  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <Card elevation="elevated" className={cn("card-hover-lift text-center", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-section-title">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative mb-4">
          <svg
            width={ring}
            height={ring}
            className="transform -rotate-90"
          >
            {/* Background circle */}
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={radius}
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={radius}
              stroke={colors[color]}
              strokeWidth={stroke}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          {showValue && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn("font-bold text-numeric", text)}>
                  {Math.round(percentage)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {value}/{max}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}