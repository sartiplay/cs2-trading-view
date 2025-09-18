let schedulerStarted = false;
let cronTimer: NodeJS.Timeout | null = null;
let nextExecutionTime: Date | null = null;
let isExecuting = false;

async function getSettings() {
  try {
    console.log("[v0] DEBUG: Getting settings...");
    const response = await fetch(
      `${
        process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "http://localhost:3000"
      }/api/settings`
    );
    if (response.ok) {
      const settings = await response.json();
      console.log("[v0] DEBUG: Settings fetched successfully:", settings);
      return settings;
    } else {
      console.log(
        "[v0] DEBUG: Settings fetch failed with status:",
        response.status
      );
    }
  } catch (error) {
    console.error("[v0] DEBUG: Error fetching settings:", error);
  }
  const fallback = {
    schedulerEnabled: true,
    cronDelayMinutes: 5,
    fetchDelayMs: 2000,
  };
  console.log("[v0] DEBUG: Using fallback settings:", fallback);
  return fallback;
}

function calculateNextExecution(intervalMinutes: number): Date {
  try {
    console.log(
      "[v0] DEBUG: Calculating next execution for interval:",
      intervalMinutes
    );
    const now = new Date();

    // For daily execution (1440 minutes)
    if (intervalMinutes === 1440) {
      const next = new Date(now);
      next.setHours(0, 0, 0, 0);
      if (next <= now) {
        next.setDate(now.getDate() + 1);
      }
      console.log("[v0] DEBUG: Daily execution next time:", next.toISOString());
      return next;
    }

    // For interval-based execution
    const next = new Date(now);
    const minutesPassed = now.getMinutes() % intervalMinutes;
    const minutesToAdd = intervalMinutes - minutesPassed;
    next.setMinutes(now.getMinutes() + minutesToAdd);
    next.setSeconds(0);
    next.setMilliseconds(0);
    console.log(
      "[v0] DEBUG: Interval execution next time:",
      next.toISOString()
    );
    return next;
  } catch (error) {
    console.error("[v0] DEBUG: Error calculating next execution:", error);
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + 1, 0, 0, 0);
    return fallback;
  }
}

async function executePriceCaptureJob() {
  if (isExecuting) {
    console.log("[v0] CRON JOB already executing, skipping...");
    return;
  }

  isExecuting = true;

  try {
    console.log("[v0] CRON JOB EXECUTING at:", new Date().toISOString());

    // Call the capture API endpoint
    const response = await fetch(
      `${
        process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "http://localhost:3000"
      }/api/jobs/capture`,
      { method: "POST" }
    );

    if (response.ok) {
      const result = await response.text();
      console.log("[v0] CRON JOB COMPLETED successfully:", result);
    } else {
      console.error("[v0] CRON JOB FAILED with status:", response.status);
    }

    // Schedule next execution
    const settings = await getSettings();
    const intervalMinutes = settings?.cronDelayMinutes || 5;
    nextExecutionTime = calculateNextExecution(intervalMinutes);
    console.log(
      "[v0] NEXT EXECUTION updated to:",
      nextExecutionTime.toISOString()
    );

    if (schedulerStarted && !cronTimer) {
      scheduleNextJob(intervalMinutes);
    }
  } catch (error) {
    console.error("[v0] CRON JOB ERROR:", error);
  } finally {
    isExecuting = false;
  }
}

function scheduleNextJob(intervalMinutes: number) {
  if (cronTimer) {
    clearTimeout(cronTimer);
    cronTimer = null;
  }

  if (!schedulerStarted) {
    console.log("[v0] DEBUG: Scheduler stopped, not scheduling next job");
    return;
  }

  const now = new Date();
  const next = calculateNextExecution(intervalMinutes);
  const delay = next.getTime() - now.getTime();

  console.log("[v0] DEBUG: Scheduling next job in", delay, "ms");

  cronTimer = setTimeout(() => {
    if (schedulerStarted) {
      executePriceCaptureJob();
    }
  }, delay);
}

