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
import { levelFormSchema } from "@/lib/validations/awards";

interface AddLevelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (level: { label: string }) => void;
}

export default function AddLevelDialog({
  open,
  onOpenChange,
  onAdd,
}: AddLevelDialogProps) {
  const form = useForm<z.infer<typeof levelFormSchema>>({
    resolver: zodResolver(levelFormSchema),
    defaultValues: {
      label: "",
    },
  });

  const onSubmit = (values: z.infer<typeof levelFormSchema>) => {
    onAdd({ label: values.label });
    form.reset();
    onOpenChange(false);
  };

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Add Award Level"
      description="Create a new level for this award. You can configure employment types and conditions after adding the level."
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Add Level"
    >
      <Form {...form}>
        <FormField
          control={form.control as any}
          name="label"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Level Label</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Level 3 - Senior Driver"
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
