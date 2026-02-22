"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, Plus, ChevronDown, ChevronRight, Pencil, Copy } from "lucide-react";
import AddEmploymentTypeDialog from "./add-employment-type-dialog";
import EmploymentTypeDetailView from "./employment-type-detail-view";
import { Input } from "@/components/ui/input";

interface Props {
  level: any;
  onUpdate: (level: any) => void;
  onDelete: () => void;
}

export default function LevelDetailView({ level, onUpdate, onDelete }: Props) {
  const [isAddEmploymentTypeOpen, setIsAddEmploymentTypeOpen] = useState(false);
  const [openEmploymentTypes, setOpenEmploymentTypes] = useState<Set<number>>(new Set());
  const [editingEmploymentTypeIndex, setEditingEmploymentTypeIndex] = useState<number | null>(null);
  const [editingEmploymentTypeName, setEditingEmploymentTypeName] = useState("");

  const handleAddEmploymentType = (employmentType: string) => {
    const newCondition = {
      employmentType,
      breakPolicy: "auto",
      breakRules: [],
      payRule: null,
      penaltyRules: [],
      leaveEntitlements: [],
      toilRule: null,
    };

    const updatedLevel = {
      ...level,
      conditions: [...level.conditions, newCondition],
    };
    onUpdate(updatedLevel);
  };

  const handleDeleteEmploymentType = (condIndex: number) => {
    const updatedLevel = {
      ...level,
      conditions: level.conditions.filter((_: any, i: number) => i !== condIndex),
    };
    onUpdate(updatedLevel);
  };

  const handleDuplicateEmploymentType = (condIndex: number) => {
    const conditionToDuplicate = level.conditions[condIndex];
    const duplicatedCondition = {
      ...JSON.parse(JSON.stringify(conditionToDuplicate)), // Deep clone
      employmentType: `${conditionToDuplicate.employmentType} (Copy)`,
    };
    
    const updatedLevel = {
      ...level,
      conditions: [
        ...level.conditions.slice(0, condIndex + 1),
        duplicatedCondition,
        ...level.conditions.slice(condIndex + 1),
      ],
    };
    onUpdate(updatedLevel);
  };

  const handleUpdateEmploymentType = (condIndex: number, updatedCondition: any) => {
    const updatedLevel = {
      ...level,
      conditions: level.conditions.map((c: any, i: number) =>
        i === condIndex ? updatedCondition : c
      ),
    };
    onUpdate(updatedLevel);
  };

  const handleStartEditingEmploymentType = (condIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEmploymentTypeIndex(condIndex);
    setEditingEmploymentTypeName(level.conditions[condIndex].employmentType);
  };

  const handleSaveEmploymentTypeName = (condIndex: number) => {
    if (editingEmploymentTypeName.trim()) {
      handleUpdateEmploymentType(condIndex, { 
        ...level.conditions[condIndex], 
        employmentType: editingEmploymentTypeName 
      });
    }
    setEditingEmploymentTypeIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 mt-4">
        <h3 className="text-base font-semibold">Employment Types</h3>
        <Button
          onClick={() => setIsAddEmploymentTypeOpen(true)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Type
        </Button>
      </div>

      {level.conditions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">No employment types yet. Add one to define conditions.</p>
            <Button onClick={() => setIsAddEmploymentTypeOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Employment Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {level.conditions.map((condition: any, condIndex: number) => {
            const accordionValue = `condition-${condIndex}`;
            const isOpen = openEmploymentTypes.has(condIndex);
            
            const toggleOpen = () => {
              setOpenEmploymentTypes((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(condIndex)) {
                  newSet.delete(condIndex);
                } else {
                  newSet.add(condIndex);
                }
                return newSet;
              });
            };
            
            return (
              <Accordion key={condIndex} type="single" className="border rounded-lg" value={isOpen ? accordionValue : ""} onValueChange={() => toggleOpen()}>
                <AccordionItem value={accordionValue} className="border-none">
                  <div className="flex items-center gap-2 px-4 py-3 border-b">
                    <div className="flex-1 cursor-pointer" onClick={toggleOpen}>
                      {editingEmploymentTypeIndex === condIndex ? (
                        <Input
                          value={editingEmploymentTypeName}
                          onChange={(e) => setEditingEmploymentTypeName(e.target.value)}
                          onBlur={() => handleSaveEmploymentTypeName(condIndex)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEmploymentTypeName(condIndex);
                            if (e.key === "Escape") setEditingEmploymentTypeIndex(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 max-w-xs"
                          autoFocus
                        />
                      ) : (
                        <p className="font-medium">{condition.employmentType}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditingEmploymentType(condIndex, e);
                        }}
                        title="Edit employment type name"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateEmploymentType(condIndex);
                        }}
                        title="Duplicate employment type"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEmploymentType(condIndex);
                        }}
                        title="Delete employment type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <span
                        onClick={toggleOpen}
                        className="p-1 hover:bg-accent rounded cursor-pointer"
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    </div>
                  </div>
                  <AccordionContent className="px-0 pb-0">
                    <EmploymentTypeDetailView
                      condition={condition}
                      onUpdate={(updated) => handleUpdateEmploymentType(condIndex, updated)}
                      onDelete={() => handleDeleteEmploymentType(condIndex)}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })}
        </div>
      )}

      <AddEmploymentTypeDialog
        open={isAddEmploymentTypeOpen}
        onOpenChange={setIsAddEmploymentTypeOpen}
        onAdd={handleAddEmploymentType}
      />
    </div>
  );
}
