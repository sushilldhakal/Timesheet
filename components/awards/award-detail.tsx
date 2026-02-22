"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Edit, Trash2, Plus, Pencil, ChevronDown, ChevronRight, Copy } from "lucide-react";
import LevelDetailView from "./level-detail-view";
import AddLevelDialog from "./add-level-dialog";
import { Input } from "@/components/ui/input";

interface Props {
  award: any;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (award: any) => void;
  levelRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  openAccordions: Set<string>;
  setOpenAccordions: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export default function AwardDetail({ award, onEdit, onDelete, onUpdate, levelRefs, openAccordions, setOpenAccordions }: Props) {
  const [isAddLevelOpen, setIsAddLevelOpen] = useState(false);
  const [editingLevelIndex, setEditingLevelIndex] = useState<number | null>(null);
  const [editingLevelName, setEditingLevelName] = useState("");

  if (!award) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p>Select an award to view details</p>
        </CardContent>
      </Card>
    );
  }

  const handleAddLevel = (level: { label: string }) => {
    const updatedAward = {
      ...award,
      levels: [
        ...award.levels,
        {
          label: level.label,
          conditions: [],
        },
      ],
    };
    onUpdate(updatedAward);
    setIsAddLevelOpen(false);
  };

  const handleDeleteLevel = (levelIndex: number) => {
    if (!confirm("Are you sure you want to delete this level?")) return;
    const updatedAward = {
      ...award,
      levels: award.levels.filter((_: any, i: number) => i !== levelIndex),
    };
    onUpdate(updatedAward);
  };

  const handleDuplicateLevel = (levelIndex: number) => {
    const levelToDuplicate = award.levels[levelIndex];
    const duplicatedLevel = {
      ...JSON.parse(JSON.stringify(levelToDuplicate)), // Deep clone
      label: `${levelToDuplicate.label} (Copy)`,
    };
    
    const updatedAward = {
      ...award,
      levels: [
        ...award.levels.slice(0, levelIndex + 1),
        duplicatedLevel,
        ...award.levels.slice(levelIndex + 1),
      ],
    };
    onUpdate(updatedAward);
  };

  const handleUpdateLevel = (levelIndex: number, updatedLevel: any) => {
    const updatedAward = {
      ...award,
      levels: award.levels.map((l: any, i: number) =>
        i === levelIndex ? updatedLevel : l
      ),
    };
    onUpdate(updatedAward);
  };

  const handleStartEditingLevel = (levelIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLevelIndex(levelIndex);
    setEditingLevelName(award.levels[levelIndex].label);
  };

  const handleSaveLevelName = (levelIndex: number) => {
    if (editingLevelName.trim()) {
      handleUpdateLevel(levelIndex, { ...award.levels[levelIndex], label: editingLevelName });
    }
    setEditingLevelIndex(null);
  };

  const handleAccordionChange = (value: string) => {
    setOpenAccordions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {/* Award Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl mb-1.5">{award.name}</CardTitle>
              {award.description && (
                <CardDescription className="text-base">{award.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Award Levels */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle>Award Levels</CardTitle>
              <CardDescription className="mt-1.5">
                Configure different levels with their employment types and conditions
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddLevelOpen(true)} size="sm" className="flex-shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Level
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {award.levels.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-lg">
              <p className="text-base mb-1.5">No levels configured yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Add a level to start configuring employment types, pay rules, breaks, and more
              </p>
              <Button onClick={() => setIsAddLevelOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Level
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {award.levels.map((level: any, levelIndex: number) => {
                const accordionKey = `${award._id}-level-${levelIndex}`;
                const isOpen = openAccordions.has(accordionKey);

                return (
                  <div
                    key={levelIndex}
                    ref={(el) => {
                      levelRefs.current[accordionKey] = el;
                    }}
                    className="scroll-mt-4"
                  >
                    <Accordion 
                      type="single" 
                      value={isOpen ? accordionKey : ""}
                      onValueChange={handleAccordionChange}
                      className="border rounded-lg"
                    >
                      <AccordionItem value={accordionKey} className="border-none">
                        <div className="flex items-center gap-2 px-4 py-3 border-b">
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleAccordionChange(accordionKey)}>
                            {editingLevelIndex === levelIndex ? (
                              <Input
                                value={editingLevelName}
                                onChange={(e) => setEditingLevelName(e.target.value)}
                                onBlur={() => handleSaveLevelName(levelIndex)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveLevelName(levelIndex);
                                  if (e.key === "Escape") setEditingLevelIndex(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 max-w-xs"
                                autoFocus
                              />
                            ) : (
                              <span className="font-semibold text-base">{level.label}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditingLevel(levelIndex, e);
                              }}
                              title="Edit level name"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateLevel(levelIndex);
                              }}
                              title="Duplicate level"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLevel(levelIndex);
                              }}
                              title="Delete level"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <span
                              onClick={() => handleAccordionChange(accordionKey)}
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
                        <AccordionContent className="px-4 pb-4">
                          <LevelDetailView
                            level={level}
                            onUpdate={(updated) => handleUpdateLevel(levelIndex, updated)}
                            onDelete={() => handleDeleteLevel(levelIndex)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddLevelDialog
        open={isAddLevelOpen}
        onOpenChange={setIsAddLevelOpen}
        onAdd={handleAddLevel}
      />
    </div>
  );
}
