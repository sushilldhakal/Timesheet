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

const levelFormSchema = z.object({
  label: z.string().min(1, "Level label is required"),
});

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Award Level</DialogTitle>
          <DialogDescription>
            Create a new level for this award. You can configure employment types and conditions after adding the level.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Add Level
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
