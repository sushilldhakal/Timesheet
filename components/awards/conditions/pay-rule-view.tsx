'use client';

import { PayRule, payRuleSchema } from '@/lib/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface PayRuleViewProps {
  payRule: PayRule;
  onUpdate: (payRule: PayRule) => void;
}

export default function PayRuleView({ payRule, onUpdate }: PayRuleViewProps) {
  const form = useForm<PayRule>({
    resolver: zodResolver(payRuleSchema),
    values: payRule,
  });

  const payType = form.watch('type');

  return (
    <Card className="p-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onUpdate)}
          className="space-y-6"
        >
          <FormField
            control={form.control as any}
            name="type"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Pay Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="salary">Annual Salary</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {payType === 'hourly' && (
            <FormField
              control={form.control as any}
              name="hourlyRate"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Hourly Rate ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {payType === 'salary' && (
            <>
              <FormField
                control={form.control as any}
                name="annualSalary"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Annual Salary ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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
                name="standardHoursPerWeek"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Standard Hours Per Week</FormLabel>
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
            </>
          )}

          <FormField
            control={form.control as any}
            name="currency"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Save Pay Rule
          </Button>
        </form>
      </Form>
    </Card>
  );
}
