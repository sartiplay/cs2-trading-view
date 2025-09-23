import { NextResponse } from "next/server";
import { migrateExternalDataToUseIds } from "@/lib/external-data-storage.server";

export async function POST() {
  try {
    console.log("[API] Starting external data migration to use unique IDs...");
    await migrateExternalDataToUseIds();
    return NextResponse.json({
      success: true,
      message: "External data migration completed successfully",
    });
  } catch (error) {
    console.error("[API] Failed to run external data migration:", error);
    return NextResponse.json(
      { error: "Failed to run external data migration" },
      { status: 500 }
    );
  }
}
