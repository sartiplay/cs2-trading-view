let schedulerStarted = false;

export async function getSettings() {
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
  return {
    timelineResolution: "1d",
    cronDelayMinutes: 1440,
    fetchDelayMs: 2000,
    discordWebhookEnabled: false,
    discordWebhookUrl: "",
    discordDevelopmentMode: false,
    discordPriceSpikeEnabled: false,
    pinnedMarketSites: ["CS.MONEY", "SkinsMonkey", "CSFloat"],
    marketListingsFetchLimit: 5,
    schedulerEnabled: true,
    schedulerRunning: false,
    imageLoadingDelayMs: 3000, // 3 seconds delay between image requests
    categorySettings: {
      showCategoryFilter: true,
      defaultCategoryId: "default-trading",
      allowCustomCategories: true,
      maxCategories: 20,
    },
  };
}

export async function startScheduler() {
  try {
    console.log("[Scheduler] startScheduler() called - simplified version");

    if (schedulerStarted) {
      console.log("[Scheduler] Already started");
      return;
    }

    console.log("[Scheduler] Getting settings...");
    const settings = await getSettings();
    console.log("[Scheduler] Settings retrieved:", settings);

    if (!settings?.schedulerEnabled) {
      console.log(
        "[Scheduler] Scheduler is disabled in settings, not starting"
      );
      return;
    }

    console.log("[Scheduler] Would start cron job here, but skipping for now");
    schedulerStarted = true;

    console.log("[Scheduler] Scheduler marked as started (simplified mode)");
  } catch (error) {
    console.error("[Scheduler] Error in startScheduler:", error);
    if (error instanceof Error) {
      console.error("[Scheduler] Error details:", error.message);
      console.error("[Scheduler] Error stack:", error.stack);
    }
    throw error;
  }
}

export function stopScheduler() {
  try {
    console.log("[Scheduler] stopScheduler() called");
    schedulerStarted = false;
    console.log("[Scheduler] Stopped");
  } catch (error) {
    console.error("[Scheduler] Error in stopScheduler:", error);
    throw error;
  }
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

export async function getSchedulerStatusWithSettings() {
  try {
    console.log("[v0] Getting scheduler status...");

    const settings = await getSettings();

    const status = {
      running: schedulerStarted,
      enabled: settings?.schedulerEnabled || false,
      timezone: "Europe/Zurich",
      intervalMinutes: settings?.cronDelayMinutes || 1440,
      fetchDelayMs: settings?.fetchDelayMs || 2000,
      cronExpression:
        (settings?.cronDelayMinutes || 1440) === 1440
          ? "0 0 * * *"
          : `*/${settings?.cronDelayMinutes || 1440} * * * *`,
    };

    console.log("[v0] Status:", status);
    return status;
  } catch (error) {
    console.error("[v0] Error getting status:", error);
    return {
      running: false,
      enabled: true,
      timezone: "Europe/Zurich",
      intervalMinutes: 1440,
      fetchDelayMs: 2000,
      cronExpression: "0 0 * * *",
    };
  }
}


