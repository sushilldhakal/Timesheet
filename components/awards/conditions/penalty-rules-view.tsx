'use client';

import { PenaltyRule, penaltyRuleSchema } from '@/lib/validations/awards';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PenaltyRulesViewProps {
  penaltyRules: PenaltyRule[];
  onUpdate: (penaltyRules: PenaltyRule[]) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function PenaltyRulesView({ penaltyRules, onUpdate }: PenaltyRulesViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const form = useForm<PenaltyRule>({
    resolver: zodResolver(penaltyRuleSchema),
    defaultValues: {
      label: '',
      triggerType: 'overtime_hours',
      rateType: 'multiplier',
      rateValue: 1.5,
      isStackable: false,
      thresholdHours: 38,
    },
  });

  const triggerType = form.watch('triggerType');
  const rateType = form.watch('rateType');
  const daysOfWeek = form.watch('daysOfWeek');

  const onSubmit = (values: PenaltyRule) => {
    if (editingRuleId) {
      // Update existing rule
      onUpdate(penaltyRules.map(r => r.id === editingRuleId ? { ...values, id: editingRuleId } : r));
      setEditingRuleId(null);
    } else {
      // Add new rule
      const newRule = { ...values, id: `penalty-${Date.now()}` };
      onUpdate([...penaltyRules, newRule]);
    }
    form.reset();
    setIsAdding(false);
  };

  const handleEditRule = (rule: PenaltyRule) => {
    setEditingRuleId(rule.id || null);
    setIsAdding(false);
    form.reset(rule);
  };

  const handleDeleteRule = (ruleId: string | undefined) => {
    if (ruleId) {
      onUpdate(penaltyRules.filter((r) => r.id !== ruleId));
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingRuleId(null);
    form.reset();
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingRuleId(null);
    form.reset({
      label: '',
      triggerType: 'overtime_hours',
      rateType: 'multiplier',
      rateValue: 1.5,
      isStackable: false,
      thresholdHours: 38,
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Penalty Rules</h3>
          {!isAdding && !editingRuleId && (
            <Button
              size="sm"
              onClick={handleAddNew}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Rule
            </Button>
          )}
        </div>

        {penaltyRules.length === 0 && !isAdding && (
          <p className="text-sm">No penalty rules configured.</p>
        )}

        <div className="space-y-4">
          {penaltyRules.map((rule, index) => (
            <div key={rule.id || `penalty-${index}`}>
              {editingRuleId === rule.id ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Edit Penalty Rule</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* All form fields go here - same as the "add" form */}
                    <FormField
                      control={form.control as any}
                      name="label"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Label</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="triggerType"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Trigger Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="overtime_hours">Overtime Hours</SelectItem>
                              <SelectItem value="time_of_day">Time of Day</SelectItem>
                              <SelectItem value="day_of_week">Day of Week</SelectItem>
                              <SelectItem value="public_holiday">Public Holiday</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {triggerType === 'overtime_hours' && (
                      <FormField
                        control={form.control as any}
                        name="thresholdHours"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Threshold Hours</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.5"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {triggerType === 'time_of_day' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name="startHour"
                          render={({ field }: any) => (
                            <FormItem>
                              <FormLabel>Start Hour (0-23)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="23"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control as any}
                          name="endHour"
                          render={({ field }: any) => (
                            <FormItem>
                              <FormLabel>End Hour (0-23)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  max="23"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {triggerType === 'day_of_week' && (
                      <FormItem>
                        <FormLabel>Days of Week</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {DAYS.map((day) => (
                            <FormField
                              key={day}
                              control={form.control as any}
                              name="daysOfWeek"
                              render={({ field }: any) => (
                                <FormItem className="flex items-center gap-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={daysOfWeek?.includes(day) || false}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, day]);
                                        } else {
                                          field.onChange(current.filter((d: string) => d !== day));
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="mb-0 text-sm">{day}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}

                    <FormField
                      control={form.control as any}
                      name="rateType"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Rate Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="multiplier">Multiplier (e.g., 1.5x)</SelectItem>
                              <SelectItem value="flat_amount">Flat Amount (e.g., +$5)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="rateValue"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Rate Value</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              placeholder={rateType === 'multiplier' ? '1.5' : '5.00'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="isStackable"
                      render={({ field }: any) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="mb-0">Stackable with other penalties</FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Update Rule
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div
                  className="border rounded-lg p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEditRule(rule)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEditRule(rule);
                    }
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium">{rule.label}</p>
                    <p className="text-sm">
                      {rule.triggerType} • {rule.rateValue}
                      {rule.rateType === 'multiplier' ? 'x' : '$'}
                      {rule.isStackable && ' • Stackable'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRule(rule);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRule(rule.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {isAdding && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Add New Penalty Rule</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <FormField
                control={form.control as any}
                name="label"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="triggerType"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Trigger Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="overtime_hours">Overtime Hours</SelectItem>
                        <SelectItem value="time_of_day">Time of Day</SelectItem>
                        <SelectItem value="day_of_week">Day of Week</SelectItem>
                        <SelectItem value="public_holiday">Public Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {triggerType === 'overtime_hours' && (
                <FormField
                  control={form.control as any}
                  name="thresholdHours"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Threshold Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {triggerType === 'time_of_day' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name="startHour"
                    render={({ field }: any) => (
                      <FormItem>
                        <FormLabel>Start Hour (0-23)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control as any}
                    name="endHour"
                    render={({ field }: any) => (
                      <FormItem>
                        <FormLabel>End Hour (0-23)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {triggerType === 'day_of_week' && (
                <FormItem>
                  <FormLabel>Days of Week</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {DAYS.map((day) => (
                      <FormField
                        key={day}
                        control={form.control as any}
                        name="daysOfWeek"
                        render={({ field }: any) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox
                                checked={daysOfWeek?.includes(day) || false}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, day]);
                                  } else {
                                    field.onChange(current.filter((d: string) => d !== day));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="mb-0 text-sm">{day}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </FormItem>
              )}

              <FormField
                control={form.control as any}
                name="rateType"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Rate Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="multiplier">Multiplier (e.g., 1.5x)</SelectItem>
                        <SelectItem value="flat_amount">Flat Amount (e.g., +$5)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="rateValue"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Rate Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder={rateType === 'multiplier' ? '1.5' : '5.00'}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="isStackable"
                render={({ field }: any) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">Stackable with other penalties</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                >
                  Save Rule
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </Card>
  );
}
