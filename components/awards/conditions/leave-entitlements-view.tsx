'use client';

import { LeaveEntitlement, leaveEntitlementSchema } from '@/lib/validations/awards';
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

interface LeaveEntitlementsViewProps {
  leaveEntitlements: LeaveEntitlement[];
  onUpdate: (leaveEntitlements: LeaveEntitlement[]) => void;
}

export default function LeaveEntitlementsView({
  leaveEntitlements,
  onUpdate,
}: LeaveEntitlementsViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntitlementId, setEditingEntitlementId] = useState<string | null>(null);
  const form = useForm<LeaveEntitlement>({
    resolver: zodResolver(leaveEntitlementSchema),
    defaultValues: {
      label: '',
      daysPerYear: 20,
      accrualMethod: 'progressive',
      carryOver: true,
      loadingPercentage: 0,
      payRate: 100,
    },
  });

  const onSubmit = (values: LeaveEntitlement) => {
    if (editingEntitlementId) {
      // Update existing entitlement
      onUpdate(leaveEntitlements.map(l => l.id === editingEntitlementId ? { ...values, id: editingEntitlementId } : l));
      setEditingEntitlementId(null);
    } else {
      // Add new entitlement
      const newEntitlement = { ...values, id: `leave-${Date.now()}` };
      onUpdate([...leaveEntitlements, newEntitlement]);
    }
    form.reset();
    setIsAdding(false);
  };

  const handleEditEntitlement = (entitlement: LeaveEntitlement) => {
    setEditingEntitlementId(entitlement.id || null);
    setIsAdding(false);
    form.reset(entitlement);
  };

  const handleDeleteEntitlement = (entitlementId: string | undefined) => {
    if (entitlementId) {
      onUpdate(leaveEntitlements.filter((l) => l.id !== entitlementId));
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingEntitlementId(null);
    form.reset();
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingEntitlementId(null);
    form.reset({
      label: '',
      daysPerYear: 20,
      accrualMethod: 'progressive',
      carryOver: true,
      loadingPercentage: 0,
      payRate: 100,
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Leave Entitlements</h3>
          {!isAdding && !editingEntitlementId && (
            <Button
              size="sm"
              onClick={handleAddNew}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Entitlement
            </Button>
          )}
        </div>

        {leaveEntitlements.length === 0 && !isAdding && (
          <p className="text-sm">No leave entitlements configured.</p>
        )}

        <div className="space-y-4">
          {leaveEntitlements.map((entitlement, index) => (
            <div key={entitlement.id || `leave-${index}`}>
              {editingEntitlementId === entitlement.id ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Edit Leave Entitlement</h4>
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
                            <Input {...field} placeholder="e.g., Annual Leave, Sick Leave" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="daysPerYear"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Days Per Year</FormLabel>
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
                      name="accrualMethod"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Accrual Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="progressive">Progressive (throughout year)</SelectItem>
                              <SelectItem value="upfront">Upfront (at year start)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="payRate"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Pay Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="200"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              placeholder="100 for standard, 117.5 for loading"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name="loadingPercentage"
                      render={({ field }: any) => (
                        <FormItem>
                          <FormLabel>Loading Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
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
                      name="carryOver"
                      render={({ field }: any) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="mb-0">Unused days carry over</FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Update Entitlement
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
                  onClick={() => handleEditEntitlement(entitlement)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEditEntitlement(entitlement);
                    }
                  }}
                >
                  <div className="flex-1">
                    <p className="font-medium">{entitlement.label}</p>
                    <p className="text-sm">
                      {entitlement.daysPerYear} days/year • {entitlement.accrualMethod} • {entitlement.payRate}%
                      {entitlement.carryOver && ' • Carry Over'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditEntitlement(entitlement);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEntitlement(entitlement.id);
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
                <h4 className="font-medium">Add New Leave Entitlement</h4>
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
                      <Input
                        {...field}
                        placeholder="e.g., Annual Leave, Sick Leave"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="daysPerYear"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Days Per Year</FormLabel>
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
                name="accrualMethod"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Accrual Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="progressive">Progressive (throughout year)</SelectItem>
                        <SelectItem value="upfront">Upfront (at year start)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="payRate"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Pay Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="200"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        placeholder="100 for standard, 117.5 for loading"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="loadingPercentage"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Loading Percentage (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
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
                name="carryOver"
                render={({ field }: any) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">Unused days carry over</FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                >
                  Save Entitlement
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
