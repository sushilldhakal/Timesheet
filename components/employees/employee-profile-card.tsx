'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Pencil, History, ChevronDown, ChevronRight, UserCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useAwards } from '@/lib/queries/awards';
import { useEmployee, useEmployeeAwardHistory, useAwardEmployee } from '@/lib/queries/employees';

interface EmployeeProfileCardProps {
  employeeId: string;
  employee: {
    name: string;
    pin: string;
    role?: string[];
    roleAssignments?: Array<{
      id: string;
      roleId: string;
      roleName: string;
      roleColor?: string;
      locationId: string;
      locationName: string;
      validFrom: string;
      validTo: string | null;
      isActive: boolean;
    }>;
    employer?: string[];
    employerDetails?: Array<{
      id: string;
      name: string;
      color?: string;
    }>;
    location?: string[];
    locationDetails?: Array<{
      id: string;
      name: string;
      color?: string;
    }>;
    email?: string;
    phone?: string;
    img?: string;
  };
  currentAwardId?: string | null;
  currentAwardLevel?: string | null;
  currentEmploymentType?: string | null;
  onUpdate: () => void;
  onEditEmployee: () => void;
}

interface Award {
  _id: string;
  name: string;
  levels: {
    label: string;
    conditions: {
      employmentType: string;
    }[];
  }[];
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

export default function EmployeeProfileCard({
  employeeId,
  employee,
  currentAwardId,
  currentAwardLevel,
  currentEmploymentType,
  onUpdate,
  onEditEmployee,
}: EmployeeProfileCardProps) {
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

  const loading = awardEmployeeMutation.isPending;

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
          <div className="flex gap-4 flex-1">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {employee.img ? (
                <OptimizedImage src={employee.img} alt={employee.name} fill className="object-cover" sizes="64px" />
              ) : (
                <UserCircle className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="mb-1">{employee.name}</CardTitle>
              <CardDescription className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>PIN: {employee.pin}</span>
                  {employee.roleAssignments && employee.roleAssignments.length > 0 && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span>Roles:</span>
                        {employee.roleAssignments
                          .filter(ra => ra.isActive)
                          .map((ra) => (
                            <a
                              key={ra.id}
                              href={`/dashboard/category?type=role`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                              {ra.roleColor && (
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: ra.roleColor }}
                                />
                              )}
                              {ra.roleName}
                              <span className="text-muted-foreground">@ {ra.locationName}</span>
                            </a>
                          ))}
                      </div>
                    </>
                  )}
                </div>
                {employee.employerDetails && employee.employerDetails.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span>Employers:</span>
                    {employee.employerDetails.map((emp) => (
                      <a
                        key={emp.id}
                        href={`/dashboard/category?type=employer`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        {emp.color && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: emp.color }}
                          />
                        )}
                        {emp.name}
                      </a>
                    ))}
                  </div>
                ) : employee.employer?.length ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span>Employers:</span>
                    {employee.employer.map((emp, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary">
                        {emp}
                      </span>
                    ))}
                  </div>
                ) : null}
                {employee.locationDetails && employee.locationDetails.length > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span>Locations:</span>
                    {employee.locationDetails.map((loc) => (
                      <a
                        key={loc.id}
                        href={`/dashboard/category?type=location`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-secondary hover:bg-secondary/80 transition-colors"
                      >
                        {loc.color && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: loc.color }}
                          />
                        )}
                        {loc.name}
                      </a>
                    ))}
                  </div>
                ) : null}
                {employee.email && <div>Email: {employee.email}</div>}
                {employee.phone && <div>Phone: {employee.phone}</div>}
              </CardDescription>
            </div>
          </div>
          <Button onClick={onEditEmployee} size="sm" className="flex-shrink-0">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4" />
                Award Assignment
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current employment conditions and award history
              </p>
            </div>
            <Button onClick={handleOpenDialog} size="sm" variant="outline">
              <Pencil className="h-3.5 w-3.5 mr-2" />
              {currentAwardId ? 'Change' : 'Assign'}
            </Button>
          </div>

          {currentAwardId ? (
            <div className="space-y-4">
              {/* Current Assignment */}
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary">CURRENTLY ACTIVE</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
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

              {/* History Section */}
              {history.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="mb-2 -ml-2 h-8"
                  >
                    {showHistory ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <History className="h-4 w-4 mr-2" />
                    Award History ({history.length})
                  </Button>

                  {showHistory && (
                    <div className="border rounded-lg overflow-hidden">
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
                          {history.map((condition, index) => (
                            <tr
                              key={index}
                              className={`border-t ${condition.isActive ? 'bg-primary/5' : ''}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {condition.isActive && (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
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
                                {condition.overridingRate ? `$${condition.overridingRate.toFixed(2)}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg bg-muted/20">
              <Award className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No award assigned yet</p>
              <Button onClick={handleOpenDialog} variant="outline" size="sm">
                Assign Award
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Award to Employee</DialogTitle>
            <DialogDescription>
              Select the award, level, and employment type for this employee. This will create a new
              pay condition record effective from the specified date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
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
                    {awards.map((award) => (
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
                      {selectedAward.levels.map((level) => (
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

              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={awardEmployeeMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={awardEmployeeMutation.isPending}>
                {awardEmployeeMutation.isPending ? 'Assigning...' : 'Assign Award'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
