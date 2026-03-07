"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateAward, useUpdateAward } from "@/lib/queries/awards";
import { CreateAwardRequest } from "@/lib/api/awards";

interface Props {
  open: boolean;
  onClose: () => void;
  award: any | null;
}

export default function AwardFormDialog({ open, onClose, award }: Props) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // TanStack Query hooks
  const createAwardMutation = useCreateAward();
  const updateAwardMutation = useUpdateAward();

  useEffect(() => {
    if (award) {
      setFormData({
        name: award.name || "",
        description: award.description || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [award, open]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (award) {
      // Update existing award
      const payload = { ...award, name: formData.name, description: formData.description || null };
      updateAwardMutation.mutate(
        { id: award._id, data: payload },
        {
          onSuccess: () => {
            toast.success("Award updated");
            onClose();
          },
          onError: (error: any) => {
            console.error("Error updating award:", error);
            toast.error(error.message || "Failed to update award");
          },
        }
      );
    } else {
      // Create new award
      const payload: CreateAwardRequest = {
        name: formData.name,
        description: formData.description || undefined,
        isActive: true,
        levels: [],
      };
      createAwardMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Award created successfully");
          onClose();
        },
        onError: (error: any) => {
          console.error("Error creating award:", error);
          toast.error(error.message || "Failed to create award");
        },
      });
    }
  };

  const isLoading = createAwardMutation.isPending || updateAwardMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{award ? "Edit Award" : "Create Award"}</DialogTitle>
          <DialogDescription>
            {award 
              ? "Update the award name and description. Configure levels and conditions after saving."
              : "Create a new award. You can add levels and configure conditions after creation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Award Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              placeholder="e.g., Transport Industry Award"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : award ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
