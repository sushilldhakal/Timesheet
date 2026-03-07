'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, Calendar, Award as AwardIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Award Assignment History</DialogTitle>
            <DialogDescription>
              Complete history of award assignments for this employee
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No award history yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((condition, index) => (
                <Card key={index} className={condition.isActive ? 'border-primary' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AwardIcon className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">{condition.awardName}</CardTitle>
                      </div>
                      {condition.isActive && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary text-primary-foreground">
                          Active
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Level</p>
                        <p className="font-medium">{condition.awardLevel}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Employment Type</p>
                        <p className="font-medium">{condition.employmentType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm pt-2 border-t">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDate(condition.effectiveFrom)} → {formatDate(condition.effectiveTo)}
                      </span>
                    </div>
                    {condition.overridingRate && (
                      <div className="text-sm pt-1">
                        <span className="text-muted-foreground">Overriding Rate: </span>
                        <span className="font-medium">${condition.overridingRate.toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
