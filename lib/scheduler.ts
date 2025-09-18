import * as cron from "node-cron";
import { getAllItems, addPriceEntry } from "./data-storage.server";
import { fetchMultiplePrices } from "./steam-api.server";

let schedulerStarted = false;
let currentTask: cron.ScheduledTask | null = null;

async function getSettings() {
  try {
    const response = await fetch(
      `${
        process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "http://localhost:3000"
      }/api/settings`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("[Scheduler] Error fetching settings:", error);
  }
  return null;
}

export async function startScheduler() {
  if (schedulerStarted) {
    console.log("[Scheduler] Already started");
    return;
  }

  const settings = await getSettings();
  if (!settings?.schedulerEnabled) {
    console.log("[Scheduler] Scheduler is disabled in settings, not starting");
    return;
  }

  console.log("[Scheduler] Starting with settings:", {
    enabled: settings.schedulerEnabled,
    cronDelayMinutes: settings.cronDelayMinutes,
    fetchDelayMs: settings.fetchDelayMs,
  });

  const cronExpression =
    settings.cronDelayMinutes === 1440
      ? "0 0 * * *"
      : `*/${settings.cronDelayMinutes} * * * *`;

  // Schedule price capture based on settings
  currentTask = cron.schedule(
    cronExpression,
    async () => {
      console.log("[Scheduler] Starting scheduled price capture...");

      const currentSettings = await getSettings();
      if (!currentSettings?.schedulerEnabled) {
        console.log(
          "[Scheduler] Scheduler disabled during execution, skipping capture"
        );
        return;
      }

      try {
        const items = await getAllItems();

        if (items.length === 0) {
          console.log("[Scheduler] No items to capture prices for");
          return;
        }

        console.log(`[Scheduler] Capturing prices for ${items.length} items`);

        const results = await fetchMultiplePrices(
          items.map((item) => ({
            market_hash_name: item.market_hash_name,
            appid: item.appid,
          })),
          currentSettings.fetchDelayMs || 2000 // Use delay from settings
        );

        // Save successful price captures
        let successCount = 0;
        for (const result of results) {
          if (result.price !== null) {
            await addPriceEntry(result.market_hash_name, result.price);
            successCount++;
          }
        }

        console.log(
          `[Scheduler] Scheduled capture completed: ${successCount}/${items.length} items captured successfully`
        );
      } catch (error) {
        console.error(
          "[Scheduler] Failed to complete scheduled price capture:",
          error
        );
      }
    },
    {
      timezone: "Europe/Zurich",
    }
  );

  currentTask.start();
  schedulerStarted = true;

  console.log(
    `[Scheduler] Price capture scheduled with expression: ${cronExpression}`
  );
}

export function stopScheduler() {
  if (!schedulerStarted || !currentTask) {
    console.log("[Scheduler] Not running");
    return;
  }

  currentTask.stop();
  currentTask = null;
  schedulerStarted = false;
  console.log("[Scheduler] Stopped");
}

export async function restartScheduler() {
  console.log("[Scheduler] Restarting with updated settings...");
  stopScheduler();
  await startScheduler();
}

export function getSchedulerStatus() {
  return {
    running: schedulerStarted,
    timezone: "Europe/Zurich",
    schedule: schedulerStarted ? "Active" : "Stopped",
  };
}
