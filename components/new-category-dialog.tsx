"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface CategoryConfig {
  id: string;
  name: string;
  color?: string;
  includeInInventoryValue: boolean;
  includeInProfitLoss: boolean;
  created_at: string;
  updated_at: string;
}

interface NewCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated: (category: CategoryConfig) => void;
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#8B5CF6", // Purple
  "#F59E0B", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange-500
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#A855F7", // Violet
];

export function NewCategoryDialog({
  open,
  onOpenChange,
  onCategoryCreated,
}: NewCategoryDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [includeInInventoryValue, setIncludeInInventoryValue] = useState(true);
  const [includeInProfitLoss, setIncludeInProfitLoss] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: selectedColor,
          includeInInventoryValue,
          includeInProfitLoss,
        }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        onCategoryCreated(newCategory);
        resetForm();
        onOpenChange(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create category");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setSelectedColor(PRESET_COLORS[0]);
    setIncludeInInventoryValue(true);
    setIncludeInProfitLoss(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Category</DialogTitle>
          <DialogDescription>
            Create a new category to organize your items. You can customize its appearance and behavior.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name *</Label>
            <Input
              id="category-name"
              placeholder="e.g., Investment Items"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? "border-foreground scale-110"
                      : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-inventory"
                checked={includeInInventoryValue}
                onCheckedChange={(checked) =>
                  setIncludeInInventoryValue(checked === true)
                }
              />
              <Label htmlFor="include-inventory" className="text-sm">
                Include in Inventory Value
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Items in this category will be included in total inventory value calculations
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-profit-loss"
                checked={includeInProfitLoss}
                onCheckedChange={(checked) =>
                  setIncludeInProfitLoss(checked === true)
                }
              />
              <Label htmlFor="include-profit-loss" className="text-sm">
                Include in Profit/Loss
              </Label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              Items in this category will be included in profit/loss calculations
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
