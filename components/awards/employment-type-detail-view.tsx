"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PayRuleView from "./conditions/pay-rule-view";
import BreakRulesView from "./conditions/break-rules-view";
import PenaltyRulesView from "./conditions/penalty-rules-view";
import LeaveEntitlementsView from "./conditions/leave-entitlements-view";
import TOILConfigView from "./conditions/toil-config-view";

interface EmploymentTypeDetailViewProps {
  condition: any;
  onUpdate: (condition: any) => void;
  onDelete: () => void;
}

export default function EmploymentTypeDetailView({
  condition,
  onUpdate,
  onDelete,
}: EmploymentTypeDetailViewProps) {
  
  // Transform backend data to frontend format
  const transformedPayRule = condition.payRule ? {
    type: condition.payRule.type,
    hourlyRate: condition.payRule.rate || condition.payRule.hourlyRate,
    annualSalary: condition.payRule.annualAmount || condition.payRule.annualSalary,
    standardHoursPerWeek: condition.payRule.hoursPerWeek || condition.payRule.standardHoursPerWeek,
    currency: condition.payRule.currency || 'AUD',
  } : null;

  // Transform break rules
  const transformedBreakRules = (condition.breakRules || []).map((rule: any, index: number) => ({
    ...rule,
    id: rule.id || rule._id || `break-${index}`,
    breakDurationMinutes: rule.breakMinutes || rule.breakDurationMinutes,
    isPaid: rule.paid !== undefined ? rule.paid : rule.isPaid,
  }));

  // Transform penalty rules - keep as-is since backend now matches frontend
  const transformedPenaltyRules = (condition.penaltyRules || []).map((rule: any, index: number) => {
    return {
      ...rule,
      id: rule.id || rule._id || `penalty-${index}`,
      daysOfWeek: rule.days || rule.daysOfWeek,
      isStackable: rule.stackable !== undefined ? rule.stackable : rule.isStackable,
    };
  });

  // Transform leave entitlements - keep as-is since backend now uses numbers
  const transformedLeaveEntitlements = (condition.leaveEntitlements || []).map((leave: any, index: number) => {
    return {
      ...leave,
      id: leave.id || leave._id || `leave-${index}`,
      accrualMethod: leave.accrual || leave.accrualMethod,
      carryOver: leave.carriesOver !== undefined ? leave.carriesOver : leave.carryOver,
      loadingPercentage: leave.loadingPercent || leave.loadingPercentage || 0,
      payRate: leave.payRate, // Already a number
    };
  });

  // Transform TOIL rule
  const transformedToilRule = condition.toilRule ? {
    ...condition.toilRule,
    isPaidOut: condition.toilRule.payoutOnExpiry !== undefined ? condition.toilRule.payoutOnExpiry : condition.toilRule.isPaidOut,
  } : null;

  const handlePayRuleUpdate = (payRule: any) => {
    // Transform frontend data back to backend format
    const backendPayRule = {
      type: payRule.type,
      ...(payRule.type === 'hourly' ? {
        rate: payRule.hourlyRate,
      } : {
        annualAmount: payRule.annualSalary,
        hoursPerWeek: payRule.standardHoursPerWeek,
      }),
      currency: payRule.currency,
    };
    onUpdate({ ...condition, payRule: backendPayRule });
  };

  const handleBreakRulesUpdate = (breakRules: any[]) => {
    // Transform back to backend format
    const backendBreakRules = breakRules.map(rule => ({
      ...rule,
      breakMinutes: rule.breakDurationMinutes,
      paid: rule.isPaid,
    }));
    onUpdate({ ...condition, breakRules: backendBreakRules });
  };

  const handlePenaltyRulesUpdate = (penaltyRules: any[]) => {
    // Transform back to backend format - keep days as strings, strip irrelevant fields
    const backendPenaltyRules = penaltyRules.map(rule => {
      const baseRule = {
        label: rule.label,
        triggerType: rule.triggerType,
        rateType: rule.rateType,
        rateValue: rule.rateValue,
        stackable: rule.isStackable,
      };

      // Only include fields relevant to the trigger type
      if (rule.triggerType === 'overtime_hours') {
        return {
          ...baseRule,
          thresholdHours: rule.thresholdHours,
          startHour: null,
          endHour: null,
          days: null,
        };
      } else if (rule.triggerType === 'time_of_day') {
        return {
          ...baseRule,
          thresholdHours: null,
          startHour: rule.startHour,
          endHour: rule.endHour,
          days: null,
        };
      } else if (rule.triggerType === 'day_of_week') {
        // Keep days as string array
        return {
          ...baseRule,
          thresholdHours: null,
          startHour: null,
          endHour: null,
          days: rule.daysOfWeek,
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
        thresholdHours: rule.thresholdHours,
        startHour: rule.startHour,
        endHour: rule.endHour,
        days: rule.daysOfWeek,
      };
    });
    onUpdate({ ...condition, penaltyRules: backendPenaltyRules });
  };

  const handleLeaveEntitlementsUpdate = (leaveEntitlements: any[]) => {
    // Transform back to backend format - keep payRate as number
    const backendLeaveEntitlements = leaveEntitlements.map(leave => {
      return {
        label: leave.label,
        daysPerYear: leave.daysPerYear,
        accrual: leave.accrualMethod,
        carriesOver: leave.carryOver,
        loadingPercent: leave.loadingPercentage,
        payRate: leave.payRate, // Keep as number (percentage)
      };
    });
    onUpdate({ ...condition, leaveEntitlements: backendLeaveEntitlements });
  };

  const handleToilConfigUpdate = (toilRule: any) => {
    // Transform back to backend format
    const backendToilRule = {
      ...toilRule,
      payoutOnExpiry: toilRule.isPaidOut,
    };
    onUpdate({ ...condition, toilRule: backendToilRule });
  };

  return (
    <div className="px-4 pb-4">
      <div className="w-full flex flex-col">
        <Tabs defaultValue="pay" className="w-full flex flex-col mt-4">
          <TabsList variant="line" className="w-full mb-6 flex">
            <TabsTrigger value="pay" className="flex-1">Pay</TabsTrigger>
            <TabsTrigger value="breaks" className="flex-1">Breaks</TabsTrigger>
            <TabsTrigger value="penalties" className="flex-1">Penalties</TabsTrigger>
            <TabsTrigger value="leave" className="flex-1">Leave</TabsTrigger>
            <TabsTrigger value="toil" className="flex-1">TOIL</TabsTrigger>
          </TabsList>

          <TabsContent value="pay" className="mt-0 w-full">
            {transformedPayRule ? (
              <PayRuleView
                payRule={transformedPayRule}
                onUpdate={handlePayRuleUpdate}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">No pay rule configured yet</p>
                  <Button
                    onClick={() =>
                      handlePayRuleUpdate({
                        type: "hourly",
                        hourlyRate: 25,
                        currency: "AUD",
                      })
                    }
                  >
                    Add Pay Rule
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="breaks" className="mt-0 w-full">
            <BreakRulesView
              breakRules={transformedBreakRules}
              onUpdate={handleBreakRulesUpdate}
            />
          </TabsContent>

          <TabsContent value="penalties" className="mt-0 w-full">
            <PenaltyRulesView
              penaltyRules={transformedPenaltyRules}
              onUpdate={handlePenaltyRulesUpdate}
            />
          </TabsContent>

          <TabsContent value="leave" className="mt-0 w-full">
            <LeaveEntitlementsView
              leaveEntitlements={transformedLeaveEntitlements}
              onUpdate={handleLeaveEntitlementsUpdate}
            />
          </TabsContent>

          <TabsContent value="toil" className="mt-0 w-full">
            {transformedToilRule ? (
              <TOILConfigView
                toilConfig={transformedToilRule}
                onUpdate={handleToilConfigUpdate}
              />
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">No TOIL configuration yet</p>
                  <Button
                    onClick={() =>
                      handleToilConfigUpdate({
                        weeklyThresholdHours: 38,
                        accrualMultiplier: 1,
                        maxBalanceHours: undefined,
                        expiryWeeks: undefined,
                        isPaidOut: false,
                      })
                    }
                  >
                    Add TOIL Configuration
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
