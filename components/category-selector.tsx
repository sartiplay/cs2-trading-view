"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings } from "lucide-react";
import { NewCategoryDialog } from "./new-category-dialog";
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

interface CategorySelectorProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  showCreateButton?: boolean;
  showSettingsButton?: boolean;
}

export function CategorySelector({
  value,
  onValueChange,
  placeholder = "Select a category",
  disabled = false,
  showCreateButton = true,
  showSettingsButton = false,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryCreated = (newCategory: CategoryConfig) => {
    setCategories((prev) => [...prev, newCategory]);
    onValueChange(newCategory.id);
    setNewCategoryOpen(false);
    toast({
      title: "Success",
      description: `Category "${newCategory.name}" created successfully`,
    });
  };

  const selectedCategory = categories.find((cat) => cat.id === value);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Select disabled>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Loading categories..." />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value || "none"}
        onValueChange={(newValue) => onValueChange(newValue === "none" ? undefined : newValue)}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted" />
              <span className="text-muted-foreground">No category</span>
            </div>
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center gap-2 w-full">
                {category.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                <span className="flex-1">{category.name}</span>
                {!category.includeInInventoryValue && (
                  <Badge variant="secondary" className="text-xs ml-auto">
                    Excluded
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCreateButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setNewCategoryOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      {showSettingsButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            // TODO: Open category management dialog
            toast({
              title: "Coming Soon",
              description: "Category management interface will be added in the next update",
            });
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}

      <NewCategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}
