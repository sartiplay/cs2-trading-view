import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler.server";

export async function GET() {
  try {
    const status = await getSchedulerStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get scheduler status:", error);
    return NextResponse.json(
      { error: "Failed to get scheduler status" },
      { status: 500 }
    );
  }
}
