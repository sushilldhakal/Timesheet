"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";
import AwardFormDialog from "@/components/awards/award-form-dialog";
import AwardDetail from "@/components/awards/award-detail";
import { useAwards, useUpdateAward, useDeleteAward } from "@/lib/queries/awards";
import { toast } from "sonner";

export type AwardRow = {
  _id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  levels: any[];
  createdAt: string;
  updatedAt: string;
};

export default function AwardsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<AwardRow | null>(null);
  const [selectedAward, setSelectedAward] = useState<AwardRow | null>(null);
  const [expandedAwards, setExpandedAwards] = useState<Set<string>>(new Set());
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const levelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // TanStack Query hooks
  const awardsQuery = useAwards();
  const updateAwardMutation = useUpdateAward();
  const deleteAwardMutation = useDeleteAward();

  const awards = awardsQuery.data?.awards || [];
  const loading = awardsQuery.isLoading;

  const handleSelectAward = (award: AwardRow) => {
    setSelectedAward(award);
    setExpandedAwards((prev) => new Set(prev).add(award._id));
  };

  const toggleAwardExpansion = (awardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAwards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(awardId)) {
        newSet.delete(awardId);
      } else {
        newSet.add(awardId);
      }
      return newSet;
    });
  };

  const scrollToLevel = (awardId: string, levelIndex: number) => {
    const key = `${awardId}-level-${levelIndex}`;
    const element = levelRefs.current[key];
    if (element) {
      // Open the accordion
      setOpenAccordions((prev) => new Set(prev).add(key));
      // Scroll to it
      setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const handleEdit = () => {
    if (selectedAward) {
      setEditingAward(selectedAward);
      setAddOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedAward) return;
    if (!confirm("Are you sure you want to delete this award?")) return;

    try {
      await deleteAwardMutation.mutateAsync(selectedAward._id);
      toast.success("Award deleted successfully");
      setSelectedAward(null);
    } catch (error: any) {
      console.error("Error deleting award:", error);
      toast.error(error.message || "Failed to delete award");
    }
  };

  const handleUpdateAward = async (updatedAward: AwardRow) => {
    try {
      // Transform the award data to match Mongoose schema
      const transformedAward = {
        name: updatedAward.name,
        description: updatedAward.description ?? undefined,
        isActive: updatedAward.isActive,
        levels: updatedAward.levels.map(level => ({
          label: level.label,
          conditions: level.conditions.map((condition: any) => ({
            employmentType: condition.employmentType,
            breakPolicy: condition.breakPolicy || 'auto',
            // Transform break rules
            breakRules: (condition.breakRules || []).map((rule: any) => ({
              label: rule.label,
              minHours: rule.minHours,
              maxHours: rule.maxHours,
              breakMinutes: rule.breakDurationMinutes || rule.breakMinutes,
              paid: rule.isPaid !== undefined ? rule.isPaid : rule.paid,
            })),
            // Transform pay rule - only include if it exists
            payRule: condition.payRule ? {
              type: condition.payRule.type,
              ...(condition.payRule.type === 'hourly' ? {
                rate: condition.payRule.hourlyRate || condition.payRule.rate || 25,
              } : {
                annualAmount: condition.payRule.annualSalary || condition.payRule.annualAmount,
                hoursPerWeek: condition.payRule.standardHoursPerWeek || condition.payRule.hoursPerWeek,
              }),
              currency: condition.payRule.currency || 'AUD',
            } : null,
            // Transform penalty rules - keep day names as strings, strip irrelevant fields
            penaltyRules: (condition.penaltyRules || []).map((rule: any) => {
              const baseRule = {
                label: rule.label,
                triggerType: rule.triggerType,
                rateType: rule.rateType,
                rateValue: rule.rateValue,
                stackable: rule.isStackable !== undefined ? rule.isStackable : (rule.stackable !== undefined ? rule.stackable : true),
              };

              // Only include fields relevant to the trigger type
              if (rule.triggerType === 'overtime_hours') {
                return {
                  ...baseRule,
                  thresholdHours: rule.thresholdHours || null,
                  startHour: null,
                  endHour: null,
                  days: null,
                };
              } else if (rule.triggerType === 'time_of_day') {
                return {
                  ...baseRule,
                  thresholdHours: null,
                  startHour: rule.startHour || null,
                  endHour: rule.endHour || null,
                  days: null,
                };
              } else if (rule.triggerType === 'day_of_week') {
                // Keep days as string array (day names)
                const days = rule.daysOfWeek || rule.days;
                return {
                  ...baseRule,
                  thresholdHours: null,
                  startHour: null,
                  endHour: null,
                  days: days || null,
                };
              } else if (rule.triggerType === 'public_holiday') {
                return {
                  ...baseRule,
                  thresholdHours: null,
                  startHour: null,
                  endHour: null,
                  days: null,
                };
              }
              
              return {
                ...baseRule,
                thresholdHours: rule.thresholdHours || null,
                startHour: rule.startHour || null,
                endHour: rule.endHour || null,
                days: rule.daysOfWeek || rule.days || null,
              };
            }),
            // Transform leave entitlements - keep payRate as number
            leaveEntitlements: (condition.leaveEntitlements || []).map((leave: any) => {
              return {
                label: leave.label,
                daysPerYear: leave.daysPerYear,
                accrual: leave.accrualMethod || leave.accrual,
                carriesOver: leave.carryOver !== undefined ? leave.carryOver : (leave.carriesOver !== undefined ? leave.carriesOver : true),
                payRate: leave.payRate, // Keep as number (percentage)
                loadingPercent: leave.loadingPercentage || leave.loadingPercent || null,
              };
            }),
            // Transform TOIL rule - only include if it exists
            toilRule: condition.toilRule ? {
              weeklyThresholdHours: condition.toilRule.weeklyThresholdHours,
              accrualMultiplier: condition.toilRule.accrualMultiplier || 1,
              maxBalanceHours: condition.toilRule.maxBalanceHours || null,
              expiryWeeks: condition.toilRule.expiryWeeks || null,
              payoutOnExpiry: condition.toilRule.isPaidOut !== undefined ? condition.toilRule.isPaidOut : (condition.toilRule.payoutOnExpiry !== undefined ? condition.toilRule.payoutOnExpiry : false),
            } : null,
          })),
        })),
      };

      await updateAwardMutation.mutateAsync({
        id: updatedAward._id,
        data: transformedAward,
      });

      toast.success("Award updated successfully");
      if (selectedAward?._id === updatedAward._id) {
        setSelectedAward(updatedAward);
      }
    } catch (error: any) {
      console.error("Error updating award:", error);
      toast.error(error.message || "Failed to update award");
    }
  };

  const handleFormClose = () => {
    setAddOpen(false);
    setEditingAward(null);
  };

  useEffect(() => {
    if (!selectedAward && awards.length === 1 && !loading) {
      setSelectedAward(awards[0]);
      setExpandedAwards(new Set([awards[0]._id]));
    }
  }, [awards, loading, selectedAward]);

  return (
    <>
      <div className="flex flex-col space-y-4 p-4 lg:p-8">
        {/* Header Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl">Awards Management</CardTitle>
              <CardDescription className="mt-1.5">
                Manage employment awards, levels, and conditions
              </CardDescription>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Award
            </Button>
          </CardHeader>
        </Card>

        {/* Main Content Area */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-4 lg:space-y-0">
          {/* Sidebar - Awards List with Levels */}
          <aside className="lg:w-72 flex-shrink-0 ">
            <Card className="sticky top-20">
              <CardContent className="p-3">
                <nav className="space-y-1">
                  {loading ? (
                    <div className="py-8 text-center text-sm">Loading...</div>
                  ) : awards.length === 0 ? (
                    <div className="py-8 px-4 text-center">
                      <p className="text-sm mb-3">No awards yet</p>
                      <Button onClick={() => setAddOpen(true)} size="sm" variant="outline" className="w-full rounded-md">
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Award
                      </Button>
                    </div>
                  ) : (
                    awards.map((award) => {
                      const isExpanded = expandedAwards.has(award._id);
                      const isSelected = selectedAward?._id === award._id;

                      return (
                        <div key={award._id} className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => handleSelectAward(award)}
                              variant={isSelected ? "default" : "ghost"}
                              className="flex-1 justify-start rounded-md h-auto py-2.5 px-3"
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                  <span className="font-medium truncate w-full text-sm">{award.name}</span>
                                  {award.levels.length > 0 && (
                                    <span className="text-xs opacity-70 mt-0.5">
                                      {award.levels.length} level{award.levels.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                                {award.levels.length > 0 && (
                                  <span
                                    onClick={(e) => toggleAwardExpansion(award._id, e)}
                                    className="p-0.5 hover:bg-accent/50 rounded flex-shrink-0 cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </Button>
                          </div>

                          {/* Levels submenu */}
                          {isExpanded && award.levels.length > 0 && (
                            <div className="ml-6 space-y-0.5 border-l pl-2">
                              {award.levels.map((level: any, levelIndex: number) => (
                                <Button
                                  key={levelIndex}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start rounded-md text-sm font-normal h-8 px-2"
                                  onClick={() => {
                                    handleSelectAward(award);
                                    setTimeout(() => scrollToLevel(award._id, levelIndex), 100);
                                  }}
                                >
                                  <span className="truncate">{level.label}</span>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Content - Award Details */}
          <div className="flex-1 min-w-0">
            {selectedAward ? (
              <AwardDetail
                award={selectedAward}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdate={handleUpdateAward}
                levelRefs={levelRefs}
                openAccordions={openAccordions}
                setOpenAccordions={setOpenAccordions}
              />
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-lg mb-2">Select an award to view details</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Choose an award from the sidebar to configure its levels and conditions
                  </p>
                  {awards.length === 0 && (
                    <Button onClick={() => setAddOpen(true)}>
                      <Plus className="mr-2 h-4 w-4 rounded-md" />
                      Create Your First Award
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AwardFormDialog
        open={addOpen}
        onClose={handleFormClose}
        award={editingAward}
      />
    </>
  );
}
