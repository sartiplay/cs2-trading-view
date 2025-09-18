"use client";

import { useScheduler } from "@/contexts/scheduler-context";
import { AccordionTrigger } from "@/components/ui/accordion";
import { Play, Pause, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export function SchedulerAccordionTrigger() {
  const { schedulerStatus } = useScheduler();
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!schedulerStatus?.nextExecution) {
      setCountdown("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const nextExecution = new Date(schedulerStatus.nextExecution!);
      const diff = nextExecution.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("Running...");
        return;
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
  }, [schedulerStatus?.nextExecution]);

  const StatusIcon = schedulerStatus?.running ? Play : Pause;
  const iconColor = schedulerStatus?.running
    ? "text-green-500"
    : "text-gray-400";

  return (
    <AccordionTrigger className="text-lg font-semibold">
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${iconColor}`} />
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
