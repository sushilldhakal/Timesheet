'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  Settings,
  Plus,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant?: 'default' | 'outline' | 'secondary';
}

const quickActions: QuickAction[] = [
  {
    label: 'Add Employee',
    href: '/dashboard/employees/new',
    icon: Plus,
    description: 'Add new team member',
    variant: 'default'
  },
  {
    label: 'View Timesheets',
    href: '/dashboard/timesheet',
    icon: FileText,
    description: 'Review & approve',
    variant: 'outline'
  },
  {
    label: 'Scheduling',
    href: '/dashboard/scheduling',
    icon: Calendar,
    description: 'Manage shifts',
    variant: 'outline'
  },
  {
    label: 'Export Data',
    href: '/dashboard/timesheet?export=true',
    icon: Download,
    description: 'Download reports',
    variant: 'secondary'
  }
];

export function QuickActionsPanel() {
  return (
    <Card elevation="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.href}
              asChild
              variant={action.variant}
              className="w-full justify-start h-auto p-3"
            >
              <Link href={action.href}>
                <div className="flex items-center gap-3 w-full">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium text-sm">{action.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}