"use client";

import { useScheduler } from "@/contexts/scheduler-context";
import { AccordionTrigger } from "@/components/ui/accordion";
import { Play, Pause, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function SchedulerAccordionTrigger() {
  const { schedulerStatus, refreshStatus } = useScheduler();
  const [countdown, setCountdown] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!schedulerStatus?.nextExecution) {
      setCountdown("");
      setIsCapturing(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const nextExecution = new Date(schedulerStatus.nextExecution!);
      const diff = nextExecution.getTime() - now.getTime();

      if (diff <= 0) {
        if (!isCapturing) {
          setIsCapturing(true);
          setCountdown("Capturing Now...");

          const refreshInterval = setInterval(refreshStatus, 5000);

          const resetTimeout = setTimeout(() => {
            setIsCapturing(false);
            setCountdown("");
            clearInterval(refreshInterval);
            refreshStatus();
          }, 120000); // 2 minutes

          setTimeout(() => {
            clearInterval(refreshInterval);
            clearTimeout(resetTimeout);
            refreshStatus();
          }, 30000); // Check after 30 seconds
        }
        return;
      }

      if (isCapturing && diff > 0) {
        setIsCapturing(false);
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (minutes > 0) {
        setCountdown(`${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [schedulerStatus?.nextExecution, isCapturing, refreshStatus]);

  const StatusIcon = isCapturing
    ? Loader2
    : schedulerStatus?.running
    ? Play
    : Pause;
  const iconColor = isCapturing
    ? "text-blue-500"
    : schedulerStatus?.running
    ? "text-green-500"
    : "text-gray-400";
  const iconClass = isCapturing ? "animate-spin" : "";

  return (
    <AccordionTrigger className="text-lg font-semibold">
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${iconColor} ${iconClass}`} />
        <span>Price Capture Scheduler</span>
        {countdown && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{countdown}</span>
          </div>
        )}
      </div>
    </AccordionTrigger>
  );
}
