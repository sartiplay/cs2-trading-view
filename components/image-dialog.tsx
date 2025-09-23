"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  itemName: string;
}

export function ImageDialog({ open, onOpenChange, imageUrl, itemName }: ImageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{itemName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-4 bg-muted/30 rounded-lg">
          <div className="relative max-w-full max-h-[70vh]">
            <img
              src={imageUrl}
              alt={itemName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              onError={(e) => {
                // Hide image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
                // Show error message
                const errorDiv = document.createElement('div');
                errorDiv.className = 'flex items-center justify-center p-8 text-muted-foreground';
                errorDiv.textContent = 'Failed to load image';
                (e.target as HTMLImageElement).parentNode?.appendChild(errorDiv);
              }}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
