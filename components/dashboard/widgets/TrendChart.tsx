'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CustomTooltip } from '../charts/CustomTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface TrendChartProps {
  data: Array<{
    name: string;
    value: number;
    target?: number;
  }>;
  title: string;
  description?: string;
  target?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  height?: number;
  className?: string;
}

export function TrendChart({
  data,
  title,
  description,
  target,
  trend = 'neutral',
  trendValue,
  height = 200,
  className
}: TrendChartProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-danger" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'hsl(var(--color-success))';
      case 'down':
        return 'hsl(var(--color-danger))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  return (
    <Card elevation="elevated" className={cn("card-hover-lift", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-section-title">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {trendValue && (
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon()}
              <span className={cn(
                "font-medium",
                trend === 'up' && "text-success",
                trend === 'down' && "text-danger",
                trend === 'neutral' && "text-muted-foreground"
              )}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.3}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <CustomTooltip />
            {target && (
              <ReferenceLine 
                y={target} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5"
                label={{ value: "Target", position: "top" as any }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={getTrendColor()}
              strokeWidth={2}
              dot={{ fill: getTrendColor(), strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: getTrendColor(), strokeWidth: 2, fill: 'hsl(var(--background))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}