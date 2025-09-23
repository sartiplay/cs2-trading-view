"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  TrendingUp,
  Clock,
  Database,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/currency-context";
import { getClientCurrencySymbol } from "@/lib/currency-utils";

interface CaptureStats {
  last_capture: string | null;
  total_captures: number;
  total_items: number;
}

interface InventoryData {
  total_purchase_value: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percentage: number;
}

interface CaptureStatsProps {
  priceSource?: "steam" | "csgoskins";
}

export function CaptureStats({ priceSource = "steam" }: CaptureStatsProps) {
  const [stats, setStats] = useState<CaptureStats | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(
    null
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();
  const { displayCurrency } = useCurrency();

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const response = await fetch(`/api/inventory-value?price_source=${priceSource}&display_currency=${displayCurrency}`);
      if (response.ok) {
        const data = await response.json();
        setInventoryData(data);
      }
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
    }
  };

  const captureAllPrices = async () => {
    setIsCapturing(true);
    try {
      const response = await fetch("/api/jobs/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
        });
        await fetchStats();
        await fetchInventoryData();
        window.dispatchEvent(new CustomEvent("refreshItems"));
      } else {
        throw new Error("Failed to capture prices");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to capture prices",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchInventoryData();
  }, [priceSource, displayCurrency]);

  if (!stats) {
    return <div className="text-center py-4">Loading statistics...</div>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_items}</div>
          <p className="text-xs text-muted-foreground">Items being tracked</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Captures</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_captures}</div>
          <p className="text-xs text-muted-foreground">Price data points</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Money Invested</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${
              inventoryData && inventoryData.total_profit_loss >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {getClientCurrencySymbol(displayCurrency)}
            {inventoryData
              ? inventoryData.total_purchase_value.toFixed(2)
              : "0.00"}
          </div>
          <p className="text-xs text-muted-foreground">
            {inventoryData && inventoryData.total_profit_loss >= 0
              ? "Positive returns"
              : "Negative returns"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {getClientCurrencySymbol(displayCurrency)}
            {inventoryData
              ? inventoryData.total_current_value.toFixed(2)
              : "0.00"}
          </div>
          <p className="text-xs text-muted-foreground">Market value today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Capture</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.last_capture
              ? new Date(stats.last_capture).toLocaleDateString()
              : "Never"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.last_capture
              ? new Date(stats.last_capture).toLocaleTimeString()
              : "No captures yet"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Manual Capture</CardTitle>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Button
            onClick={captureAllPrices}
            disabled={isCapturing || stats.total_items === 0}
            className="w-full"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isCapturing ? "animate-spin" : ""}`}
            />
            {isCapturing ? "Capturing..." : "Capture All"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
