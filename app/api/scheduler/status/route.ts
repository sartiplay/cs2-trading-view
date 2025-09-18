import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("[v0] DEBUG: Status API called");

    // Import the function dynamically to catch import errors
    const { getSchedulerStatusWithSettings } = await import(
      "@/lib/scheduler.server"
    );
    console.log("[v0] DEBUG: Successfully imported scheduler functions");

    const status = await getSchedulerStatusWithSettings();
    console.log("[v0] DEBUG: Status API returning:", status);

    return NextResponse.json(status);
  } catch (error) {
    console.error("[v0] DEBUG: Status API error:", error);
    if (error instanceof Error) {
      console.error("[v0] DEBUG: Error details:", error.message);
      console.error("[v0] DEBUG: Error stack:", error.stack);
    }

    const fallbackNext = new Date();
    fallbackNext.setDate(fallbackNext.getDate() + 1);
    fallbackNext.setHours(0, 0, 0, 0);

    const fallbackResponse = {
      running: false,
      enabled: true,
      timezone: "Europe/Zurich",
      intervalMinutes: 1440,
      fetchDelayMs: 2000,
      cronExpression: "0 0 * * *",
      nextExecution: fallbackNext.toISOString(),
    };

    console.log("[v0] DEBUG: Status API returning fallback:", fallbackResponse);
    return NextResponse.json(fallbackResponse);
  }
}
