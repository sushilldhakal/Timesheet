'use client';

import { TOILConfig, toilConfigSchema } from '@/lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface TOILConfigViewProps {
  toilConfig: TOILConfig;
  onUpdate: (toilConfig: TOILConfig) => void;
}

export default function TOILConfigView({ toilConfig, onUpdate }: TOILConfigViewProps) {
  const form = useForm<TOILConfig>({
    resolver: zodResolver(toilConfigSchema),
    values: toilConfig,
  });

  return (
    <Card className="p-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onUpdate)}
          className="space-y-6"
        >
          <div className="border p-4 rounded-lg">
            <p className="text-sm mb-3">
              Time Off In Lieu (TOIL) - Compensatory time earned for working overtime
            </p>
          </div>

          <FormField
            control={form.control as any}
            name="weeklyThresholdHours"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Weekly Threshold Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 38 (leave empty to disable TOIL)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="accrualMultiplier"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Accrual Multiplier</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 1.0 or 1.5"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="maxBalanceHours"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Maximum Balance Hours</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 80 (cap on accrued hours)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="expiryWeeks"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Expiry Period (weeks)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 52 (1 year)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="isPaidOut"
            render={({ field }: any) => (
              <FormItem className="flex items-center gap-2 p-4 border rounded-lg">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="flex-1">
                  <FormLabel className="mb-0">Paid Out on Expiry</FormLabel>
                  <p className="text-xs mt-1">
                    {field.value ? 'Expired TOIL will be paid out' : 'Expired TOIL will be forfeited'}
                  </p>
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Save TOIL Configuration
          </Button>
        </form>
      </Form>
    </Card>
  );
}
