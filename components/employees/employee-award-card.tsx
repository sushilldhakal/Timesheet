'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Pencil, History, ChevronDown, ChevronRight } from 'lucide-react';
import { FormDialogShell } from '@/components/shared/forms/FormDialogShell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel, FieldError } from '@/components/ui/field';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAwards } from '@/lib/queries/awards';
import { useEmployee, useEmployeeAwardHistory, useAwardEmployee } from '@/lib/queries/employees';

interface EmployeeAwardCardProps {
  employeeId: string;
  currentAwardId?: string | null;
  currentAwardLevel?: string | null;
  currentEmploymentType?: string | null;
  onUpdate: () => void;
  readOnly?: boolean;
}

export default function EmployeeAwardCard({
  employeeId,
  currentAwardId,
  currentAwardLevel,
  currentEmploymentType,
  onUpdate,
  readOnly = false,
}: EmployeeAwardCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAwardId, setSelectedAwardId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [overridingRate, setOverridingRate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [standardHours, setStandardHours] = useState<number | null>(null);

  // TanStack Query hooks
  const awardsQuery = useAwards();
  const employeeQuery = useEmployee(employeeId);
  const historyQuery = useEmployeeAwardHistory(employeeId);
  const awardEmployeeMutation = useAwardEmployee();

  const awards = awardsQuery.data?.awards || [];
  const history = historyQuery.data?.history || [];

  // Get current award name
  const currentAwardName = currentAwardId 
    ? awards.find(award => award._id === currentAwardId)?.name || 'Unknown Award'
    : null;

  useEffect(() => {
    if (employeeQuery.data?.employee) {
      setStandardHours(employeeQuery.data.employee.standardHoursPerWeek ?? null);
    }
  }, [employeeQuery.data]);

  const selectedAward = awards.find((a) => a._id === selectedAwardId);
  const selectedLevelData = selectedAward?.levels.find((l: any) => l.label === selectedLevel);
  const employmentTypes = selectedLevelData?.conditions.map((c: any) => c.employmentType) || [];

  const handleOpenDialog = () => {
    if (readOnly) return;
    setSelectedAwardId(currentAwardId || '');
    setSelectedLevel(currentAwardLevel || '');
    setSelectedEmploymentType(currentEmploymentType || '');
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setOverridingRate('');
    setError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAwardId || !selectedLevel || !selectedEmploymentType || !effectiveFrom) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await awardEmployeeMutation.mutateAsync({
        id: employeeId,
        data: {
          awardId: selectedAwardId,
          awardLevel: selectedLevel,
          employmentType: selectedEmploymentType,
          effectiveFrom: effectiveFrom,
          overridingRate: overridingRate ? parseFloat(overridingRate) : undefined,
        }
      });

      toast.success('Award assigned successfully');
      setDialogOpen(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign award');
    }
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
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Award Assignment
            </CardTitle>
            <CardDescription>
              Current employment conditions and award history
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Button onClick={() => setShowHistory(true)} size="sm" variant="ghost">
                <History className="h-3.5 w-3.5 mr-2" />
                View History
              </Button>
            )}
            {!readOnly ? (
              <Button onClick={handleOpenDialog} size="sm" variant="outline">
                <Pencil className="h-3.5 w-3.5 mr-2" />
                {currentAwardId ? 'Change' : 'Assign'}
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentAwardId ? (
            <div className="space-y-4">
              {/* Current Assignment */}
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span className="text-xs font-medium text-success">CURRENTLY ACTIVE</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Award</p>
                    <p className="text-sm font-medium">{currentAwardName || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Level</p>
                    <p className="text-sm font-medium">{currentAwardLevel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Employment Type</p>
                    <p className="text-sm font-medium">{currentEmploymentType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Standard Hours/Week</p>
                    <p className="text-sm font-medium">{standardHours !== null ? `${standardHours} hrs` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg bg-muted/20">
              <Award className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No award assigned yet</p>
              {!readOnly ? (
                <Button onClick={handleOpenDialog} variant="outline" size="sm">
                  Assign Award
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {!readOnly ? (
        <FormDialogShell
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Assign Award to Employee"
          description="Select the award, level, and employment type for this employee. This will create a new pay condition record effective from the specified date."
          onSubmit={handleSubmit}
          submitLabel={awardEmployeeMutation.isPending ? 'Assigning...' : 'Assign Award'}
          loading={awardEmployeeMutation.isPending}
          error={error}
          size="lg"
        >
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>Award *</FieldLabel>
              <Select
                value={selectedAwardId}
                onValueChange={(value) => {
                  setSelectedAwardId(value);
                  setSelectedLevel('');
                  setSelectedEmploymentType('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an award" />
                </SelectTrigger>
                <SelectContent>
                  {awards.map((award: any) => (
                    <SelectItem key={award._id} value={award._id}>
                      {award.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedAward && (
              <Field>
                <FieldLabel>Level *</FieldLabel>
                <Select
                  value={selectedLevel}
                  onValueChange={(value) => {
                    setSelectedLevel(value);
                    setSelectedEmploymentType('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedAward.levels.map((level: any) => (
                      <SelectItem key={level.label} value={level.label}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            {selectedLevelData && (
              <Field>
                <FieldLabel>Employment Type *</FieldLabel>
                <Select
                  value={selectedEmploymentType}
                  onValueChange={setSelectedEmploymentType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((type: any) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="effectiveFrom">Effective From *</FieldLabel>
                <Input
                  id="effectiveFrom"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When this award assignment starts
                </p>
              </Field>

              <Field>
                <FieldLabel htmlFor="overridingRate">Overriding Rate (Optional)</FieldLabel>
                <Input
                  id="overridingRate"
                  type="number"
                  step="0.01"
                  value={overridingRate}
                  onChange={(e) => setOverridingRate(e.target.value)}
                  placeholder="Leave empty to use award rate"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Custom rate for this employee
                </p>
              </Field>
            </div>
          </FieldGroup>
        </FormDialogShell>
      ) : null}

      {/* History Dialog */}
      <FormDialogShell
        open={showHistory}
        onOpenChange={setShowHistory}
        title="Award Assignment History"
        description="Complete history of award assignments for this employee"
        size="xl"
      >
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-xs">Award</th>
                  <th className="text-left p-3 font-medium text-xs">Level</th>
                  <th className="text-left p-3 font-medium text-xs">Employment Type</th>
                  <th className="text-left p-3 font-medium text-xs">Period</th>
                  <th className="text-right p-3 font-medium text-xs">Override Rate</th>
                </tr>
              </thead>
              <tbody>
                {history.map((condition: any, index: number) => (
                  <tr
                    key={index}
                    className={`border-t ${condition.isActive ? 'bg-primary/5' : ''}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {condition.isActive && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="text-sm">{condition.awardName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{condition.awardLevel}</td>
                    <td className="p-3 text-sm">{condition.employmentType}</td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {formatDate(condition.effectiveFrom)} → {formatDate(condition.effectiveTo)}
                    </td>
                    <td className="p-3 text-sm text-right">
                      {condition.overridingRate ? `${condition.overridingRate.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FormDialogShell>
    </>
  );
}
