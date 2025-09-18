import { NextResponse } from "next/server";
import { startScheduler } from "@/lib/scheduler.server";

export async function POST() {
  try {
    console.log("[v0] Start API called");

    const settingsResponse = await fetch(
      `${
        process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "http://localhost:3000"
      }/api/settings`
    );

    if (!settingsResponse.ok) {
      console.error("[v0] Failed to fetch settings:", settingsResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch current settings" },
        { status: 500 }
      );
    }

    const settings = await settingsResponse.json();
    console.log("[v0] Current settings:", settings);

    if (!settings.schedulerEnabled) {
      console.log("[v0] Scheduler is disabled in settings");
      return NextResponse.json(
        { error: "Scheduler is disabled in settings" },
        { status: 400 }
      );
    }

    console.log("[v0] Starting scheduler...");
    await startScheduler();

    const updateResponse = await fetch(
      `${
        process.env.VERCEL_URL
          ? "https://" + process.env.VERCEL_URL
          : "http://localhost:3000"
      }/api/settings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings, // Include all existing settings
          schedulerRunning: true, // Only update the running status
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error("[v0] Failed to update settings:", updateResponse.status);
      const errorText = await updateResponse.text();
      console.error("[v0] Settings update error details:", errorText);
      return NextResponse.json(
        { error: "Failed to update scheduler status" },
        { status: 500 }
      );
    }

    console.log("[v0] Start API success");
    return NextResponse.json({ success: true, message: "Scheduler started" });
  } catch (error) {
    console.error("[v0] Start API error:", error);
    return NextResponse.json(
      {
        error: "Failed to start scheduler",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
