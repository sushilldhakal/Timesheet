"use client";

import { useState } from "react";
import { Copy, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCalendar } from "@/components/calendar/contexts/calendar-context";
import { format, subWeeks } from "date-fns";
import { toast } from "sonner";

export function RosterActions() {
  const { selectedDate, selectedLocationId, selectedLocationIds } = useCalendar();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Full-time", "Part-time"]);
  const [error, setError] = useState<string | null>(null);

  // Calculate week ID from current date (ISO week format: YYYY-Www)
  const getWeekId = (date: Date): string => {
    const year = date.getFullYear();
    const week = format(date, "II"); // ISO week number
    return `${year}-W${week.padStart(2, "0")}`;
  };

  const currentWeekId = getWeekId(selectedDate);
  const previousWeekId = getWeekId(subWeeks(selectedDate, 1));

  const handleCopyLastWeek = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/rosters/${currentWeekId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "copy",
          copyFromWeekId: previousWeekId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to copy roster");
      }

      const data = await response.json();
      
      // TODO: Refresh calendar events
      console.log(`Successfully copied ${data.shiftsCreated} shifts`);
      
      // Show success message
      toast.success(`Successfully copied ${data.shiftsCreated} shifts from last week`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to copy roster";
      setError(message);
      console.error("Copy roster error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromSchedules = async () => {
    if (selectedTypes.length === 0) {
      setError("Please select at least one employment type");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const requestBody: any = {
        mode: "schedules",
        includeEmploymentTypes: selectedTypes,
      };

      // Add location filter if locations are selected
      if (selectedLocationIds && selectedLocationIds.length > 0) {
        requestBody.locationIds = selectedLocationIds;
      }

      const response = await fetch(`/api/rosters/${currentWeekId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to generate roster");
      }

      const data = await response.json();
      
      // TODO: Refresh calendar events
      console.log(`Successfully generated ${data.shiftsCreated} shifts`);
      
      // Show success message and close dialog
      toast.success(`Successfully generated ${data.shiftsCreated} shifts from schedules`);
      setShowScheduleDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate roster";
      setError(message);
      console.error("Generate roster error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleEmploymentType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Roster
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Roster Generation</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyLastWeek} disabled={isGenerating}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Last Week
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowScheduleDialog(true)} disabled={isGenerating}>
            <Sparkles className="h-4 w-4 mr-2" />
            Fill from Schedules
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Generate from Schedules Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generate from Employee Schedules</DialogTitle>
            <DialogDescription>
              Select which employment types to include when generating shifts from recurring schedules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="full_time"
                  checked={selectedTypes.includes("Full-time")}
                  onCheckedChange={() => toggleEmploymentType("Full-time")}
                />
                <Label htmlFor="full_time" className="cursor-pointer">
                  Full-time employees
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="part_time"
                  checked={selectedTypes.includes("Part-time")}
                  onCheckedChange={() => toggleEmploymentType("Part-time")}
                />
                <Label htmlFor="part_time" className="cursor-pointer">
                  Part-time employees
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="casual"
                  checked={selectedTypes.includes("Casual")}
                  onCheckedChange={() => toggleEmploymentType("Casual")}
                />
                <Label htmlFor="casual" className="cursor-pointer">
                  Casual employees
                </Label>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="font-medium mb-1">⚠️ Important:</p>
              <p>
                This feature requires employees to have recurring schedules set up. If no shifts are generated, employees may not have schedules defined yet.
              </p>
            </div>

            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-1">Tip:</p>
              <p>
                Generate permanent staff first (full-time/part-time), then add casual employees to fill gaps.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGenerateFromSchedules} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Shifts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
