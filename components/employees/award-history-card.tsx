'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Calendar, Award as AwardIcon } from 'lucide-react';
import { format } from 'date-fns';
import { InfoCard, KeyValueList } from '@/components/shared/data-display/InfoCard';
import { FormDialogShell } from '@/components/shared/forms/FormDialogShell';
import { useEmployeeAwardHistory } from '@/lib/queries/employees';

interface AwardHistoryCardProps {
  employeeId: string;
}

interface PayCondition {
  awardId: string;
  awardName: string;
  awardLevel: string;
  employmentType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  overridingRate: number | null;
  isActive: boolean;
}

export default function AwardHistoryCard({ employeeId }: AwardHistoryCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // TanStack Query hook
  const { data: historyData, isLoading: loading } = useEmployeeAwardHistory(employeeId);
  const history = historyData?.history || [];

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Present';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Button onClick={handleOpenDialog} variant="outline" size="sm">
        <History className="h-4 w-4 mr-2" />
        View Award History
      </Button>

      <FormDialogShell
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Award Assignment History"
        description="Complete history of award assignments for this employee"
        size="lg"
      >
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No award history yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((condition, index) => {
              const keyValueItems = [
                {
                  key: 'Level',
                  value: condition.awardLevel,
                },
                {
                  key: 'Employment Type',
                  value: condition.employmentType,
                },
                {
                  key: 'Period',
                  value: `${formatDate(condition.effectiveFrom)} → ${formatDate(condition.effectiveTo)}`,
                },
              ];

              if (condition.overridingRate) {
                keyValueItems.push({
                  key: 'Overriding Rate',
                  value: `$${condition.overridingRate.toFixed(2)}`,
                });
              }

              const badge = condition.isActive ? (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary text-primary-foreground">
                  Active
                </span>
              ) : undefined;

              return (
                <InfoCard
                  key={index}
                  title={condition.awardName}
                  icon={<AwardIcon className="h-4 w-4 text-muted-foreground" />}
                  actions={badge}
                  className={condition.isActive ? 'border-primary' : ''}
                >
                  <KeyValueList items={keyValueItems} orientation="vertical" />
                </InfoCard>
              );
            })}
          </div>
        )}
      </FormDialogShell>
    </>
  );
}
