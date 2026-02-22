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
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = award ? `/api/awards/${award._id}` : "/api/awards";
      const method = award ? "PUT" : "POST";

      const payload = award
        ? { ...award, name: formData.name, description: formData.description || null }
        : {
            name: formData.name,
            description: formData.description || null,
            isActive: true,
            levels: [],
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save award");
      }

      toast.success(award ? "Award updated" : "Award created successfully");
      onClose();
    } catch (error: any) {
      console.error("Error saving award:", error);
      toast.error(error.message || "Failed to save award");
    } finally {
      setLoading(false);
    }
  };

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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : award ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
