"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const awardFormSchema = z.object({
  name: z.string().min(1, "Award name is required"),
  description: z.string().optional(),
});

interface AddAwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (award: { name: string; description: string | null }) => void;
}

export default function AddAwardDialog({
  open,
  onOpenChange,
  onAdd,
}: AddAwardDialogProps) {
  const form = useForm<z.infer<typeof awardFormSchema>>({
    resolver: zodResolver(awardFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (values: z.infer<typeof awardFormSchema>) => {
    onAdd({
      name: values.name,
      description: values.description || null,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Award</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField<z.infer<typeof awardFormSchema>>
              control={form.control as any}
              name="name"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Award Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Transport Industry Award"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<z.infer<typeof awardFormSchema>>
              control={form.control as any}
              name="description"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the award"
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
                Create Award
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
