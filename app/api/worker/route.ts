import { NextResponse } from "next/server";
import { getWorkerStatus, clearWorkerHistory } from "@/lib/worker-storage.server";

export async function GET() {
  try {
    const status = await getWorkerStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get worker status:", error);
    return NextResponse.json(
      { error: "Failed to get worker status" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await clearWorkerHistory();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear worker history:", error);
    return NextResponse.json(
      { error: "Failed to clear worker history" },
      { status: 500 }
    );
  }
}
