"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  conditions: any[];
  onChange: (conditions: any[]) => void;
}

export default function ConditionSetForm({ conditions, onChange }: Props) {
  const addCondition = () => {
    onChange([
      ...conditions,
      {
        employmentType: "",
        breakPolicy: "auto",
        breakRules: [],
        payRule: null,
        penaltyRules: [],
        leaveEntitlements: [],
        toilRule: null,
      },
    ]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    onChange(newConditions);
  };

  // Break Rules
  const addBreakRule = (condIndex: number) => {
    const condition = conditions[condIndex];
    updateCondition(condIndex, "breakRules", [
      ...(condition.breakRules || []),
      { label: "", minHours: 0, maxHours: null, breakMinutes: 0, paid: false },
    ]);
  };

  const updateBreakRule = (condIndex: number, ruleIndex: number, field: string, value: any) => {
    const condition = conditions[condIndex];
    const newRules = [...condition.breakRules];
    newRules[ruleIndex] = { ...newRules[ruleIndex], [field]: value };
    updateCondition(condIndex, "breakRules", newRules);
  };

  const removeBreakRule = (condIndex: number, ruleIndex: number) => {
    const condition = conditions[condIndex];
    updateCondition(
      condIndex,
      "breakRules",
      condition.breakRules.filter((_: any, i: number) => i !== ruleIndex)
    );
  };

  // Penalty Rules
  const addPenaltyRule = (condIndex: number) => {
    const condition = conditions[condIndex];
    updateCondition(condIndex, "penaltyRules", [
      ...(condition.penaltyRules || []),
      {
        label: "",
        triggerType: "overtime",
        thresholdHours: null,
        startHour: null,
        endHour: null,
        days: null,
        rateType: "multiplier",
        rateValue: 1.5,
        stackable: true,
      },
    ]);
  };

  const updatePenaltyRule = (condIndex: number, ruleIndex: number, field: string, value: any) => {
    const condition = conditions[condIndex];
    const newRules = [...condition.penaltyRules];
    newRules[ruleIndex] = { ...newRules[ruleIndex], [field]: value };
    updateCondition(condIndex, "penaltyRules", newRules);
  };

  const removePenaltyRule = (condIndex: number, ruleIndex: number) => {
    const condition = conditions[condIndex];
    updateCondition(
      condIndex,
      "penaltyRules",
      condition.penaltyRules.filter((_: any, i: number) => i !== ruleIndex)
    );
  };

  // Leave Entitlements
  const addLeaveEntitlement = (condIndex: number) => {
    const condition = conditions[condIndex];
    updateCondition(condIndex, "leaveEntitlements", [
      ...(condition.leaveEntitlements || []),
      {
        label: "",
        daysPerYear: 0,
        accrual: "progressive",
        carriesOver: true,
        payRate: "normal",
        loadingPercent: null,
      },
    ]);
  };

  const updateLeaveEntitlement = (condIndex: number, entIndex: number, field: string, value: any) => {
    const condition = conditions[condIndex];
    const newEnts = [...condition.leaveEntitlements];
    newEnts[entIndex] = { ...newEnts[entIndex], [field]: value };
    updateCondition(condIndex, "leaveEntitlements", newEnts);
  };

  const removeLeaveEntitlement = (condIndex: number, entIndex: number) => {
    const condition = conditions[condIndex];
    updateCondition(
      condIndex,
      "leaveEntitlements",
      condition.leaveEntitlements.filter((_: any, i: number) => i !== entIndex)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mt-4">
        <Label>Employment Types</Label>
        <Button type="button" onClick={addCondition} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Employment Type
        </Button>
      </div>

      {conditions.map((condition, condIndex) => (
        <div key={condIndex} className="border p-4 rounded bg-muted/50 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employment Type *</Label>
                  <Input
                    value={condition.employmentType}
                    onChange={(e) =>
                      updateCondition(condIndex, "employmentType", e.target.value)
                    }
                    required
                    placeholder="e.g., full_time, casual"
                  />
                </div>
                <div>
                  <Label>Break Policy</Label>
                  <Select
                    value={condition.breakPolicy || "auto"}
                    onValueChange={(value) =>
                      updateCondition(condIndex, "breakPolicy", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="always">Always</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs defaultValue="pay" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="pay">Pay</TabsTrigger>
                  <TabsTrigger value="breaks">Breaks</TabsTrigger>
                  <TabsTrigger value="penalties">Penalties</TabsTrigger>
                  <TabsTrigger value="leave">Leave</TabsTrigger>
                  <TabsTrigger value="toil">TOIL</TabsTrigger>
                </TabsList>

                <TabsContent value="pay" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pay Type</Label>
                      <Select
                        value={condition.payRule?.type || "hourly"}
                        onValueChange={(value) =>
                          updateCondition(condIndex, "payRule", {
                            ...condition.payRule,
                            type: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="salary">Salary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Input
                        value={condition.payRule?.currency || "AUD"}
                        onChange={(e) =>
                          updateCondition(condIndex, "payRule", {
                            ...condition.payRule,
                            currency: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {condition.payRule?.type === "hourly" ? (
                    <div>
                      <Label>Hourly Rate *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={condition.payRule?.rate || ""}
                        onChange={(e) =>
                          updateCondition(condIndex, "payRule", {
                            ...condition.payRule,
                            rate: parseFloat(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Annual Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={condition.payRule?.annualAmount || ""}
                          onChange={(e) =>
                            updateCondition(condIndex, "payRule", {
                              ...condition.payRule,
                              annualAmount: parseFloat(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label>Hours Per Week *</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={condition.payRule?.hoursPerWeek || ""}
                          onChange={(e) =>
                            updateCondition(condIndex, "payRule", {
                              ...condition.payRule,
                              hoursPerWeek: parseFloat(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="breaks" className="space-y-4">
                  <Button
                    type="button"
                    onClick={() => addBreakRule(condIndex)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Break Rule
                  </Button>

                  {condition.breakRules?.map((rule: any, ruleIndex: number) => (
                    <div key={ruleIndex} className="border p-3 rounded space-y-3">
                      <div className="flex justify-between">
                        <Label>Break Rule {ruleIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBreakRule(condIndex, ruleIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={rule.label}
                            onChange={(e) =>
                              updateBreakRule(condIndex, ruleIndex, "label", e.target.value)
                            }
                            placeholder="e.g., Meal Break"
                          />
                        </div>
                        <div>
                          <Label>Break Minutes</Label>
                          <Input
                            type="number"
                            value={rule.breakMinutes}
                            onChange={(e) =>
                              updateBreakRule(
                                condIndex,
                                ruleIndex,
                                "breakMinutes",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Min Hours</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={rule.minHours}
                            onChange={(e) =>
                              updateBreakRule(
                                condIndex,
                                ruleIndex,
                                "minHours",
                                parseFloat(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Max Hours (null = no limit)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={rule.maxHours === null ? "" : rule.maxHours}
                            onChange={(e) =>
                              updateBreakRule(
                                condIndex,
                                ruleIndex,
                                "maxHours",
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )
                            }
                            placeholder="Leave empty for no limit"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={rule.paid}
                          onCheckedChange={(checked) =>
                            updateBreakRule(condIndex, ruleIndex, "paid", checked)
                          }
                        />
                        <Label>Paid Break</Label>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="penalties" className="space-y-4">
                  <Button
                    type="button"
                    onClick={() => addPenaltyRule(condIndex)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Penalty Rule
                  </Button>

                  {condition.penaltyRules?.map((rule: any, ruleIndex: number) => (
                    <div key={ruleIndex} className="border p-3 rounded space-y-3">
                      <div className="flex justify-between">
                        <Label>Penalty Rule {ruleIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePenaltyRule(condIndex, ruleIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={rule.label}
                            onChange={(e) =>
                              updatePenaltyRule(condIndex, ruleIndex, "label", e.target.value)
                            }
                            placeholder="e.g., Overtime"
                          />
                        </div>
                        <div>
                          <Label>Trigger Type</Label>
                          <Select
                            value={rule.triggerType}
                            onValueChange={(value) =>
                              updatePenaltyRule(condIndex, ruleIndex, "triggerType", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="overtime">Overtime</SelectItem>
                              <SelectItem value="time_of_day">Time of Day</SelectItem>
                              <SelectItem value="day_of_week">Day of Week</SelectItem>
                              <SelectItem value="public_holiday">Public Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Rate Type</Label>
                          <Select
                            value={rule.rateType}
                            onValueChange={(value) =>
                              updatePenaltyRule(condIndex, ruleIndex, "rateType", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="multiplier">Multiplier</SelectItem>
                              <SelectItem value="flat_addition">Flat Addition</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Rate Value</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={rule.rateValue}
                            onChange={(e) =>
                              updatePenaltyRule(
                                condIndex,
                                ruleIndex,
                                "rateValue",
                                parseFloat(e.target.value)
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={rule.stackable}
                          onCheckedChange={(checked) =>
                            updatePenaltyRule(condIndex, ruleIndex, "stackable", checked)
                          }
                        />
                        <Label>Stackable</Label>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="leave" className="space-y-4">
                  <Button
                    type="button"
                    onClick={() => addLeaveEntitlement(condIndex)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Leave Entitlement
                  </Button>

                  {condition.leaveEntitlements?.map((ent: any, entIndex: number) => (
                    <div key={entIndex} className="border p-3 rounded space-y-3">
                      <div className="flex justify-between">
                        <Label>Leave Entitlement {entIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLeaveEntitlement(condIndex, entIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Label</Label>
                          <Input
                            value={ent.label}
                            onChange={(e) =>
                              updateLeaveEntitlement(condIndex, entIndex, "label", e.target.value)
                            }
                            placeholder="e.g., Annual Leave"
                          />
                        </div>
                        <div>
                          <Label>Days Per Year</Label>
                          <Input
                            type="number"
                            value={ent.daysPerYear}
                            onChange={(e) =>
                              updateLeaveEntitlement(
                                condIndex,
                                entIndex,
                                "daysPerYear",
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>Accrual</Label>
                          <Select
                            value={ent.accrual}
                            onValueChange={(value) =>
                              updateLeaveEntitlement(condIndex, entIndex, "accrual", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="progressive">Progressive</SelectItem>
                              <SelectItem value="upfront">Upfront</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Loading %</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={ent.loadingPercent === null ? "" : ent.loadingPercent}
                            onChange={(e) =>
                              updateLeaveEntitlement(
                                condIndex,
                                entIndex,
                                "loadingPercent",
                                e.target.value === "" ? null : parseFloat(e.target.value)
                              )
                            }
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={ent.carriesOver}
                          onCheckedChange={(checked) =>
                            updateLeaveEntitlement(condIndex, entIndex, "carriesOver", checked)
                          }
                        />
                        <Label>Carries Over</Label>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="toil" className="space-y-4">
                  {condition.toilRule ? (
                    <div className="border p-3 rounded space-y-3">
                      <div className="flex justify-between">
                        <Label>TOIL Configuration</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateCondition(condIndex, "toilRule", null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Weekly Threshold Hours</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={condition.toilRule.weeklyThresholdHours}
                            onChange={(e) =>
                              updateCondition(condIndex, "toilRule", {
                                ...condition.toilRule,
                                weeklyThresholdHours: parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Accrual Multiplier</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={condition.toilRule.accrualMultiplier}
                            onChange={(e) =>
                              updateCondition(condIndex, "toilRule", {
                                ...condition.toilRule,
                                accrualMultiplier: parseFloat(e.target.value),
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label>Max Balance Hours</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={
                              condition.toilRule.maxBalanceHours === null
                                ? ""
                                : condition.toilRule.maxBalanceHours
                            }
                            onChange={(e) =>
                              updateCondition(condIndex, "toilRule", {
                                ...condition.toilRule,
                                maxBalanceHours:
                                  e.target.value === "" ? null : parseFloat(e.target.value),
                              })
                            }
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label>Expiry Weeks</Label>
                          <Input
                            type="number"
                            value={
                              condition.toilRule.expiryWeeks === null
                                ? ""
                                : condition.toilRule.expiryWeeks
                            }
                            onChange={(e) =>
                              updateCondition(condIndex, "toilRule", {
                                ...condition.toilRule,
                                expiryWeeks:
                                  e.target.value === "" ? null : parseInt(e.target.value),
                              })
                            }
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={condition.toilRule.payoutOnExpiry}
                          onCheckedChange={(checked) =>
                            updateCondition(condIndex, "toilRule", {
                              ...condition.toilRule,
                              payoutOnExpiry: checked,
                            })
                          }
                        />
                        <Label>Payout on Expiry</Label>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() =>
                        updateCondition(condIndex, "toilRule", {
                          weeklyThresholdHours: 40,
                          accrualMultiplier: 1,
                          maxBalanceHours: null,
                          expiryWeeks: null,
                          payoutOnExpiry: false,
                        })
                      }
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add TOIL Configuration
                    </Button>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeCondition(condIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
