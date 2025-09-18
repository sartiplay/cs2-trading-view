import { startScheduler } from "./scheduler";

let initialized = false;

export async function initializeApp() {
  if (initialized) {
    return;
  }

  console.log("[App] Initializing CS2 Price Tracker...");

  await startScheduler();

  initialized = true;
  console.log("[App] Initialization complete");
}
