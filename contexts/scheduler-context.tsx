"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface SchedulerContextType {
  isInitialized: boolean;
  schedulerStatus: {
    running: boolean;
    enabled: boolean;
    timezone: string;
    intervalMinutes: number;
    fetchDelayMs: number;
    cronExpression: string;
    nextExecution?: string;
  } | null;
  initializeScheduler: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  startScheduler: () => Promise<void>;
  stopScheduler: () => Promise<void>;
}

const SchedulerContext = createContext<SchedulerContextType | undefined>(
  undefined
);

export function useScheduler() {
  const context = useContext(SchedulerContext);
  if (context === undefined) {
    throw new Error("useScheduler must be used within a SchedulerProvider");
  }
  return context;
}

interface SchedulerProviderProps {
  children: ReactNode;
}

export function SchedulerProvider({ children }: SchedulerProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [schedulerStatus, setSchedulerStatus] =
    useState<SchedulerContextType["schedulerStatus"]>(null);

  const initializeScheduler = async () => {
    if (isInitialized) {
      console.log("[v0] Scheduler already initialized, skipping...");
      return;
    }

    try {
      console.log("[v0] Initializing scheduler from context...");

      await refreshStatus();

      const response = await fetch("/api/init");
      console.log("[v0] Init API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[v0] Init API failed with status:", response.status);
        console.error("[v0] Error response:", errorText);
        throw new Error(`Init API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("[v0] Init API result:", result);

      setIsInitialized(true);
      console.log("[v0] Scheduler initialized successfully");
      await refreshStatus();
    } catch (error) {
      console.error("[v0] Error initializing scheduler:", error);
      console.error("[v0] Scheduler initialization failed, but continuing...");
    }
  };

  const refreshStatus = async () => {
    try {
      console.log("[v0] Refreshing scheduler status...");
      const response = await fetch("/api/scheduler/status");

      if (!response.ok) {
        console.error("[v0] Status API failed with status:", response.status);
        return;
      }

      const status = await response.json();
      console.log("[v0] Scheduler status:", status);
      setSchedulerStatus(status);
    } catch (error) {
      console.error("[v0] Error fetching scheduler status:", error);
    }
  };

  const startScheduler = async () => {
    try {
      console.log("[v0] Starting scheduler from context...");
      const response = await fetch("/api/scheduler/start", { method: "POST" });

      if (!response.ok) {
        console.error(
          "[v0] Start scheduler API failed with status:",
          response.status
        );
        await refreshStatus();

        throw new Error(`Failed to start scheduler: ${response.status}`);
      }

      console.log("[v0] Scheduler started successfully");

      console.log("[v0] Waiting 2 seconds before refreshing status...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await refreshStatus();
    } catch (error) {
      console.error("[v0] Error starting scheduler:", error);
      throw error;
    }
  };

  const stopScheduler = async () => {
    try {
      console.log("[v0] Stopping scheduler from context...");
      const response = await fetch("/api/scheduler/stop", { method: "POST" });

      if (!response.ok) {
        console.error(
          "[v0] Stop scheduler API failed with status:",
          response.status
        );
        await refreshStatus();

        throw new Error(`Failed to stop scheduler: ${response.status}`);
      }

      console.log("[v0] Scheduler stopped successfully");
      console.log("[v0] Waiting 2 seconds before refreshing status...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      await refreshStatus();
    } catch (error) {
      console.error("[v0] Error stopping scheduler:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("[v0] SchedulerProvider mounted, starting initialization...");
    initializeScheduler();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (schedulerStatus?.running) {
        refreshStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [schedulerStatus?.running]);

  return (
    <SchedulerContext.Provider
      value={{
        isInitialized,
        schedulerStatus,
        initializeScheduler,
        refreshStatus,
        startScheduler,
        stopScheduler,
      }}
    >
      {children}
    </SchedulerContext.Provider>
  );
}
