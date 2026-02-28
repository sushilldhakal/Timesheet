"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { MoreVertical, Trash2, Repeat } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInMinutes } from "date-fns";

import { cn } from "@/lib/utils";
import { useDisclosure } from "@/lib/hooks/use-disclosure";
import { useCalendar } from "@/components/calendar/contexts/calendar-context";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TimeInput } from "@/components/ui/time-input";
import { SingleDayPicker } from "@/components/ui/single-day-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormField, FormLabel, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { RoleSelector } from "@/components/scheduling/RoleSelector";
import { EmployeeSelector } from "@/components/scheduling/EmployeeSelector";
import { Dialog, DialogHeader, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { eventSchema } from "@/components/calendar/schemas";

import type { TimeValue } from "react-aria-components";
import type { TEventFormData } from "@/components/calendar/schemas";

interface IProps {
  children: React.ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  locationId?: string;
  locationName?: string;
}

export function AddEventDialog({ children, startDate, startTime, locationId, locationName }: IProps) {
  const { users, selectedLocationId, selectedLocationName, refetchEvents } = useCalendar();

  // Use provided location or fall back to selected location from context
  const defaultLocationName = locationName || selectedLocationName;

  const { isOpen, onClose, onToggle } = useDisclosure();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [employers, setEmployers] = useState<any[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    location: string[];
    role: string;
  } | null>(null);

  // Fetch user info
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          const userData = data.user || data;
          
          setUserInfo({
            location: userData.location || [],
            role: userData.role || 'user',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    }

    if (isOpen) {
      fetchUserInfo();
    }
  }, [isOpen]);

  // Fetch categories (locations and employers only - roles are fetched by RoleSelector)
  useEffect(() => {
    async function fetchCategories() {
      try {
        const [locationsRes, employersRes] = await Promise.all([
          fetch('/api/categories?type=location'),
          fetch('/api/categories?type=employer'),
        ]);
        
        if (locationsRes.ok) {
          const data = await locationsRes.json();
          let locationList = data.categories || [];
          
          // Filter locations based on user role and assigned locations
          if (userInfo) {
            const isAdmin = userInfo.role === 'admin' || 
                           userInfo.role === 'payable' || 
                           userInfo.role === 'accounts';
            
            // If not admin and has assigned locations, filter to only show those
            if (!isAdmin && userInfo.location.length > 0) {
              locationList = locationList.filter((loc: any) => 
                userInfo.location.includes(loc.name)
              );
            }
          }
          
          setLocations(locationList);
        }
        if (employersRes.ok) {
          const data = await employersRes.json();
          setEmployers(data.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    }

    if (isOpen && userInfo) {
      fetchCategories();
    }
  }, [isOpen, userInfo]);

  const form = useForm<TEventFormData>({
    resolver: zodResolver(eventSchema) as any,
    mode: 'onChange',
    defaultValues: {
      users: [],
      locationId: locationId || selectedLocationId || "",
      roleId: "",
      employerId: "",
      roleIds: [],
      locationIds: [],
      employerIds: [],
      title: "",
      notes: "",
      startDate: startDate || new Date(),
      startTime: startTime || { hour: 9, minute: 0 },
      endDate: startDate || new Date(),
      endTime: { hour: 17, minute: 0 },
      breakMinutes: 30,
      color: "blue",
    },
  });

  // Watch form values for calculations
  const watchedValues = form.watch();
  const selectedLocationViaId = form.watch("locationId");
  const selectedRoleId = form.watch("roleId");
  const selectedDate = form.watch("startDate");
  
  // Calculate total hours and cost
  const { totalHours, totalMinutes, totalCost } = useMemo(() => {
    const { startDate: sd, startTime: st, endDate: ed, endTime: et, breakMinutes } = watchedValues;
    
    if (!sd || !st || !ed || !et) {
      return { totalHours: 0, totalMinutes: 0, totalCost: 0 };
    }
    
    const start = new Date(sd);
    start.setHours(st.hour, st.minute, 0, 0);
    
    const end = new Date(ed);
    end.setHours(et.hour, et.minute, 0, 0);
    
    const totalMins = differenceInMinutes(end, start) - (breakMinutes || 0);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    
    // TODO: Get actual rate from employee/award
    const hourlyRate = 0; // Placeholder
    const cost = (totalMins / 60) * hourlyRate;
    
    return {
      totalHours: hours,
      totalMinutes: mins,
      totalCost: cost,
    };
  }, [watchedValues]);

  const onSubmit = async (values: TEventFormData) => {
    try {
      setValidationError(null);

      // Validation - ensure required fields are present
      if (!values.locationId) {
        setValidationError('Please select a location');
        return;
      }

      if (!values.roleId) {
        setValidationError('Please select a role');
        return;
      }

      if (!values.users || values.users.length === 0) {
        setValidationError('Please select at least one staff member');
        return;
      }

      // Get employer ID (use first employer if available)
      const employerId = values.employerId || (employers.length > 0 ? employers[0]._id : null);

      if (!employerId) {
        setValidationError('No employer found. Please configure an employer first.');
        return;
      }

      // Create shifts for each selected user
      const shiftPromises = values.users.map(async (userId) => {
        const payload = {
          employeeId: userId,
          roleId: values.roleId,
          locationId: values.locationId,
          employerId: employerId,
          startDate: values.startDate.toISOString(),
          startTime: values.startTime,
          endDate: values.endDate.toISOString(),
          endTime: values.endTime,
          breakMinutes: values.breakMinutes || 0,
          notes: values.notes || "",
        };

        console.log('Submitting shift payload:', payload);

        const response = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response (raw):', errorText);
          
          let error;
          try {
            error = JSON.parse(errorText);
          } catch {
            error = { error: errorText || 'Failed to create shift' };
          }
          
          console.error('API error response (parsed):', error);
          throw new Error(error.error || 'Failed to create shift');
        }

        return response.json();
      });

      // Wait for all shifts to be created
      const results = await Promise.all(shiftPromises);
      console.log('Shifts created:', results);
      
      await refetchEvents();

      // Close dialog and reset form
      onClose();
      form.reset();
    } catch (error) {
      console.error('Failed to create shifts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setValidationError(`Failed to create shifts: ${errorMessage}`);
    }
  };

  const handleRepeatTomorrow = () => {
    console.log('Repeat for tomorrow');
    // TODO: Implement repeat logic
  };

  const handleRepeatWeek = () => {
    console.log('Repeat for rest of week');
    // TODO: Implement repeat logic
  };

  const handleDelete = () => {
    console.log('Delete shift');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      form.reset({
        users: [],
        locationId: locationId || selectedLocationId || "",
        roleId: "",
        employerId: "",
        roleIds: [],
        locationIds: [],
        employerIds: [],
        title: "",
        notes: "",
        startDate: startDate || new Date(),
        startTime: startTime || { hour: 9, minute: 0 },
        endDate: startDate || new Date(),
        endTime: { hour: 17, minute: 0 },
        breakMinutes: 30,
        color: "blue",
      });
      setValidationError(null);
    }
  }, [isOpen, startDate, startTime, locationId, selectedLocationId, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onToggle}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Add New Shift</DialogTitle>
              <DialogDescription className="mt-1">
                {(locationName || defaultLocationName) && (
                  <span className="text-muted-foreground">{locationName || defaultLocationName}</span>
                )}
              </DialogDescription>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleRepeatTomorrow}>
                  <Repeat className="mr-2 h-4 w-4" />
                  Repeat for tomorrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRepeatWeek}>
                  <Repeat className="mr-2 h-4 w-4" />
                  Repeat for rest of the week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete shift
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form id="shift-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* Validation Error Display */}
            {validationError && (
              <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{validationError}</p>
              </div>
            )}

            {/* Location - Single select (required) */}
            <FormField
              control={form.control}
              name="locationId"
              render={({ field, fieldState }: any) => (
                <FormItem>
                  <FormLabel>Location *</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={locations.map(location => ({
                        label: location.name,
                        value: location._id,
                      }))}
                      value={field.value ? [field.value] : []}
                      onValueChange={(values) => {
                        field.onChange(values[0] || "");
                        // Reset role and employees when location changes
                        form.setValue("roleId", "");
                        form.setValue("users", []);
                      }}
                      placeholder="Select location"
                      maxCount={1}
                      className={cn(fieldState.invalid && "border-destructive")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role - Single select filtered by location (required) */}
            <FormField
              control={form.control}
              name="roleId"
              render={({ field, fieldState }: any) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <FormControl>
                    <RoleSelector
                      locationId={selectedLocationViaId}
                      selectedDate={selectedDate}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Reset employees when role changes
                        form.setValue("users", []);
                      }}
                      placeholder="Select role"
                      className={cn(fieldState.invalid && "border-destructive")}
                    />
                  </FormControl>
                  <FormMessage />
                  {!selectedLocationId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Please select a location first
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Staff - Multi-select filtered by role assignment at location */}
            <FormField
              control={form.control}
              name="users"
              render={({ field, fieldState }: any) => (
                <FormItem>
                  <FormLabel>Staff *</FormLabel>
                  <FormControl>
                    <EmployeeSelector
                      roleId={selectedRoleId}
                      locationId={selectedLocationViaId}
                      selectedDate={selectedDate}
                      value={field.value[0] || ""}
                      onChange={(value) => {
                        // For multi-select, we need to handle adding/removing
                        const currentValues = field.value || [];
                        if (currentValues.includes(value)) {
                          field.onChange(currentValues.filter((v: string) => v !== value));
                        } else {
                          field.onChange([...currentValues, value]);
                        }
                      }}
                      placeholder="Select staff members"
                      className={cn(fieldState.invalid && "border-destructive")}
                    />
                  </FormControl>
                  <FormMessage />
                  {(!selectedLocationId || !selectedRoleId) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Please select a location and role first
                    </p>
                  )}
                  {field.value && field.value.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value.length} staff member(s) selected
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field, fieldState }: any) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <SingleDayPicker
                      value={field.value}
                      onSelect={date => {
                        field.onChange(date as Date);
                        form.setValue('endDate', date as Date);
                      }}
                      placeholder="Select date"
                      data-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field, fieldState }: any) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <TimeInput 
                        value={field.value as TimeValue} 
                        onChange={field.onChange} 
                        hourCycle={12} 
                        data-invalid={fieldState.invalid} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field, fieldState }: any) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <TimeInput 
                        value={field.value as TimeValue} 
                        onChange={field.onChange} 
                        hourCycle={12} 
                        data-invalid={fieldState.invalid} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Break */}
            <FormField
              control={form.control}
              name="breakMinutes"
              render={({ field, fieldState }: any) => (
                <FormItem>
                  <FormLabel>Break (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="15"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      data-invalid={fieldState.invalid}
                      placeholder="30"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    {field.value} mins of Meal Break (unpaid)
                  </p>
                </FormItem>
              )}
            />

            {/* Total Display */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold">
                  {totalHours}h {totalMinutes}m · ${totalCost.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field, fieldState }: any) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""} 
                      data-invalid={fieldState.invalid}
                      placeholder="Add any notes about this shift..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button 
            form="shift-form" 
            type="submit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
