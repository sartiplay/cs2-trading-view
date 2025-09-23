"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, DollarSign, Globe } from "lucide-react";

interface PriceSourceToggleProps {
  onSourceChange?: (source: "steam" | "csgoskins") => void;
}

export function PriceSourceToggle({ onSourceChange }: PriceSourceToggleProps) {
  const [priceSource, setPriceSource] = useState<"steam" | "csgoskins">("steam");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          setPriceSource(settings.priceSource || "steam");
        }
      } catch (error) {
        console.error("Failed to fetch price source setting:", error);
      }
    };

    fetchSettings();
  }, []);

  const handleSourceChange = async (newSource: "steam" | "csgoskins") => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceSource: newSource,
        }),
      });

      if (response.ok) {
        setPriceSource(newSource);
        onSourceChange?.(newSource);
      } else {
        console.error("Failed to update price source setting");
      }
    } catch (error) {
      console.error("Error updating price source:", error);
    }
  };

  const getSourceIcon = (source: "steam" | "csgoskins") => {
    return source === "steam" ? <DollarSign className="h-4 w-4" /> : <Globe className="h-4 w-4" />;
  };

  const getSourceLabel = (source: "steam" | "csgoskins") => {
    return source === "steam" ? "Steam Market" : "CSGOSKINS.GG";
  };

  const getSourceBadge = (source: "steam" | "csgoskins") => {
    return source === "steam" ? (
      <Badge variant="secondary" className="text-xs">
        Tracked
      </Badge>
    ) : (
      <Badge variant="outline" className="text-xs">
        Real-time
      </Badge>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {getSourceIcon(priceSource)}
          <span className="ml-2 hidden sm:inline">{getSourceLabel(priceSource)}</span>
          <span className="ml-1 sm:ml-2">{getSourceBadge(priceSource)}</span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-[200px]">
        <DropdownMenuItem
          onClick={() => handleSourceChange("steam")}
          className="flex items-center justify-between"
        >
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2" />
            Steam Market
          </div>
          <Badge variant="secondary" className="text-xs">
            Tracked
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSourceChange("csgoskins")}
          className="flex items-center justify-between"
        >
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2" />
            CSGOSKINS.GG
          </div>
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
