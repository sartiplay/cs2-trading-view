"use client";

import { Loader2 } from "lucide-react";

interface ImageLoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ImageLoadingSpinner({ size = "md", className = "" }: ImageLoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  return (
    <div className={`flex items-center justify-center ${sizeClasses[size]} border rounded bg-muted ${className}`}>
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );
}
