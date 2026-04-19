"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormDialogShell } from "@/components/shared/forms";
import { employmentTypeFormSchema } from "@/lib/validations/awards";

interface AddEmploymentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (employmentType: string) => void;
}

export default function AddEmploymentTypeDialog({
  open,
  onOpenChange,
  onAdd,
}: AddEmploymentTypeDialogProps) {
  const form = useForm<z.infer<typeof employmentTypeFormSchema>>({
    resolver: zodResolver(employmentTypeFormSchema),
    defaultValues: {
      employmentType: "",
    },
  });

  const onSubmit = (values: z.infer<typeof employmentTypeFormSchema>) => {
    onAdd(values.employmentType);
    form.reset();
    onOpenChange(false);
  };

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Employment Type"
      description="Add a new employment type to this level. You can configure pay rules, breaks, penalties, and leave entitlements after adding."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Add Employment Type"
    >
      <Form {...form}>
        <FormField
          control={form.control as any}
          name="employmentType"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Employment Type</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., full_time, part_time, casual"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </FormDialogShell>
  );
}
