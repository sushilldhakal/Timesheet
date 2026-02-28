"use client";

import { useMemo } from "react";
import { useCalendar } from "@/components/calendar/contexts/calendar-context";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { MultiSelectGroup } from "@/components/ui/MultiSelect";

export function UserSelect() {
  const { users, selectedUserIds, setSelectedUserIds, selectedLocationName } = useCalendar();

  // Filter users by location if selected
  const filteredUsers = useMemo(() => {
    if (!selectedLocationName || selectedLocationName === 'all') {
      return users;
    }
    return users.filter(user => 
      user.location && user.location.includes(selectedLocationName)
    );
  }, [users, selectedLocationName]);

  // Group users by their primary role and create grouped options
  const groupedUserOptions: MultiSelectGroup[] = useMemo(() => {
    // Create a map to group users by role
    const roleGroups = new Map<string, typeof filteredUsers>();
    
    filteredUsers.forEach(user => {
      // Get the first role or use "Other" as default
      const primaryRole = user.role && user.role.length > 0 ? user.role[0] : "Other";
      
      if (!roleGroups.has(primaryRole)) {
        roleGroups.set(primaryRole, []);
      }
      roleGroups.get(primaryRole)!.push(user);
    });

    // Convert to MultiSelectGroup format and sort alphabetically
    return Array.from(roleGroups.entries())
      .sort(([roleA], [roleB]) => roleA.localeCompare(roleB))
      .map(([role, roleUsers]) => ({
        heading: role,
        options: roleUsers
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(user => {
            // Create a component for the icon with avatar
            const UserIcon = ({ className }: { className?: string }) => (
              <Avatar className={className || "size-5"}>
                <AvatarImage 
                  src={user.picturePath || undefined} 
                  alt={user.name} 
                />
                <AvatarFallback className="text-xxs">{user.name[0]}</AvatarFallback>
              </Avatar>
            );

            return {
              value: user.id,
              label: user.name,
              icon: UserIcon,
            };
          }),
      }));
  }, [filteredUsers]);

  const handleValueChange = (values: string[]) => {
    setSelectedUserIds(values);
  };

  return (
    <MultiSelect
      options={groupedUserOptions}
      value={selectedUserIds}
      onValueChange={handleValueChange}
      placeholder="Select staff"
      emptyIndicator={<div className="text-center text-sm text-muted-foreground py-2">No staff found</div>}
      className="w-full md:w-64"
      maxCount={5}
      searchable={true}
      autoSize={true}
      avatarView={true}
    />
  );
}
