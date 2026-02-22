"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const employmentTypeFormSchema = z.object({
  employmentType: z.string().min(1, "Employment type is required"),
});

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employment Type</DialogTitle>
          <DialogDescription>
            Add a new employment type to this level. You can configure pay rules, breaks, penalties, and leave entitlements after adding.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add Employment Type
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
