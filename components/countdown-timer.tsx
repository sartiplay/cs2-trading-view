"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  intervalMinutes: number;
  isRunning: boolean;
  nextExecution?: string;
  onTimeUp?: () => void; // Add callback for when time reaches zero
}

export function CountdownTimer({
  intervalMinutes,
  isRunning,
  nextExecution,
  onTimeUp,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");
  const [nextCaptureTime, setNextCaptureTime] = useState<Date | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft("Scheduler stopped");
      setNextCaptureTime(null);
      setIsCapturing(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();

      // Use server-provided next execution time if available
      let next: Date;
      if (nextExecution) {
        next = new Date(nextExecution);
      } else {
        // Fallback to old calculation logic if server time not available
        if (intervalMinutes === 1440) {
          next = new Date(now);
          next.setDate(now.getDate() + 1);
          next.setHours(0, 0, 0, 0);
        } else {
          const minutesPassed = now.getMinutes() % intervalMinutes;
          next = new Date(now);
          next.setMinutes(now.getMinutes() + (intervalMinutes - minutesPassed));
          next.setSeconds(0);
          next.setMilliseconds(0);
        }
      }

      setNextCaptureTime(next);

      const diff = next.getTime() - now.getTime();

      if (diff <= 0) {
        if (!isCapturing) {
          setIsCapturing(true);
          setTimeLeft("Capturing now...");
          onTimeUp?.();

          setTimeout(() => {
            setIsCapturing(false);
            onTimeUp?.();
          }, 10000);
        }
        return;
      }

      if (isCapturing) {
        setIsCapturing(false);
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes, isRunning, nextExecution, onTimeUp, isCapturing]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div>
        <div className="text-muted-foreground">Next capture in:</div>
        <div className="font-mono font-medium">{timeLeft}</div>
        {nextCaptureTime && (
          <div className="text-xs text-muted-foreground">
            at {nextCaptureTime.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