export async function startScheduler() {
  try {
    console.log("[v0] DEBUG: startScheduler() called");

    if (schedulerStarted) {
      console.log("[v0] DEBUG: Already started");
      return;
    }

    console.log("[v0] DEBUG: Getting settings...");
    const settings = await getSettings();

    if (!settings?.schedulerEnabled) {
      console.log(
        "[v0] DEBUG: Scheduler is disabled in settings, not starting"
      );
      return;
    }

    const intervalMinutes = settings?.cronDelayMinutes || 5;

    console.log(
      "[v0] DEBUG: Starting custom scheduler with interval:",
      intervalMinutes,
      "minutes"
    );

    nextExecutionTime = calculateNextExecution(intervalMinutes);
    console.log(
      "[v0] DEBUG: Next execution scheduled for:",
      nextExecutionTime.toISOString()
    );

    schedulerStarted = true;
    scheduleNextJob(intervalMinutes);

    console.log("[v0] SCHEDULER STARTED successfully");
  } catch (error) {
    console.error("[v0] DEBUG: Error in startScheduler:", error);
    if (error instanceof Error) {
      console.error("[v0] DEBUG: Error details:", error.message);
      console.error("[v0] DEBUG: Error stack:", error.stack);
    }
    throw error;
  }
}

export function stopScheduler() {
  try {
    console.log("[v0] DEBUG: stopScheduler() called");

    schedulerStarted = false;

    if (cronTimer) {
      console.log("[v0] DEBUG: Clearing scheduled timer");
      clearTimeout(cronTimer);
      cronTimer = null;
    }

    isExecuting = false;
    nextExecutionTime = null;
    console.log("[v0] DEBUG: Scheduler stopped");
  } catch (error) {
    console.error("[v0] DEBUG: Error in stopScheduler:", error);
    throw error;
  }
}

export async function restartScheduler() {
  console.log("[v0] DEBUG: Restarting with updated settings...");
  stopScheduler();
  await startScheduler();
}

export function getSchedulerStatus() {
  console.log("[v0] DEBUG: getSchedulerStatus() called");
  return {
    running: schedulerStarted,
    timezone: "Europe/Zurich",
    schedule: schedulerStarted ? "Active" : "Stopped",
  };
}

export async function getSchedulerStatusWithSettings() {
  try {
    console.log("[v0] DEBUG: getSchedulerStatusWithSettings() called");

    const settings = await getSettings();
    const intervalMinutes = settings?.cronDelayMinutes || 5;
    const cronExpression =
      intervalMinutes === 1440 ? "0 0 * * *" : `*/${intervalMinutes} * * * *`;

    let nextExecution = nextExecutionTime;
    if (!nextExecution) {
      console.log("[v0] DEBUG: No stored next execution, calculating...");
      nextExecution = calculateNextExecution(intervalMinutes);
    }

    const status = {
      running: schedulerStarted,
      enabled: settings?.schedulerEnabled !== false,
      timezone: settings?.timezone || "Europe/Zurich",
      intervalMinutes: intervalMinutes,
      fetchDelayMs: settings?.fetchDelayMs || 2000,
      cronExpression,
      nextExecution: nextExecution.toISOString(),
    };

    console.log("[v0] DEBUG: Status calculated:", status);
    return status;
  } catch (error) {
    console.error(
      "[v0] DEBUG: Error in getSchedulerStatusWithSettings:",
      error
    );
    if (error instanceof Error) {
      console.error("[v0] DEBUG: Error details:", error.message);
      console.error("[v0] DEBUG: Error stack:", error.stack);
    }

    const fallbackNext = new Date();
    fallbackNext.setMinutes(fallbackNext.getMinutes() + 5);

    const fallbackStatus = {
      running: false,
      enabled: true,
      timezone: "Europe/Zurich",
      intervalMinutes: 5,
      fetchDelayMs: 2000,
      cronExpression: "*/5 * * * *",
      nextExecution: fallbackNext.toISOString(),
    };

    console.log("[v0] DEBUG: Returning fallback status:", fallbackStatus);
    return fallbackStatus;
  }
}
