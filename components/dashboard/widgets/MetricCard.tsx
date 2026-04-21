'use client';

import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  value: string | number;
  label: string;
  trend?: string;
  trendDirection?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function MetricCard({
  value,
  label,
  trend,
  trendDirection = 'neutral',
  icon,
  variant = 'default',
  className
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trendDirection) {
      case 'positive':
        return <TrendingUp className="h-3 w-3" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-l-4 border-l-success';
      case 'warning':
        return 'border-l-4 border-l-warning';
      case 'danger':
        return 'border-l-4 border-l-danger';
      default:
        return 'border-l-4 border-l-primary';
    }
  };

  return (
    <Card 
      elevation="elevated" 
      className={cn(
        'metric-card card-hover-lift respect-motion-preference keyboard-nav-indicator',
        getVariantStyles(),
        className
      )}
      tabIndex={0}
      role="article"
      aria-label={`${label}: ${value}${trend ? `, trend: ${trend}` : ''}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="metric-card-label">
          {label}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="metric-card-value">
          {value}
        </div>
        {trend && (
          <div className={cn(
            'metric-card-trend flex items-center gap-1 mt-1',
            `data-[trend=${trendDirection}]`
          )} data-trend={trendDirection}>
            {getTrendIcon()}
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}