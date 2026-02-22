'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Calendar, DollarSign, Pencil, History, ChevronDown, ChevronRight } from 'lucide-react';
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

interface AssignAwardCardProps {
  employeeId: string;
  currentAwardId?: string | null;
  currentAwardLevel?: string | null;
  currentEmploymentType?: string | null;
  onUpdate: () => void;
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

export default function AssignAwardCard({
  employeeId,
  currentAwardId,
  currentAwardLevel,
  currentEmploymentType,
  onUpdate,
}: AssignAwardCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [awards, setAwards] = useState<Award[]>([]);
  const [selectedAwardId, setSelectedAwardId] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [overridingRate, setOverridingRate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAwardName, setCurrentAwardName] = useState<string>('');
  const [history, setHistory] = useState<PayCondition[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch awards
  useEffect(() => {
    const fetchAwards = async () => {
      try {
        const res = await fetch('/api/awards');
        if (res.ok) {
          const data = await res.json();
          setAwards(data.awards || []);
        }
      } catch (err) {
        console.error('Failed to fetch awards:', err);
      }
    };
    fetchAwards();
  }, []);

  // Fetch current award name
  useEffect(() => {
    const fetchCurrentAward = async () => {
      if (!currentAwardId) {
        setCurrentAwardName('');
        return;
      }
      try {
        const res = await fetch(`/api/awards/${currentAwardId}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentAwardName(data.name || '');
        }
      } catch (err) {
        console.error('Failed to fetch current award:', err);
      }
    };
    fetchCurrentAward();
  }, [currentAwardId]);

  // Fetch award history
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/award-history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch award history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (currentAwardId) {
      fetchHistory();
    }
  }, [currentAwardId, employeeId]);

  const selectedAward = awards.find((a) => a._id === selectedAwardId);
  const selectedLevelData = selectedAward?.levels.find((l) => l.label === selectedLevel);
  const employmentTypes = selectedLevelData?.conditions.map((c) => c.employmentType) || [];

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

    setLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awardId: selectedAwardId,
          awardLevel: selectedLevel,
          employmentType: selectedEmploymentType,
          effectiveFrom,
          overridingRate: overridingRate ? parseFloat(overridingRate) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to assign award');
      }

      toast.success('Award assigned successfully');
      setDialogOpen(false);
      onUpdate();
      fetchHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to assign award');
      toast.error(err.message || 'Failed to assign award');
    } finally {
      setLoading(false);
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Award Assignment
            </CardTitle>
            <CardDescription className="mt-1.5">
              Current employment conditions and award history
            </CardDescription>
          </div>
          <Button onClick={handleOpenDialog} size="sm">
            <Pencil className="h-4 w-4 mr-2" />
            {currentAwardId ? 'Change Award' : 'Assign Award'}
          </Button>
        </CardHeader>
        <CardContent>
          {currentAwardId ? (
            <div className="space-y-4">
              {/* Current Assignment */}
              <div className="border rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-medium text-primary">CURRENTLY ACTIVE</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
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
                </div>
              </div>

              {/* History Section */}
              {history.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                    className="mb-2 -ml-2"
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
                            <th className="text-left p-3 font-medium">Award</th>
                            <th className="text-left p-3 font-medium">Level</th>
                            <th className="text-left p-3 font-medium">Employment Type</th>
                            <th className="text-left p-3 font-medium">Period</th>
                            <th className="text-right p-3 font-medium">Override Rate</th>
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
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                  )}
                                  {condition.awardName}
                                </div>
                              </td>
                              <td className="p-3">{condition.awardLevel}</td>
                              <td className="p-3">{condition.employmentType}</td>
                              <td className="p-3 text-muted-foreground">
                                {formatDate(condition.effectiveFrom)} → {formatDate(condition.effectiveTo)}
                              </td>
                              <td className="p-3 text-right">
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
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No award assigned yet</p>
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
                      {employmentTypes.map((type) => (
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
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Assigning...' : 'Assign Award'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
