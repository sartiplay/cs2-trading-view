import { NextResponse } from "next/server";
import { migrateDataToUseIds } from "@/lib/migrate-data.server";

export async function POST() {
  try {
    await migrateDataToUseIds();
    return NextResponse.json({ 
      success: true, 
      message: "Data migration completed successfully" 
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ 
      error: "Migration failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
