"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Clock, Database, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaptureStats {
  last_capture: string | null;
  total_captures: number;
  total_items: number;
}

export function CaptureStats() {
  const [stats, setStats] = useState<CaptureStats | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

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
  }, []);

  if (!stats) {
    return <div className="text-center py-4">Loading statistics...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
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
