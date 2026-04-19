"use client";

import { useState } from "react";
import { 
  TablePageToolbar, 
  EntityTableActions, 
  TableEmptyState,
  FormDialogShell,
  ConfirmDialogShell,
  InfoCard,
  InfoGrid,
  KeyValueList,
  StatusSummaryCard
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, MapPin } from "lucide-react";

// Example of how the new shared components work together
export function RefactoredTableExample() {
  const [searchValue, setSearchValue] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Mock data
  const items = [
    { id: "1", name: "Main Office", status: "active", teams: 5, location: "Sydney" },
    { id: "2", name: "Warehouse", status: "inactive", teams: 2, location: "Melbourne" },
  ];

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Toolbar - replaces repeated header/search/action patterns */}
      <TablePageToolbar
        title="Locations"
        description="Manage your organization's locations and geofencing settings"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search locations..."
        onAdd={() => setShowAddDialog(true)}
        addLabel="Add Location"
        onRefresh={() => console.log("Refreshing...")}
        onExport={() => console.log("Exporting...")}
      />

      {/* Info Cards Grid - replaces repeated card layouts */}
      <InfoGrid columns={3}>
        <StatusSummaryCard
          title="Active Locations"
          status="success"
          statusLabel="2 Active"
          description="Currently operational locations"
        >
          <KeyValueList
            items={[
              { key: "Total Teams", value: "7" },
              { key: "Avg Teams/Location", value: "3.5" },
            ]}
          />
        </StatusSummaryCard>

        <InfoCard
          title="Coverage"
          icon={<MapPin className="h-5 w-5" />}
          actions={<Button variant="outline" size="sm">View Map</Button>}
        >
          <KeyValueList
            items={[
              { key: "Cities", value: "2" },
              { key: "States", value: "2" },
            ]}
          />
        </InfoCard>

        <InfoCard
          title="Team Distribution"
          icon={<Users className="h-5 w-5" />}
        >
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <span className="text-sm">{item.name}</span>
                <Badge variant="secondary">{item.teams} teams</Badge>
              </div>
            ))}
          </div>
        </InfoCard>
      </InfoGrid>

      {/* Table with shared empty state */}
      {filteredItems.length === 0 ? (
        <TableEmptyState
          title={searchValue ? "No locations found" : "No locations yet"}
          description={
            searchValue 
              ? `No locations match "${searchValue}". Try adjusting your search.`
              : "Get started by adding your first location."
          }
          type={searchValue ? "no-results" : "no-data"}
          action={{
            label: "Add Location",
            onClick: () => setShowAddDialog(true),
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Teams</th>
                <th className="text-left p-4">Location</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">
                    <Badge variant={item.status === "active" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="p-4">{item.teams}</td>
                  <td className="p-4">{item.location}</td>
                  <td className="p-4">
                    {/* Shared table actions - replaces repeated dropdown menus */}
                    <EntityTableActions
                      onEdit={() => console.log("Edit", item.name)}
                      onDelete={() => {
                        setSelectedItem(item);
                        setShowDeleteDialog(true);
                      }}
                      actions={[
                        {
                          label: "View Teams",
                          onClick: () => console.log("View teams for", item.name),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Shared Form Dialog - replaces repeated dialog boilerplate */}
      <FormDialogShell
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        title="Add Location"
        description="Create a new location for your organization."
        onSubmit={(e) => {
          e.preventDefault();
          console.log("Adding location...");
          setShowAddDialog(false);
        }}
        submitLabel="Add Location"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Location Name</label>
            <Input placeholder="e.g., Main Office" />
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input placeholder="Enter address or paste Google Maps link" />
          </div>
        </div>
      </FormDialogShell>

      {/* Shared Confirm Dialog - replaces repeated delete dialogs */}
      <ConfirmDialogShell
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Location"
        description={
          selectedItem ? (
            <>
              Are you sure you want to delete <strong>{selectedItem.name}</strong>?
              This may affect employees assigned to this location.
            </>
          ) : (
            "Are you sure you want to delete this location?"
          )
        }
        onConfirm={async () => {
          console.log("Deleting", selectedItem?.name);
          setShowDeleteDialog(false);
          setSelectedItem(null);
        }}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}