"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Square, Clock, Timer } from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { useScheduler } from "@/contexts/scheduler-context";

interface SchedulerStatus {
  running: boolean;
  timezone: string;
  intervalMinutes: number;
  fetchDelayMs: number;
  cronExpression: string;
  nextExecution?: string;
}
// TODO: Cant stop scheduler if a job is currently running
export function SchedulerStatus() {
  const {
    schedulerStatus,
    refreshStatus,
    isInitialized,
    startScheduler,
    stopScheduler,
  } = useScheduler();
  const [loading, setLoading] = useState(false);

  const toggleScheduler = async () => {
    try {
      setLoading(true);

      if (schedulerStatus?.running) {
        await stopScheduler();
      } else {
        await startScheduler();
      }
    } catch (error) {
      console.error("Failed to toggle scheduler:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      // Refresh status every 30 seconds
      const interval = setInterval(refreshStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, refreshStatus]);

  if (!isInitialized || !schedulerStatus) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Auto Scheduler</CardTitle>
          <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Initializing...</div>
          <p className="text-xs text-muted-foreground">
            Loading scheduler status
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">Auto Scheduler</CardTitle>
        <Timer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-4">
        {/* Status Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold">
                {schedulerStatus.running ? "Active" : "Inactive"}
              </div>
              <Badge
                variant={schedulerStatus.running ? "default" : "secondary"}
                className="text-xs"
              >
                {schedulerStatus.running ? "Running" : "Stopped"}
              </Badge>
            </div>
            <Button
              onClick={refreshStatus}
              disabled={loading}
              size="sm"
              variant="ghost"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* Next Execution */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Next Execution</span>
            </div>
            <div className="text-sm font-medium">
              {schedulerStatus.nextExecution
                ? new Date(schedulerStatus.nextExecution).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not scheduled"}
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Time Remaining</div>
            {schedulerStatus && (
              <CountdownTimer
                intervalMinutes={schedulerStatus.intervalMinutes}
                isRunning={schedulerStatus.running}
                nextExecution={schedulerStatus.nextExecution}
                onTimeUp={refreshStatus}
              />
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Control Button */}
          <Button
            onClick={toggleScheduler}
            disabled={loading}
            size="sm"
            variant={schedulerStatus.running ? "destructive" : "default"}
            className="w-full"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : schedulerStatus.running ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Scheduler
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Scheduler
              </>
            )}
          </Button>

          {/* Configuration Info */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Every {schedulerStatus.intervalMinutes || 1440}min •{" "}
            {schedulerStatus.fetchDelayMs}ms delay
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
