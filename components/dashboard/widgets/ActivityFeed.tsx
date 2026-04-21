'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, User, UserPlus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { useRecentActivities } from '@/lib/hooks/use-dashboard-data';

export function ActivityFeed() {
  const { activities, isLoading, isLive, setIsLive } = useRecentActivities();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'clock_in':
        return <Clock className="h-4 w-4" />;
      case 'clock_out':
        return <Clock className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      case 'flag':
        return <AlertTriangle className="h-4 w-4" />;
      case 'new_employee':
        return <UserPlus className="h-4 w-4" />;
      case 'user_action':
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityStatus = (type: string, priority?: string) => {
    if (priority === 'high') return 'danger';
    if (priority === 'medium') return 'warning';
    
    switch (type) {
      case 'clock_in':
      case 'approval':
        return 'success';
      case 'flag':
        return 'danger';
      case 'clock_out':
        return 'info';
      default:
        return 'neutral';
    }
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Recent Activity</h3>
        <button 
          onClick={() => setIsLive(!isLive)}
          className="cursor-pointer"
          type="button"
        >
          <StatusIndicator 
            variant={isLive ? 'success' : 'neutral'} 
            size="sm" 
            pulse={isLive}
          >
            {isLive ? 'Live' : 'Paused'}
          </StatusIndicator>
        </button>
      </div>

      {/* Activity list */}
      <div className="space-y-3 max-h-80 overflow-y-auto smooth-scroll">
        {activities.map((activity, index) => (
          <div 
            key={activity.id} 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg transition-all duration-200",
              "hover:bg-muted/50 cursor-pointer",
              "stagger-item respect-motion-preference keyboard-nav-indicator",
              index === 0 && "bg-muted/30" // Highlight newest
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            tabIndex={0}
            role="article"
            aria-label={`Activity: ${activity.message} at ${activity.timestamp}`}
          >
            <div className="shrink-0 mt-0.5">
              <StatusIndicator 
                variant={getActivityStatus(activity.type, activity.priority)}
                size="sm"
                showDot={false}
              >
                {getActivityIcon(activity.type)}
              </StatusIndicator>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">
                {activity.message}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </p>
                {activity.user && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {activity.user}
                    </p>
                  </>
                )}
              </div>
            </div>
            {activity.priority === 'high' && (
              <div className="shrink-0">
                <div className="w-2 h-2 bg-danger rounded-full status-pulse" />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {activities.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      )}
    </div>
  );
}