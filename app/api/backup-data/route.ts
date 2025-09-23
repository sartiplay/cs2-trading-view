import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data.json");
const BACKUP_FILE = path.join(process.cwd(), "backup.data.json");

export async function POST() {
  try {
    console.log("[Backup] Starting data backup...");

    // Check if data.json exists
    try {
      await fs.access(DATA_FILE);
    } catch (error) {
      return NextResponse.json(
        { error: "data.json file not found" },
        { status: 404 }
      );
    }

    // Read the current data.json file
    const dataContent = await fs.readFile(DATA_FILE, "utf-8");
    
    // Write to backup.data.json (this will replace any existing backup)
    await fs.writeFile(BACKUP_FILE, dataContent, "utf-8");

    console.log("[Backup] Data backup completed successfully");

    return NextResponse.json({
      success: true,
      message: "Data backup created successfully",
      backupFile: "backup.data.json",
    });
  } catch (error) {
    console.error("[Backup] Failed to create backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
