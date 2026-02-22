"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

interface AwardItem {
  _id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  levels: any[];
}

interface Props {
  awards: AwardItem[];
  selectedAwardId: string | null;
  onSelectAward: (awardId: string) => void;
}

export default function AwardsList({ awards, selectedAwardId, onSelectAward }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {awards.map((award) => (
        <Card
          key={award._id}
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedAwardId === award._id
              ? "ring-2 ring-primary bg-primary/5"
              : "hover:bg-muted/50"
          }`}
          onClick={() => onSelectAward(award._id)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">{award.name}</h3>
              </div>
              {award.isActive && (
                <Badge variant="default" className="text-xs">
                  Active
                </Badge>
              )}
            </div>
            {award.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {award.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{award.levels.length} level{award.levels.length !== 1 ? "s" : ""}</span>
              <span>
                {award.levels.reduce((sum, level) => sum + level.conditions.length, 0)} condition
                {award.levels.reduce((sum, level) => sum + level.conditions.length, 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
