"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Square } from "lucide-react";
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Auto Scheduler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Initializing scheduler...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Auto Scheduler</span>
          <Badge variant={schedulerStatus.running ? "default" : "secondary"}>
            {schedulerStatus.running ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Automatic price capture every{" "}
          {schedulerStatus.intervalMinutes || 1440} minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedulerStatus && (
          <CountdownTimer
            intervalMinutes={schedulerStatus.intervalMinutes}
            isRunning={schedulerStatus.running}
            nextExecution={schedulerStatus.nextExecution}
            onTimeUp={refreshStatus}
          />
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium">
              {schedulerStatus?.running ? "Running" : "Stopped"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Interval</div>
            <div className="font-medium">
              {schedulerStatus?.intervalMinutes
                ? `${schedulerStatus.intervalMinutes} min`
                : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Request Delay</div>
            <div className="font-medium">
              {schedulerStatus?.fetchDelayMs
                ? `${schedulerStatus.fetchDelayMs}ms`
                : "N/A"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Timezone</div>
            <div className="font-medium">
              {schedulerStatus?.timezone || "N/A"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Next Execution</div>
            <div className="font-medium">
              {schedulerStatus?.nextExecution || "N/A"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={toggleScheduler}
            disabled={loading}
            size="sm"
            variant={schedulerStatus.running ? "destructive" : "default"}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : schedulerStatus.running ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
          <Button
            onClick={refreshStatus}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
