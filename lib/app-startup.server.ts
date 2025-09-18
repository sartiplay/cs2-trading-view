let initialized = false;

export async function initializeApp() {
  try {
    console.log("[v0] DEBUG: Starting app initialization...");

    if (initialized) {
      console.log("[v0] DEBUG: Already initialized, skipping");
      return;
    }

    console.log("[v0] DEBUG: About to start scheduler...");

    // Try to import scheduler dynamically to catch import errors
    console.log("[v0] DEBUG: Importing scheduler functions...");
    let startScheduler;
    try {
      const schedulerModule = await import("./scheduler.server");
      startScheduler = schedulerModule.startScheduler;
      console.log("[v0] DEBUG: Successfully imported startScheduler");
    } catch (importError) {
      console.error(
        "[v0] DEBUG: Failed to import scheduler.server:",
        importError
      );
      if (importError instanceof Error) {
        console.error(
          "[v0] DEBUG: Scheduler import error details:",
          importError.message
        );
        console.error(
          "[v0] DEBUG: Scheduler import error stack:",
          importError.stack
        );
      }
      throw importError;
    }

    try {
      await startScheduler();
      console.log("[v0] DEBUG: Scheduler started successfully");
    } catch (schedulerError) {
      console.error("[v0] DEBUG: Scheduler start failed:", schedulerError);
      if (schedulerError instanceof Error) {
        console.error(
          "[v0] DEBUG: Scheduler error details:",
          schedulerError.message
        );
        console.error(
          "[v0] DEBUG: Scheduler error stack:",
          schedulerError.stack
        );
      }
      throw schedulerError;
    }

    initialized = true;
    console.log("[v0] DEBUG: App initialization complete");
  } catch (error) {
    console.error("[v0] DEBUG: App initialization failed:", error);
    console.error(
      "[v0] DEBUG: Error details:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // More detailed error info
    if (error instanceof Error) {
      console.error("[v0] DEBUG: Error name:", error.name);
      console.error("[v0] DEBUG: Error stack:", error.stack);
    }

    throw error;
  }
}

export function isAppInitialized(): boolean {
  return initialized;
}
