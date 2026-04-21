'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// Types for dashboard data
export interface DashboardMetrics {
  activeToday: number;
  hoursThisWeek: number;
  pendingApprovals: number;
  flaggedPunches: number;
  trends: {
    activeToday: string;
    hoursThisWeek: string;
    pendingApprovals?: string;
    flaggedPunches: string;
  };
}

export interface ActivityItem {
  id: string;
  type: 'clock_in' | 'clock_out' | 'approval' | 'flag' | 'user_action' | 'new_employee';
  message: string;
  timestamp: string;
  user?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface ChartDataPoint {
  name: string;
  value: number;
  target?: number;
}

// Mock API functions (replace with real API calls)
const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    activeToday: 127,
    hoursThisWeek: 1024,
    pendingApprovals: 8,
    flaggedPunches: 2,
    trends: {
      activeToday: '+5%',
      hoursThisWeek: '+12%',
      flaggedPunches: '-3 from yesterday'
    }
  };
};

const fetchRecentActivities = async (): Promise<ActivityItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return [
    {
      id: '1',
      type: 'clock_in',
      message: 'Sarah Johnson clocked in',
      timestamp: '2 minutes ago',
      user: 'Sarah Johnson',
      priority: 'low'
    },
    {
      id: '2',
      type: 'approval',
      message: 'Timesheet approved for John Smith',
      timestamp: '15 minutes ago',
      user: 'Manager',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'flag',
      message: 'Flagged punch: Missing location data',
      timestamp: '32 minutes ago',
      user: 'Mike Davis',
      priority: 'high'
    }
  ];
};

const fetchChartData = async (type: 'weekly' | 'hours'): Promise<ChartDataPoint[]> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const baseData = [
    { name: 'Mon', value: 120 },
    { name: 'Tue', value: 135 },
    { name: 'Wed', value: 148 },
    { name: 'Thu', value: 142 },
    { name: 'Fri', value: 156 },
    { name: 'Sat', value: 89 },
    { name: 'Sun', value: 67 },
  ];
  
  return type === 'hours' 
    ? baseData.map(d => ({ ...d, value: d.value * 0.8 }))
    : baseData;
};

// Custom hooks
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: fetchDashboardMetrics,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

export function useRecentActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive, setIsLive] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: fetchRecentActivities,
    refetchInterval: isLive ? 10000 : false, // Refetch every 10 seconds if live
    staleTime: 5000,
  });

  useEffect(() => {
    if (data) {
      setActivities(data);
    }
  }, [data]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // 10% chance of new activity every 15 seconds
      if (Math.random() < 0.1) {
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: 'clock_in',
          message: 'New employee activity detected',
          timestamp: 'Just now',
          user: 'System',
          priority: 'low'
        };
        
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isLive]);

  return {
    activities,
    isLoading,
    error,
    isLive,
    setIsLive
  };
}

export function useChartData(type: 'weekly' | 'hours') {
  return useQuery({
    queryKey: ['chart-data', type],
    queryFn: () => fetchChartData(type),
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Refetch every minute
  });
}