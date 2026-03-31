'use client';

import { BreakRule, breakRuleSchema } from '@/lib/validations/awards';
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

interface BreakRulesViewProps {
  breakRules: BreakRule[];
  onUpdate: (breakRules: BreakRule[]) => void;
}

export default function BreakRulesView({ breakRules, onUpdate }: BreakRulesViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const form = useForm<BreakRule>({
    resolver: zodResolver(breakRuleSchema),
    defaultValues: {
      label: '',
      minHours: 0,
      maxHours: 4,
      breakDurationMinutes: 30,
      isPaid: false,
    },
  });

  const onSubmit = (values: BreakRule) => {
    if (editingRuleId) {
      // Update existing rule
      onUpdate(breakRules.map(r => r.id === editingRuleId ? { ...values, id: editingRuleId } : r));
      setEditingRuleId(null);
    } else {
      // Add new rule
      const newRule = { ...values, id: `break-${Date.now()}` };
      onUpdate([...breakRules, newRule]);
    }
    form.reset();
    setIsAdding(false);
  };

  const handleEditRule = (rule: BreakRule) => {
    setEditingRuleId(rule.id || null);
    setIsAdding(false);
    form.reset({
      label: rule.label,
      minHours: rule.minHours,
      maxHours: rule.maxHours,
      breakDurationMinutes: rule.breakDurationMinutes,
      isPaid: rule.isPaid,
    });
  };

  const handleDeleteRule = (ruleId: string | undefined) => {
    if (ruleId) {
      onUpdate(breakRules.filter((r) => r.id !== ruleId));
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
      minHours: 0,
      maxHours: 4,
      breakDurationMinutes: 30,
      isPaid: false,
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Break Rules</h3>
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

        {breakRules.length === 0 && !isAdding && (
          <p className="text-sm">No break rules configured.</p>
        )}

        <div className="space-y-4">
          {breakRules.map((rule, index) => (
            <div key={rule.id || `break-${index}`}>
              {editingRuleId === rule.id ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Edit Break Rule</h4>
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control as any}
                        name="minHours"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Min Hours</FormLabel>
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

                      <FormField
                        control={form.control as any}
                        name="maxHours"
                        render={({ field }: any) => (
                          <FormItem>
                            <FormLabel>Max Hours</FormLabel>
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
                    </div>

                    <FormField
                      control={form.control as any}
                      name="breakDurationMinutes"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Break Duration (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
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
                      name="isPaid"
                      render={({ field }: any) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="mb-0">Paid Break</FormLabel>
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
                      {rule.minHours}–{rule.maxHours}h → {rule.breakDurationMinutes} min{' '}
                      {rule.isPaid ? '(Paid)' : '(Unpaid)'}
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Add New Break Rule</h4>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="minHours"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Min Hours</FormLabel>
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

                <FormField
                  control={form.control as any}
                  name="maxHours"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Max Hours</FormLabel>
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
              </div>

              <FormField
                control={form.control as any}
                name="breakDurationMinutes"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Break Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
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
                name="isPaid"
                render={({ field }: any) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">Paid Break</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
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
